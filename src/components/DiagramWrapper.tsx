import * as go from "gojs";
import { ReactDiagram } from "gojs-react";
import { type RefObject, useEffect } from "react";
import type { AppLink, AppNode } from "../types/graph";

type Props = {
  diagramRef: RefObject<ReactDiagram | null>;
  nodeDataArray: AppNode[];
  linkDataArray: AppLink[];
  skipsDiagramUpdate: boolean;
  onDiagramEvent: (e: go.DiagramEvent) => void;
  onModelChange: () => void;
};

export const DiagramWrapper = ({
  diagramRef,
  nodeDataArray,
  linkDataArray,
  skipsDiagramUpdate,
  onDiagramEvent,
  onModelChange,
}: Props) => {
  // Add/remove listener on mount only.
  // biome-ignore lint/correctness/useExhaustiveDependencies: handler is stable (setSelectedId)
  useEffect(() => {
    const diagram = diagramRef.current?.getDiagram();
    if (diagram instanceof go.Diagram) {
      diagram.addDiagramListener("ChangedSelection", onDiagramEvent);
    }
    return () => {
      if (diagram instanceof go.Diagram) {
        diagram.removeDiagramListener("ChangedSelection", onDiagramEvent);
      }
    };
  }, []);

  const initDiagram = (): go.Diagram => {
    const diagram = new go.Diagram({
      "undoManager.isEnabled": true,
      initialContentAlignment: go.Spot.Center,
      model: new go.GraphLinksModel({ nodeKeyProperty: "id" }),
    });

    diagram.nodeTemplate = new go.Node("Auto").add(
      new go.Shape("RoundedRectangle", {
        fill: "white",
        stroke: "#888",
        fromLinkable: true,
        toLinkable: true,
        cursor: "pointer",
      }),
      new go.TextBlock({ margin: 8, editable: false }).bind("text", "name"),
    );

    diagram.linkTemplate = new go.Link().add(new go.Shape());

    return diagram;
  };

  return (
    <ReactDiagram
      ref={diagramRef}
      divClassName="diagram-canvas"
      initDiagram={initDiagram}
      nodeDataArray={nodeDataArray}
      linkDataArray={linkDataArray}
      onModelChange={onModelChange}
      skipsDiagramUpdate={skipsDiagramUpdate}
    />
  );
};
