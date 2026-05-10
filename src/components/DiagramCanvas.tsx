import * as go from "gojs";
import type { ReactDiagram } from "gojs-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppLink, AppNode } from "../types/graph";
import type { NamePatch } from "../types/graph-editor";
import { isAppLink, isAppNode } from "../types/graph-guards";
import { DiagramWrapper } from "./DiagramWrapper";

type Props = {
  nodes: Map<string, AppNode>;
  links: Map<string, AppLink>;
  selectedId: string | null;
  namePatch: NamePatch | null;
  onSelectionChange: (id: string | null) => void;
  setNodes: React.Dispatch<React.SetStateAction<Map<string, AppNode>>>;
  setLinks: React.Dispatch<React.SetStateAction<Map<string, AppLink>>>;
};

export const DiagramCanvas = ({
  nodes,
  links,
  selectedId,
  namePatch,
  onSelectionChange,
  setNodes,
  setLinks,
}: Props) => {
  const diagramRef = useRef<ReactDiagram | null>(null);
  const [skipsDiagramUpdate, setSkipsDiagramUpdate] = useState(false);

  /**
   * Handles ChangedSelection events from GoJS, pushing the selected node id into React state.
   */
  const handleChangedSelection = (e: go.DiagramEvent) => {
    setSkipsDiagramUpdate(true);
    const firstSelected = e.subject.first();
    onSelectionChange(
      firstSelected instanceof go.Node ? String(firstSelected.key) : null,
    );
  };

  /**
   * Handles GoJS model changes for node/link insertions created by built-in GoJS tools
   * (ClickCreatingTool for nodes, LinkingTool for links). Syncs new data into React state
   * and sets skipsDiagramUpdate so ReactDiagram does not push the data back into GoJS.
   */
  const handleModelChange = (obj: go.IncrementalData, _: go.ChangedEvent) => {
    const modifiedNodeMap = new Map<string, AppNode>();
    obj.modifiedNodeData?.forEach((nodeData) => {
      if (isAppNode(nodeData)) {
        modifiedNodeMap.set(String(nodeData.id), nodeData);
      }
    });

    obj.insertedNodeKeys?.forEach((key) => {
      const nodeData = modifiedNodeMap.get(String(key));
      if (nodeData) {
        setNodes((prev) => {
          if (prev.has(nodeData.id)) {
            return prev;
          }
          const next = new Map(prev);
          next.set(nodeData.id, nodeData);
          return next;
        });
      }
    });

    const modifiedLinkMap = new Map<string, AppLink>();
    obj.modifiedLinkData?.forEach((linkData) => {
      if (isAppLink(linkData)) {
        modifiedLinkMap.set(String(linkData.id), linkData);
      }
    });

    obj.insertedLinkKeys?.forEach((key) => {
      const linkData = modifiedLinkMap.get(String(key));
      if (linkData) {
        setLinks((prev) => {
          if (prev.has(linkData.id)) {
            return prev;
          }
          const next = new Map(prev);
          next.set(linkData.id, linkData);
          return next;
        });
      }
    });

    setSkipsDiagramUpdate(true);
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

  const nodeDataArray = useMemo(() => [...nodes.values()], [nodes]);
  const linkDataArray = useMemo(() => [...links.values()], [links]);

  return (
    <DiagramWrapper
      diagramRef={diagramRef}
      nodeDataArray={nodeDataArray}
      linkDataArray={linkDataArray}
      skipsDiagramUpdate={skipsDiagramUpdate}
      onChangedSelection={handleChangedSelection}
      onModelChange={handleModelChange}
    />
  );
};
