import * as go from "gojs";
import type { ReactDiagram } from "gojs-react";
import type React from "react";
import { startTransition, useEffect, useRef, useState } from "react";
import type { AppLink, AppNode } from "../../types/graph";
import type { NamePatch } from "../../types/graph-editor";
import { isAppLink, isAppNode } from "../../types/graph-guards";
import { DiagramWrapper } from "../diagram-wrapper";

type Props = {
  nodes: AppNode[];
  links: AppLink[];
  nodeIndexRef: React.RefObject<Map<string, number>>;
  linkIndexRef: React.RefObject<Map<string, number>>;
  selectedId: string | null;
  namePatch: NamePatch | null;
  onInitialLayoutCompleted: () => void;
  setSelectedId: (id: string | null) => void;
  setNodes: React.Dispatch<React.SetStateAction<AppNode[]>>;
  setLinks: React.Dispatch<React.SetStateAction<AppLink[]>>;
};

export const DiagramCanvas = ({
  nodes,
  links,
  nodeIndexRef,
  linkIndexRef,
  selectedId,
  namePatch,
  onInitialLayoutCompleted,
  setSelectedId,
  setNodes,
  setLinks,
}: Props) => {
  const diagramRef = useRef<ReactDiagram | null>(null);
  const [skipsDiagramUpdate, setSkipsDiagramUpdate] = useState(false);
  // This ref is used to prevent loops between GoJS-driven selection changes and React-driven selectedId state.
  const suppressNextSelectionEventRef = useRef(false);

  /**
   * Handles ChangedSelection events from GoJS, pushing the selected node id into React 
   * state to update the side panel's selected node.
   */
  const handleChangedSelection = (e: go.DiagramEvent) => {
    // if the selection change originated from React pushing selectedId into GoJS, do not update React state again and cause a loop.
    if (suppressNextSelectionEventRef.current) {
      suppressNextSelectionEventRef.current = false;
      setSkipsDiagramUpdate(false);
      return;
    }

    setSkipsDiagramUpdate(true);
    suppressNextSelectionEventRef.current = true;
    const firstSelected = e.subject.first();
    // to make the selection feel snappier, give the selectedId update lower priority so that it does not block the canvas when the node is being dragged around.
    startTransition(() => {
      setSelectedId(
        firstSelected instanceof go.Node ? String(firstSelected.key) : null,
      );
    });
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
        if (nodeIndexRef.current.has(nodeData.id)) {
          return;
        }
        nodeIndexRef.current.set(nodeData.id, nodeIndexRef.current.size);
        setNodes((prev) => [...prev, nodeData]);
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
        if (linkIndexRef.current.has(linkData.id)) {
          return;
        }
        linkIndexRef.current.set(linkData.id, linkIndexRef.current.size);
        setLinks((prev) => [...prev, linkData]);
      }
    });

    setSkipsDiagramUpdate(true);
  };

  // Push selectedId from React into GoJS, skipping when GoJS drove the change.
  useEffect(() => {
    // if the change originated from GoJS, do not push it back in and cause a loop.
    if (suppressNextSelectionEventRef.current) {
      suppressNextSelectionEventRef.current = false;
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
        suppressNextSelectionEventRef.current = true;
        diagram.select(node);
        diagram.centerRect(node.actualBounds);
      }
    }
  }, [selectedId]);

  // Patch a single node name in GoJS coming from the side panel. 
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
      onChangedSelection={handleChangedSelection}
      onModelChange={handleModelChange}
      onInitialLayoutCompleted={onInitialLayoutCompleted}
    />
  );
};
