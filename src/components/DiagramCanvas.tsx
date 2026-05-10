import * as go from "gojs";
import type { ReactDiagram } from "gojs-react";
import { useEffect, useRef, useState } from "react";
import type { AppLink, AppNode } from "../types/graph";
import type { NamePatch } from "../types/graph-editor";
import { DiagramWrapper } from "./DiagramWrapper";

type Props = {
  nodes: AppNode[];
  links: AppLink[];
  selectedId: string | null;
  namePatch: NamePatch | null;
  onSelectionChange: (id: string | null) => void;
};

export const DiagramCanvas = ({
  nodes,
  links,
  selectedId,
  namePatch,
  onSelectionChange,
}: Props) => {
  const diagramRef = useRef<ReactDiagram | null>(null);
  const [skipsDiagramUpdate, setSkipsDiagramUpdate] = useState(false);

  const handleDiagramEvent = (e: go.DiagramEvent) => {
    setSkipsDiagramUpdate(true);
    const firstSelected = e.subject.first();
    onSelectionChange(
      firstSelected instanceof go.Node ? String(firstSelected.key) : null,
    );
  };

  // Push selectedId from React into GoJS, skipping when GoJS drove the change.
  useEffect(() => {
    if (skipsDiagramUpdate) {
      setSkipsDiagramUpdate(false);
      return;
    }
    const diagram = diagramRef.current?.getDiagram();
    if (!diagram) {
      return;
    }
    if (selectedId === null) {
      diagram.clearSelection();
    } else {
      const node = diagram.findNodeForKey(selectedId);
      if (node) {
        diagram.select(node);
      }
    }
  }, [selectedId, skipsDiagramUpdate]);

  // Patch a single node name in GoJS without touching the rest of the model.
  useEffect(() => {
    if (!namePatch) {
      return;
    }
    const diagram = diagramRef.current?.getDiagram();
    if (!diagram) {
      return;
    }
    diagram.model.commit((model) => {
      const nodeData = model.findNodeDataForKey(namePatch.id);
      if (nodeData) {
        model.setDataProperty(nodeData, "name", namePatch.name);
      }
    }, "patch-name");
  }, [namePatch]);

  return (
    <DiagramWrapper
      diagramRef={diagramRef}
      nodeDataArray={nodes}
      linkDataArray={links}
      skipsDiagramUpdate={skipsDiagramUpdate}
      onDiagramEvent={handleDiagramEvent}
      onModelChange={() => {}}
    />
  );
};
