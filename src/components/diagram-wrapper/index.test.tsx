import { render, waitFor } from "@testing-library/react";
import * as go from "gojs";
import type { ReactDiagram } from "gojs-react";
import { useRef } from "react";

jest.mock("gojs-react", () => ({
  ReactDiagram: ({
    divClassName,
    ref: _ref,
  }: {
    divClassName: string;
    ref: unknown;
  }) => <div className={divClassName} />,
}));

import { DiagramWrapper } from ".";

let getDiagramRefValue: () => go.Diagram | null;

function Wrapper({
  onInitialLayoutCompleted,
}: {
  onInitialLayoutCompleted: jest.Mock;
}) {
  const diagramRef = useRef<ReactDiagram | null>({
    getDiagram: () => getDiagramRefValue(),
  } as ReactDiagram);
  return (
    <DiagramWrapper
      diagramRef={diagramRef}
      nodeDataArray={[]}
      linkDataArray={[]}
      skipsDiagramUpdate={false}
      onChangedSelection={jest.fn()}
      onModelChange={jest.fn()}
      onInitialLayoutCompleted={onInitialLayoutCompleted}
    />
  );
}

describe("DiagramWrapper — null diagram guard", () => {
  it("returns early when InitialLayoutCompleted fires and getDiagram no longer returns a Diagram", async () => {
    const onInitialLayoutCompleted = jest.fn();
    const diagram = new go.Diagram();
    getDiagramRefValue = () => diagram;

    const addListenerSpy = jest.spyOn(diagram, "addDiagramListener");

    render(<Wrapper onInitialLayoutCompleted={onInitialLayoutCompleted} />);

    await waitFor(() => {
      expect(addListenerSpy).toHaveBeenCalledWith(
        "InitialLayoutCompleted",
        expect.any(Function),
      );
    });

    const initialLayoutCall = addListenerSpy.mock.calls.find(
      ([eventName]) => eventName === "InitialLayoutCompleted",
    );
    if (!initialLayoutCall) {
      throw new Error("InitialLayoutCompleted listener was not registered");
    }

    const handler = initialLayoutCall[1] as (e: go.DiagramEvent) => void;

    // Simulate ref becoming unavailable by the time the listener executes.
    getDiagramRefValue = () => null;

    expect(() => {
      handler({} as go.DiagramEvent);
    }).not.toThrow();
    expect(onInitialLayoutCompleted).not.toHaveBeenCalled();
  });
});
