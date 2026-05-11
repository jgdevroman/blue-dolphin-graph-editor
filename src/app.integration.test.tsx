import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as go from "gojs";
import { App } from "./App";

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

// ──────────────────────────────────────────────────────
// Shared App Instance
// ──────────────────────────────────────────────────────

function renderAppWithDiagram() {
  const result = render(<App />);
  const diagram = getDiagramFromContainer(result.container);
  return { ...result, diagram };
}

function evaluateWidthQuery(query: string, width: number): boolean {
  const minMatch = query.match(/\(min-width:\s*(\d+(?:\.\d+)?)px\)/);
  const maxMatch = query.match(/\(max-width:\s*(\d+(?:\.\d+)?)px\)/);

  if (minMatch && width < Number(minMatch[1])) {
    return false;
  }
  if (maxMatch && width > Number(maxMatch[1])) {
    return false;
  }
  return true;
}

function setMockScreenWidth(width: number) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => {
    return {
      matches: evaluateWidthQuery(query, width),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  });
}

// ──────────────────────────────────────────────────────
// Integration Tests
// ──────────────────────────────────────────────────────

describe("DiagramCanvas — Integration Tests (Shared App Instance)", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    setMockScreenWidth(1280);
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  // ──────────────────────────────────────────────────────
  // Mobile drawer open/close behavior
  // ──────────────────────────────────────────────────────

  describe("mobile drawer open/close", () => {
    it("opens from the trigger button and closes from the panel close button", async () => {
      setMockScreenWidth(375);
      const user = userEvent.setup();

      renderAppWithDiagram();

      const openButton = await screen.findByLabelText("Open panel");
      expect(openButton).toBeVisible();

      await user.click(openButton);

      const closeButton = await screen.findByLabelText("Close panel");
      expect(closeButton).toBeVisible();
      expect(screen.queryByLabelText("Open panel")).not.toBeInTheDocument();

      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.getByLabelText("Open panel")).toBeVisible();
      });
    });
  });

  // ──────────────────────────────────────────────────────
  // Canvas selection → NodeList highlight
  // ──────────────────────────────────────────────────────

  describe("canvas selection → NodeList highlight", () => {
    it("selecting a node on the canvas highlights its row in the NodeList", async () => {
      const { diagram } = renderAppWithDiagram();

      // Wait for diagram to load initial data
      await waitFor(() => {
        expect(diagram.nodes.count).toBeGreaterThan(0);
      });

      const iter = diagram.nodes;
      iter.next();
      const node = iter.value as go.Node;
      const nodeId = String(node.key);

      act(() => {
        diagram.select(node);
      });

      // NodeRow sets data-node-id on ListItem; MUI ListItemButton adds Mui-selected when selected={true}.
      const listItem = document.querySelector(`[data-node-id="${nodeId}"]`);
      const button = listItem?.querySelector(".MuiListItemButton-root");
      expect(button).toHaveClass("Mui-selected");
    });
  });

  // ──────────────────────────────────────────────────────
  // Add node → NodeList sync
  // ──────────────────────────────────────────────────────

  describe("add node → NodeList sync", () => {
    it("adding a node on the canvas appends its row to the NodeList", async () => {
      const { diagram } = renderAppWithDiagram();

      // Wait for diagram to load initial data
      await waitFor(() => {
        expect(diagram.nodes.count).toBeGreaterThan(0);
      });

      act(() => {
        const tool = diagram.toolManager.clickCreatingTool;
        tool.doActivate();
        tool.insertPart(new go.Point(5000, 5000));
        tool.doStop();
      });

      // archetypeNodeData gives new nodes the name "New Node".
      // Two SidePanels are rendered (mobile + desktop drawers), so getAllByText finds both instances.
      expect(screen.getAllByText("New Node").length).toBeGreaterThanOrEqual(1);
    });
  });

  // ──────────────────────────────────────────────────────
  // Name patch sync via UI
  // ──────────────────────────────────────────────────────

  describe("name patch sync via UI", () => {
    it("editing a node name in the properties panel updates the diagram", async () => {
      const { diagram } = renderAppWithDiagram();

      // Wait for diagram to load initial data
      await waitFor(() => {
        expect(diagram.nodes.count).toBeGreaterThan(0);
      });

      const iter = diagram.nodes;
      iter.next();
      const node = iter.value as go.Node;
      const nodeId = String(node.key);
      const originalName = String(node.data.name);

      // Select the node on the canvas
      act(() => {
        diagram.select(node);
      });

      // Wait for the name input to appear (use getByRole to target the specific input in PropertiesPanel)
      const nameInput = await waitFor(
        () => {
          const inputs = screen.getAllByDisplayValue(originalName);
          // Filter for the input in the properties panel (the one not in the node list)
          const propsInput = inputs.find((input) => {
            const drawer = input.closest(
              ".MuiDrawer-paper",
            ) as HTMLElement | null;
            return drawer && drawer.style.visibility !== "hidden";
          }) as HTMLInputElement;
          if (!propsInput) {
            throw new Error("Properties panel name input not found");
          }
          return propsInput;
        },
        { timeout: 3000 },
      );

      const newName = "Updated Name";

      // Use userEvent to simulate typing in the name field
      const user = userEvent.setup();
      await user.clear(nameInput);
      await user.type(nameInput, newName);

      // Wait for the diagram to update
      await waitFor(() => {
        const updatedNode = diagram.findNodeForKey(nodeId);
        expect(updatedNode?.data.name).toBe(newName);
      });
    });
  });
});
