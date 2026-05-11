import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Stub out GoJS/canvas heavy component so GraphEditor tests focus on UI logic.
jest.mock("../diagram-canvas", () => ({
  DiagramCanvas: ({
    onInitialLayoutCompleted,
  }: {
    onInitialLayoutCompleted: () => void;
  }) => {
    onInitialLayoutCompleted();
    return <div className="diagram-canvas" />;
  },
}));

import { GraphEditor } from ".";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ──────────────────────────────────────────────────────
// Mobile open / close flow
// ──────────────────────────────────────────────────────

describe("GraphEditor — mobile drawer open/close", () => {
  it("Open panel button calls handleOpen, setting drawerExited to false so the button is removed", async () => {
    act(() => {
      render(<GraphEditor />);
    });

    const openButton = screen.getByRole("button", { name: /open panel/i });
    expect(openButton).toBeInTheDocument();

    const user = userEvent.setup({
      delay: null,
      advanceTimers: jest.advanceTimersByTime,
    });

    await act(async () => {
      await user.click(openButton);
    });

    // drawerExited is now false: the conditional {drawerExited && <IconButton>} renders nothing.
    expect(
      screen.queryByRole("button", { name: /open panel/i }),
    ).not.toBeInTheDocument();
  });

  it("Close panel button sets open to false", async () => {
    act(() => {
      render(<GraphEditor />);
    });

    const user = userEvent.setup({
      delay: null,
      advanceTimers: jest.advanceTimersByTime,
    });

    // Open the drawer first.
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /open panel/i }));
    });

    // The permanent side panel (desktop) always shows its close button too;
    // take the first one to close the mobile drawer.
    const closeButtons = screen.getAllByRole("button", {
      name: /close panel/i,
    });
    await act(async () => {
      await user.click(closeButtons[0]);
    });

    // open is now false; after MUI slide exit, onExited fires (timer-driven).
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // The open-panel button reappears once drawerExited is true again.
    expect(
      screen.getByRole("button", { name: /open panel/i }),
    ).toBeInTheDocument();
  });
});
