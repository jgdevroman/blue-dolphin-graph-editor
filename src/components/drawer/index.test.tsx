import * as Material from "@mui/material";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { Drawer } from ".";

jest.mock("@mui/material", () => {
  const actual = jest.requireActual("@mui/material");
  return {
    ...actual,
    useMediaQuery: jest.fn(),
  };
});

type MockMuiDrawerProps = {
  variant: "persistent" | "permanent";
  open?: boolean;
  children?: ReactNode;
};

jest.mock("@mui/material/Drawer", () => ({
  __esModule: true,
  default: ({ variant, open, children }: MockMuiDrawerProps) => (
    <div
      data-testid="mui-drawer"
      data-variant={variant}
      data-open={String(Boolean(open))}
    >
      {children}
    </div>
  ),
}));

describe("Drawer", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders only the persistent drawer on mobile", () => {
    (Material.useMediaQuery as jest.Mock).mockReturnValue(true);

    render(
      <Drawer open={false} onExited={jest.fn()}>
        <div>Panel content</div>
      </Drawer>,
    );

    const drawers = screen.getAllByTestId("mui-drawer");
    expect(drawers).toHaveLength(1);
    expect(drawers[0]).toHaveAttribute("data-variant", "persistent");
    expect(drawers[0]).toHaveAttribute("data-open", "false");
    expect(screen.getByText("Panel content")).toBeInTheDocument();
  });

  it("renders only the permanent drawer on desktop", () => {
    (Material.useMediaQuery as jest.Mock).mockReturnValue(false);

    render(
      <Drawer open={false} onExited={jest.fn()}>
        <div>Panel content</div>
      </Drawer>,
    );

    const drawers = screen.getAllByTestId("mui-drawer");
    expect(drawers).toHaveLength(1);
    expect(drawers[0]).toHaveAttribute("data-variant", "permanent");
    expect(drawers[0]).toHaveAttribute("data-open", "true");
    expect(screen.getByText("Panel content")).toBeInTheDocument();
  });
});
