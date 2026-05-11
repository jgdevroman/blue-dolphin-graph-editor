import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AppNode } from "../../types/graph";
import { NodeRow } from ".";

const NODE: AppNode = { id: "test-id", name: "Test Node", type: "Node" };

describe("NodeRow — click handler", () => {
  it("calls onSelect with the node id and setSelectedFromList with true when clicked", async () => {
    const onSelect = jest.fn();
    const setSelectedFromList = jest.fn();

    render(
      <NodeRow
        node={NODE}
        isSelected={false}
        onSelect={onSelect}
        setSelectedFromList={setSelectedFromList}
      />,
    );

    await userEvent.click(screen.getByRole("button"));

    expect(onSelect).toHaveBeenCalledWith("test-id");
    expect(setSelectedFromList).toHaveBeenCalledWith(true);
  });

  it("renders the node name and type", () => {
    render(
      <NodeRow
        node={NODE}
        isSelected={false}
        onSelect={jest.fn()}
        setSelectedFromList={jest.fn()}
      />,
    );

    expect(screen.getByText("Test Node")).toBeInTheDocument();
    expect(screen.getByText("Node")).toBeInTheDocument();
  });
});
