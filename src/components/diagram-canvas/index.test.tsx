import { act, render, waitFor } from "@testing-library/react";
import * as go from "gojs";
import type { AppLink, AppNode } from "../../types/graph";
import * as DiagramWrapperModule from "../diagram-wrapper";
import { DiagramCanvas } from ".";

type RenderCanvasOptions = {
  nodes?: AppNode[];
  links?: AppLink[];
  selectedId?: string | null;
  namePatch?: { id: string; name: string } | null;
};

const SMALL_NODES: AppNode[] = [
  { id: "n1", name: "Node 1", type: "Node" },
  { id: "n2", name: "Node 2", type: "Node" },
  { id: "n3", name: "Node 3", type: "Node" },
];

const SMALL_LINKS: AppLink[] = [{ id: "l1", from: "n1", to: "n2" }];

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────

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
  const nodes = options.nodes ?? SMALL_NODES;
  const links = options.links ?? SMALL_LINKS;

  const nodeIndexRef = {
    current: new Map(nodes.map((node, index) => [node.id, index])),
  };
  const linkIndexRef = {
    current: new Map(links.map((link, index) => [link.id, index])),
  };

  jest.useFakeTimers();
  const result = render(
    <DiagramCanvas
      nodes={nodes}
      links={links}
      nodeIndexRef={nodeIndexRef}
      linkIndexRef={linkIndexRef}
      selectedId={options.selectedId ?? null}
      namePatch={options.namePatch ?? null}
      onInitialLayoutCompleted={jest.fn()}
      setSelectedId={jest.fn()}
      setNodes={jest.fn()}
      setLinks={jest.fn()}
    />,
  );

  act(() => {
    jest.runAllTimers();
  });
  return {
    ...result,
    diagram: getDiagramFromContainer(result.container),
    nodeIndexRef,
    linkIndexRef,
  };
}

function addTestNode(diagram: go.Diagram, name: string): go.Node {
  const data: go.ObjectData = { name, type: "Node" };
  diagram.model.commit((m) => {
    (m as go.GraphLinksModel).addNodeData(data);
  });
  const node = diagram.findNodeForKey(data.id);
  if (!node) {
    throw new Error(`Test node '${name}' not found after insertion`);
  }
  return node;
}

function addTestLink(
  diagram: go.Diagram,
  fromNode: go.Node,
  toNode: go.Node,
): void {
  diagram.model.commit((m) => {
    (m as go.GraphLinksModel).addLinkData({
      from: fromNode.key,
      to: toNode.key,
    });
  });
}

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ──────────────────────────────────────────────────────
// Diagram structure
// ──────────────────────────────────────────────────────

describe("DiagramCanvas — structure", () => {
  it("renders all provided nodes on load", () => {
    const { diagram } = renderDiagramCanvas({ nodes: SMALL_NODES, links: [] });
    expect(diagram.nodes.count).toBe(SMALL_NODES.length);
  });
});

// ──────────────────────────────────────────────────────
// Add node
// ──────────────────────────────────────────────────────

describe("DiagramCanvas — add node", () => {
  it("ClickCreatingTool inserts a node into the diagram", () => {
    const { diagram } = renderDiagramCanvas();
    // jsdom provides no real canvas hit-testing so we drive the tool API directly,
    // exactly as a double-click on the background would invoke it.
    const initialCount = diagram.nodes.count;
    act(() => {
      const tool = diagram.toolManager.clickCreatingTool;
      tool.doActivate();
      tool.insertPart(new go.Point(5000, 5000));
      tool.doStop();
      jest.runOnlyPendingTimers();
    });
    expect(diagram.nodes.count).toBe(initialCount + 1);
  });
});

// ──────────────────────────────────────────────────────
// Add link — link validation
// ──────────────────────────────────────────────────────

