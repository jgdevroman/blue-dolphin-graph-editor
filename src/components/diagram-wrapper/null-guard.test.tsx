// Isolated test for the `!(diagram instanceof go.Diagram)` guard in DiagramWrapper.
// gojs-react is mocked so diagramRef receives an object whose getDiagram() returns
// null, causing the early-return branch on line 28 to fire.
import { render } from "@testing-library/react";
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

function Wrapper() {
  // diagramRef.current remains null because the mocked ReactDiagram never sets it.
  const diagramRef = useRef<ReactDiagram | null>(null);
  return (
    <DiagramWrapper
      diagramRef={diagramRef}
      nodeDataArray={[]}
      linkDataArray={[]}
      skipsDiagramUpdate={false}
      onChangedSelection={jest.fn()}
      onModelChange={jest.fn()}
      onInitialLayoutCompleted={jest.fn()}
    />
  );
}

describe("DiagramWrapper — null diagram guard", () => {
  it("does not crash when diagramRef holds no Diagram instance", () => {
    expect(() => render(<Wrapper />)).not.toThrow();
  });
});
