import * as go from "gojs";
import { useEffect, useRef } from "react";
import type { AppLink, AppNode } from "../types/graph";
import type { NamePatch } from "../types/graph-editor";

type Props = {
  nodes: AppNode[];
  links: AppLink[];
  selectedId: string | null;
  namePatch: NamePatch | null;
  onSelectionChange: (id: string | null) => void;
};

export const DiagramWrapper = ({
  nodes,
  links,
  selectedId,
  namePatch,
  onSelectionChange,
}: Props) => {
  const divRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<go.Diagram | null>(null);
  const isUpdatingFromDiagram = useRef(false);
  const initialNodesRef = useRef(nodes);
  const initialLinksRef = useRef(links);

  // Initialize the GoJS diagram once on mount and wire up event listeners.
  useEffect(() => {
    if (!divRef.current) {
      return;
    }

    const diagram = new go.Diagram(divRef.current, {
      "undoManager.isEnabled": true,
      initialContentAlignment: go.Spot.Center,
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

    diagram.model = new go.GraphLinksModel({
      nodeKeyProperty: "id",
      nodeDataArray: [],
      linkDataArray: [],
    });

    diagram.addDiagramListener("ChangedSelection", () => {
      if (isUpdatingFromDiagram.current) {
        return;
      }
      isUpdatingFromDiagram.current = true;
      const firstSelected = diagram.selection.first();
      onSelectionChange(
        firstSelected instanceof go.Node ? String(firstSelected.key) : null,
      );
      isUpdatingFromDiagram.current = false;
    });

    // Load initial data once
    diagram.model.commit((model) => {
      const graphModel = model as go.GraphLinksModel;
      graphModel.nodeDataArray = initialNodesRef.current.map((node) => ({
        ...node,
      }));
      graphModel.linkDataArray = initialLinksRef.current.map((link) => ({
        ...link,
      }));
    }, "initial-load");

    diagramRef.current = diagram;

    return () => {
      diagram.div = null;
    };
  }, [onSelectionChange]);

  // Patch a single node name in GoJS without touching the rest of the model.
  useEffect(() => {
    if (!namePatch) return;
    const diagram = diagramRef.current;
    if (!diagram) return;
    diagram.model.commit((model) => {
      const nodeData = model.findNodeDataForKey(namePatch.id);
      if (nodeData) model.setDataProperty(nodeData, "name", namePatch.name);
    }, "patch-name");
  }, [namePatch]);

  // Push selectedId from React into GoJS selection, skipping if GoJS triggered the change.
  useEffect(() => {
    const diagram = diagramRef.current;
    if (!diagram || isUpdatingFromDiagram.current) {
      return;
    }

    if (selectedId === null) {
      diagram.clearSelection();
    } else {
      const node = diagram.findNodeForKey(selectedId);
      if (node) diagram.select(node);
    }
  }, [selectedId]);

  return <div ref={divRef} style={{ width: "100%", height: "100%" }} />;
};
