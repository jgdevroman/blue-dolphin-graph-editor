import { render } from "@testing-library/react";
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

function Wrapper() {
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
    />
  );
}

describe("DiagramWrapper — ChangedSelection listener", () => {
  it("registers ChangedSelection listener when diagram is available", () => {
    const diagram = new go.Diagram();
    getDiagramRefValue = () => diagram;

    const addListenerSpy = jest.spyOn(diagram, "addDiagramListener");

    render(<Wrapper />);

    expect(addListenerSpy).toHaveBeenCalledWith(
      "ChangedSelection",
      expect.any(Function),
    );
  });

  it("does not crash when getDiagram returns null on mount", () => {
    getDiagramRefValue = () => null;

    expect(() => {
      render(<Wrapper />);
    }).not.toThrow();
  });
});
