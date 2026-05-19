/**
 * GoJS Robot — demonstration tests
 *
 * These tests drive canvas interactions via src/test/Robot.ts, which constructs
 * GoJS InputEvents and calls ToolManager methods directly, bypassing the real
 * DOM event pipeline. jsdom + jest-canvas-mock is sufficient for tool-activation
 * tests; real drag hit-testing requires Playwright/Cypress (see todo below).
 */

import { act, render } from "@testing-library/react";
import * as go from "gojs";
import { Robot } from "../../test/Robot";
import type { AppLink, AppNode } from "../../types/graph";
import { DiagramCanvas } from ".";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RenderCanvasOptions = { nodes?: AppNode[]; links?: AppLink[] };

function getDiagramFromContainer(container: HTMLElement): go.Diagram {
  const div = container.getElementsByClassName("diagram-canvas")[0];
  const found = go.Diagram.fromDiv(div as HTMLElement);
  if (!found) {
    throw new Error("GoJS diagram not initialized on .diagram-canvas div");
  }
  found.commit((d) => {
    d.animationManager.isEnabled = false;
    d.animationManager.stopAnimation();
    d.viewSize = new go.Size(800, 600);
  });
  return found;
}

function renderDiagramCanvas(options: RenderCanvasOptions = {}) {
  const nodes = options.nodes ?? [];
  const links = options.links ?? [];
  const nodeIndexRef = { current: new Map(nodes.map((n, i) => [n.id, i])) };
  const linkIndexRef = { current: new Map(links.map((l, i) => [l.id, i])) };
  jest.useFakeTimers();
  const result = render(
    <DiagramCanvas
      nodes={nodes}
      links={links}
      nodeIndexRef={nodeIndexRef}
      linkIndexRef={linkIndexRef}
      selectedId={null}
      namePatch={null}
      setSelectedId={jest.fn()}
      setNodes={jest.fn()}
      setLinks={jest.fn()}
    />,
  );
  act(() => {
    jest.runAllTimers();
  });
  return { ...result, diagram: getDiagramFromContainer(result.container) };
}

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Double-click background → node created
// ---------------------------------------------------------------------------

describe("DiagramCanvas — Robot: double-click creates node", () => {
  it("double-clicking empty canvas background inserts a new node", () => {
    const { diagram } = renderDiagramCanvas();
    const robot = new Robot(diagram);
    const initialCount = diagram.nodes.count;

    // Coordinates are document-space (same as go.Node.location).
    // Use a point far from any existing nodes so ClickCreatingTool activates
    // (it only fires on background, not on an existing node).
    act(() => {
      robot.dblClick(5000, 5000);
      jest.runOnlyPendingTimers();
    });

    expect(diagram.nodes.count).toBe(initialCount + 1);
  });
});

// ---------------------------------------------------------------------------
// Drag port → port creates a link (illustrative — requires real browser)
// ---------------------------------------------------------------------------

describe("DiagramCanvas — Robot: drag between ports creates link", () => {
  it("dragging from node A port to node B port creates a link", () => {
    const nodes: AppNode[] = [
      { id: "ra", name: "RobotA", type: "Node" },
      { id: "rb", name: "RobotB", type: "Node" },
    ];
    const { diagram } = renderDiagramCanvas({ nodes, links: [] });
    const robot = new Robot(diagram);

    // Pin positions so coordinates are predictable regardless of ForceDirected layout.
    let nodeA!: go.Node;
    let nodeB!: go.Node;
    act(() => {
      diagram.commit((d) => {
        const na = d.findNodeForKey("ra");
        const nb = d.findNodeForKey("rb");
        if (!na || !nb) {
          throw new Error("test nodes not found in diagram");
        }
        na.location = new go.Point(100, 100);
        nb.location = new go.Point(400, 100);
        nodeA = na;
        nodeB = nb;
      });
    });

    const portA = nodeA.findPort("") as go.GraphObject;
    const portB = nodeB.findPort("") as go.GraphObject;
    const linkingTool = diagram.toolManager.linkingTool;
    const initialLinkCount = diagram.links.count;

    // jsdom has no canvas hit-testing, so two workarounds are still required
    // even with the official Robot:
    //   1. doActivate calls findFromPort (uses findPartAt) → always null in jsdom.
    //      Bypass: seed tool state and set isActive directly.
    //   2. doMouseUp calls findTargetPort (uses findPartAt) → always null in jsdom.
    //      Bypass: override findTargetPort on the instance to return portB.
    linkingTool.archetypeLinkData = {};
    linkingTool.originalFromNode = nodeA;
    linkingTool.originalFromPort = portA;
    linkingTool.isActive = true;
    diagram.currentTool = linkingTool;
    linkingTool.findTargetPort = () => portB;

    act(() => {
      robot.mouseMove(400, 100);
      robot.mouseUp(400, 100);
      jest.runOnlyPendingTimers();
    });

    expect(diagram.links.count).toBe(initialLinkCount + 1);
  });
});
