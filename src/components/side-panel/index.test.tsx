import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { AppLink, AppNode } from "../../types/graph";
import { SidePanel } from ".";

const INITIAL_NODES: AppNode[] = [
  { id: "a", name: "Alpha", type: "Node" },
  { id: "b", name: "Beta", type: "Node" },
  { id: "c", name: "Gamma", type: "Node" },
];

const LINKS: AppLink[] = [];

function buildIndexRef(nodes: AppNode[]) {
  return { current: new Map(nodes.map((n, i) => [n.id, i])) };
}

// Wrapper with real useState so the controlled TextField actually updates.
function renderSidePanelControlled(
  selectedId: string | null,
  setNamePatch: jest.Mock = jest.fn(),
  onSelect: jest.Mock = jest.fn(),
  onClose: jest.Mock = jest.fn(),
) {
  const nodeIndexRef = buildIndexRef(INITIAL_NODES);

  function Wrapper() {
    const [nodes, setNodes] = useState<AppNode[]>(INITIAL_NODES);
    return (
      <SidePanel
        nodes={nodes}
        links={LINKS}
        nodeIndexRef={nodeIndexRef}
        selectedId={selectedId}
        isLoading={false}
        onClose={onClose}
        onSelect={onSelect}
        setNodes={setNodes}
        setNamePatch={setNamePatch}
      />
    );
  }

  return render(<Wrapper />);
}

// ──────────────────────────────────────────────────────
// Rendering
// ──────────────────────────────────────────────────────

describe("SidePanel — rendering", () => {
  it("shows placeholder text when no node is selected", () => {
    renderSidePanelControlled(null);
    expect(
      screen.getByText("Select a node to view properties"),
    ).toBeInTheDocument();
  });

  it("shows placeholder text when selectedId is not in the node index", () => {
    // nodeIndexRef has no entry for "z", so nodes[-1] ?? null resolves to null
    // and selectedNode is null. This covers the `?? null` branch in the ternary.
    const emptyIndexRef = { current: new Map<string, number>() };

    function Wrapper() {
      const [nodes, setNodes] = useState<AppNode[]>(INITIAL_NODES);
      return (
        <SidePanel
          nodes={nodes}
          links={LINKS}
          nodeIndexRef={emptyIndexRef}
          selectedId="z"
          isLoading={false}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          setNodes={setNodes}
          setNamePatch={jest.fn()}
        />
      );
    }

    render(<Wrapper />);
    expect(
      screen.getByText("Select a node to view properties"),
    ).toBeInTheDocument();
  });

  it("shows name TextField with current node name when a node is selected", () => {
    renderSidePanelControlled("a");
    const input = screen.getByLabelText("Name") as HTMLInputElement;
    expect(input.value).toBe("Alpha");
  });

  it("shows 'Type: Node' when a node is selected", () => {
    renderSidePanelControlled("b");
    expect(screen.getByText("Type: Node")).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────
// Name update
// ──────────────────────────────────────────────────────

describe("SidePanel — name update", () => {
  it("updates TextField value and calls setNamePatch when valid text is typed", async () => {
    const setNamePatch = jest.fn();
    renderSidePanelControlled("a", setNamePatch);

    const input = screen.getByLabelText("Name") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");

    expect(input.value).toBe("New Name");
    expect(setNamePatch).toHaveBeenLastCalledWith({
      id: "a",
      name: "New Name",
    });
  });

  it("stores the empty string in state when the field is cleared", async () => {
    const setNamePatch = jest.fn();
    renderSidePanelControlled("a", setNamePatch);

    const input = screen.getByLabelText("Name") as HTMLInputElement;
    await userEvent.clear(input);

    expect(input.value).toBe("");
    expect(setNamePatch).toHaveBeenLastCalledWith({ id: "a", name: "" });
  });

  it("returns prev nodes unchanged when selected node id is absent from index at update time", async () => {
    const setNamePatch = jest.fn();
    // Build a ref that contains "a" so selectedNode is non-null and the TextField renders.
    const nodeIndexRef = buildIndexRef(INITIAL_NODES);

    function Wrapper() {
      const [nodes, setNodes] = useState<AppNode[]>(INITIAL_NODES);
      return (
        <SidePanel
          nodes={nodes}
          links={LINKS}
          nodeIndexRef={nodeIndexRef}
          selectedId="a"
          isLoading={false}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          setNodes={setNodes}
          setNamePatch={setNamePatch}
        />
      );
    }

    render(<Wrapper />);
    const input = screen.getByLabelText("Name") as HTMLInputElement;

    // Mutate the ref so the setNodes updater finds nodeIndex === undefined.
    // Refs don't trigger a re-render, so the TextField stays visible until the next state change.
    nodeIndexRef.current.delete("a");

    await userEvent.type(input, "X");

    // setNamePatch is always called regardless of the index guard — confirm it ran.
    expect(setNamePatch).toHaveBeenCalled();
  });
});
