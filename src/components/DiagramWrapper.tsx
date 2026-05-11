import * as go from "gojs";
import { ReactDiagram } from "gojs-react";
import { type RefObject, useEffect } from "react";
import type { AppLink, AppNode } from "../types/graph";

type Props = {
  diagramRef: RefObject<ReactDiagram | null>;
  nodeDataArray: AppNode[];
  linkDataArray: AppLink[];
  skipsDiagramUpdate: boolean;
  onChangedSelection: (e: go.DiagramEvent) => void;
  onModelChange: (idata: go.IncrementalData, e: go.ChangedEvent) => void;
  onInitialLayoutCompleted: () => void;
};

export const DiagramWrapper = ({
  diagramRef,
  nodeDataArray,
  linkDataArray,
  skipsDiagramUpdate,
  onChangedSelection,
  onModelChange,
  onInitialLayoutCompleted,
}: Props) => {
  const handleInitialLayoutCompleted = (_e: go.DiagramEvent) => {
    const diagram = diagramRef.current?.getDiagram();
    if (!(diagram instanceof go.Diagram)) {
      return;
    }
    // Prevent re-layout on subsequent model changes (node additions, name patches).
    diagram.layout.isOngoing = false;
    onInitialLayoutCompleted();
  };

  // Add/remove listeners on mount only.
  // biome-ignore lint/correctness/useExhaustiveDependencies: handlers are stable
  useEffect(() => {
    const diagram = diagramRef.current?.getDiagram();
    if (diagram instanceof go.Diagram) {
      diagram.addDiagramListener("ChangedSelection", onChangedSelection);
      diagram.addDiagramListener(
        "InitialLayoutCompleted",
        handleInitialLayoutCompleted,
      );
    }
    return () => {
      if (diagram instanceof go.Diagram) {
        diagram.removeDiagramListener("ChangedSelection", onChangedSelection);
        diagram.removeDiagramListener(
          "InitialLayoutCompleted",
          handleInitialLayoutCompleted,
        );
      }
    };
  }, []);

  const initDiagram = (): go.Diagram => {
    // clickCreatingTool activates on background double-click and stamps archetypeNodeData into the model.
    // makeUniqueKeyFunction / makeUniqueLinkKeyFunction assign UUID ids before the data enters the model,
    // which onModelChange then picks up to sync new nodes and links into React state.
    const diagram = new go.Diagram({
      "undoManager.isEnabled": true,
      initialContentAlignment: go.Spot.Center,
      initialAutoScale: go.AutoScale.Uniform,
      "clickCreatingTool.archetypeNodeData": { name: "New Node", type: "Node" },
      layout: new go.ForceDirectedLayout({
        arrangesToOrigin: true,
        maxIterations: 200,
        epsilonDistance: 1,
        infinityDistance: 1000,
        arrangementSpacing: new go.Size(150, 150),
        defaultElectricalCharge: 400,
        defaultGravitationalMass: 0,
        defaultSpringStiffness: 0.05,
        defaultSpringLength: 120,
        prelayoutQuality: 0.1,
        prelayoutSpread: 20,
      }),
      model: new go.GraphLinksModel({
        nodeKeyProperty: "id",
        linkKeyProperty: "id",
        makeUniqueKeyFunction: (_m: go.Model, data: go.ObjectData) => {
          const newId = crypto.randomUUID();
          data.id = newId;
          return newId;
        },
        makeUniqueLinkKeyFunction: (
          _m: go.GraphLinksModel,
          data: go.ObjectData,
        ) => {
          const newId = crypto.randomUUID();
          data.id = newId;
          return newId;
        },
      }),
    });

    // Keeps the graph undirected: rejects self-links and duplicate edges in either direction.
    diagram.toolManager.linkingTool.linkValidation = (
      fromNode,
      _fp,
      toNode,
    ) => {
      if (!fromNode || !toNode || fromNode === toNode) {
        return false;
      }
      return fromNode.findLinksBetween(toNode).count === 0;
    };

    // portId: "" designates the shape as the default port, which the LinkingTool requires to start/end links.
    diagram.nodeTemplate = new go.Node("Auto").add(
      new go.Shape("RoundedRectangle", {
        fill: "white",
        stroke: "#888",
        portId: "",
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