describe("DiagramCanvas — link validation", () => {
  let nodeA: go.Node;
  let nodeB: go.Node;
  let diagram: go.Diagram;
  let validate: (
    fromNode: go.Node,
    fromPort: go.GraphObject,
    toNode: go.Node,
    toPort: go.GraphObject,
    link: go.Link | null,
  ) => boolean;

  beforeEach(() => {
    ({ diagram } = renderDiagramCanvas({ nodes: [], links: [] }));
    act(() => {
      nodeA = addTestNode(diagram, "ValidateA");
      nodeB = addTestNode(diagram, "ValidateB");
    });
    const raw = diagram.toolManager.linkingTool.linkValidation;
    if (!raw) {
      throw new Error("linkValidation not set on LinkingTool");
    }
    validate = raw;
  });

  it("self-loop is rejected", () => {
    const portA = nodeA.findPort("") as go.GraphObject;
    expect(validate(nodeA, portA, nodeA, portA, null)).toBe(false);
  });

  it("duplicate link is rejected", () => {
    act(() => {
      addTestLink(diagram, nodeA, nodeB);
    });
    const portA = nodeA.findPort("") as go.GraphObject;
    const portB = nodeB.findPort("") as go.GraphObject;
    expect(validate(nodeA, portA, nodeB, portB, null)).toBe(false);
  });

  it("valid link between distinct unconnected nodes is accepted", () => {
    const portA = nodeA.findPort("") as go.GraphObject;
    const portB = nodeB.findPort("") as go.GraphObject;
    expect(validate(nodeA, portA, nodeB, portB, null)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────
// Add link — model → React state sync
// ──────────────────────────────────────────────────────

describe("DiagramCanvas — add link sync", () => {
  it("adding a link via the model increments diagram.links.count", () => {
    const { diagram } = renderDiagramCanvas({ nodes: [], links: [] });
    let nodeA: go.Node;
    let nodeB: go.Node;
    act(() => {
      nodeA = addTestNode(diagram, "SyncA");
      nodeB = addTestNode(diagram, "SyncB");
    });
    const initialCount = diagram.links.count;
    act(() => {
      addTestLink(diagram, nodeA, nodeB);
      jest.runOnlyPendingTimers();
    });
    expect(diagram.links.count).toBe(initialCount + 1);
  });
});

// ──────────────────────────────────────────────────────
// Selection effect — node not found in diagram
// ──────────────────────────────────────────────────────

describe("DiagramCanvas — selection effect node not found", () => {
  it("does not crash when selectedId has no matching node in the diagram", () => {
    expect(() => {
      renderDiagramCanvas({
        nodes: [],
        links: [],
        selectedId: "non-existent-id",
      });
    }).not.toThrow();
  });
});

// ──────────────────────────────────────────────────────
// Sync guards
// ──────────────────────────────────────────────────────

describe("DiagramCanvas — sync guards", () => {
  let latestOnChangedSelection: ((e: go.DiagramEvent) => void) | null = null;
  let diagramForRef: {
    clearSelection: jest.Mock;
    findNodeForKey: jest.Mock;
    select: jest.Mock;
    centerRect: jest.Mock;
    model: { commit: jest.Mock };
  } | null = null;
  let diagramWrapperSpy: jest.SpyInstance;

  function renderCanvasWithMock(
    options: {
      selectedId?: string | null;
      namePatch?: { id: string; name: string } | null;
      setSelectedId?: jest.Mock;
    } = {},
  ) {
    const nodeIndexRef = { current: new Map([["n1", 0]]) };
    const linkIndexRef = { current: new Map<string, number>() };

    jest.useFakeTimers();
    const result = render(
      <DiagramCanvas
        nodes={[{ id: "n1", name: "Node 1", type: "Node" }]}
        links={[]}
        nodeIndexRef={nodeIndexRef}
        linkIndexRef={linkIndexRef}
        selectedId={options.selectedId ?? null}
        namePatch={options.namePatch ?? null}
        onInitialLayoutCompleted={jest.fn()}
        setSelectedId={options.setSelectedId ?? jest.fn()}
        setNodes={jest.fn()}
        setLinks={jest.fn()}
      />,
    );

    act(() => {
      jest.runAllTimers();
    });

    return result;
  }

  beforeEach(() => {
    latestOnChangedSelection = null;
    diagramForRef = null;

    diagramWrapperSpy = jest
      .spyOn(DiagramWrapperModule, "DiagramWrapper")
      .mockImplementation((props) => {
        latestOnChangedSelection = props.onChangedSelection;
        props.diagramRef.current = {
          getDiagram: () => diagramForRef,
        } as never;
        return <div data-testid="diagram-wrapper" />;
      });
  });

  afterEach(() => {
    diagramWrapperSpy.mockRestore();
  });

  it("selects and centers node from selectedId, then suppresses next ChangedSelection event", async () => {
    const setSelectedId = jest.fn();
    const selectedNode = {
      actualBounds: { x: 0, y: 0, width: 10, height: 10 },
    };

    diagramForRef = {
      clearSelection: jest.fn(),
      findNodeForKey: jest.fn().mockReturnValue(selectedNode),
      select: jest.fn(),
      centerRect: jest.fn(),
      model: { commit: jest.fn() },
    };

    renderCanvasWithMock({ selectedId: "n1", setSelectedId });

    await waitFor(() => {
      expect(diagramForRef?.findNodeForKey).toHaveBeenCalledWith("n1");
      expect(diagramForRef?.select).toHaveBeenCalledWith(selectedNode);
      expect(diagramForRef?.centerRect).toHaveBeenCalledWith(
        selectedNode.actualBounds,
      );
    });

    if (!latestOnChangedSelection) {
      throw new Error("ChangedSelection handler was not captured");
    }

    const changedSelectionHandler = latestOnChangedSelection;

    act(() => {
      changedSelectionHandler({
        subject: { first: () => new go.Node() },
      } as unknown as go.DiagramEvent);
    });

    expect(setSelectedId).not.toHaveBeenCalled();
  });

  it("returns early when selectedId/namePatch effects run without a diagram", () => {
    diagramForRef = null;

    expect(() => {
      renderCanvasWithMock({
        selectedId: "n1",
        namePatch: { id: "n1", name: "Updated" },
      });
    }).not.toThrow();
  });
});
