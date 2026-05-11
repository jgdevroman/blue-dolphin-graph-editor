import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as go from "gojs";
import { App } from "../../App";

let diagram: go.Diagram;

// ──────────────────────────────────────────────────────
// Suite-level setup / teardown
// ──────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  const { container } = render(<App />);
  act(() => {
    jest.advanceTimersByTime(500);
  });
  const div = container.getElementsByClassName("diagram-canvas")[0];
  const found = go.Diagram.fromDiv(div as HTMLElement);
  if (!found) {
    throw new Error("GoJS diagram not initialized on .diagram-canvas div");
  }
  diagram = found;
  diagram.commit((d) => {
    d.animationManager.isEnabled = false;
    d.animationManager.stopAnimation();
    d.viewSize = new go.Size(800, 600);
  });
});

afterEach(() => {
  jest.useRealTimers();
});

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────

function addTestNode(name: string): go.Node {
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

function addTestLink(fromNode: go.Node, toNode: go.Node): void {
  diagram.model.commit((m) => {
    (m as go.GraphLinksModel).addLinkData({
      from: fromNode.key,
      to: toNode.key,
    });
  });
}

// ──────────────────────────────────────────────────────
// Diagram structure
// ──────────────────────────────────────────────────────

describe("DiagramCanvas — structure", () => {
  it("renders 1000 nodes on load", () => {
    expect(diagram.nodes.count).toBe(1000);
  });
});

// ──────────────────────────────────────────────────────
// Add node
// ──────────────────────────────────────────────────────

describe("DiagramCanvas — add node", () => {
  it("ClickCreatingTool inserts a node into the diagram", () => {
    // jsdom provides no real canvas hit-testing so we drive the tool API directly,
    // exactly as a double-click on the background would invoke it.
    const initialCount = diagram.nodes.count;
    act(() => {
      const tool = diagram.toolManager.clickCreatingTool;
      tool.doActivate();
      tool.insertPart(new go.Point(5000, 5000));
      tool.doStop();
      jest.advanceTimersByTime(100);
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
  let validate: (
    fromNode: go.Node,
    fromPort: go.GraphObject,
    toNode: go.Node,
    toPort: go.GraphObject,
    link: go.Link | null,
  ) => boolean;

  beforeEach(() => {
    act(() => {
      nodeA = addTestNode("ValidateA");
      nodeB = addTestNode("ValidateB");
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
      addTestLink(nodeA, nodeB);
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
    let nodeA: go.Node;
    let nodeB: go.Node;
    act(() => {
      nodeA = addTestNode("SyncA");
      nodeB = addTestNode("SyncB");
    });
    const initialCount = diagram.links.count;
    act(() => {
      addTestLink(nodeA, nodeB);
      jest.advanceTimersByTime(100);
    });
    expect(diagram.links.count).toBe(initialCount + 1);
  });
});

// ──────────────────────────────────────────────────────
// Name patch sync
// ──────────────────────────────────────────────────────

describe("DiagramCanvas — name patch sync", () => {
  it("name change in SidePanel updates GoJS node label", async () => {
    const iter = diagram.nodes;
    iter.next();
    const node = iter.value as go.Node;
    const nodeId = String(node.key);

    // Select the node via GoJS; ChangedSelection fires setSelectedId in React.
    act(() => {
      diagram.select(node);
      jest.advanceTimersByTime(100);
    });

    // Slide renders SidePanel in two Drawers; take the first Name TextField.
    const inputs = screen.getAllByLabelText("Name") as HTMLInputElement[];
    const input = inputs[0];

    const user = userEvent.setup({
      delay: null,
      advanceTimers: jest.advanceTimersByTime,
    });

    await act(async () => {
      await user.clear(input);
      await user.type(input, "Updated Name");
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(diagram.findNodeForKey(nodeId)?.data.name).toBe("Updated Name");
  });
});
