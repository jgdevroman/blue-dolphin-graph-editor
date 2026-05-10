import List from "@mui/material/List";
import { useEffect, useRef, useState } from "react";
import type { AppNode } from "../types/graph";
import { NodeRow } from "./NodeRow";

type Props = {
  nodes: AppNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export const NodeList = ({ nodes, selectedId, onSelect }: Props) => {
  const listRef = useRef<HTMLUListElement>(null);
  const [selectedFromList, setSelectedFromList] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedFromList is intentionally omitted: including it would cause the effect to fire twice on list-driven selection (once to skip, once after the state resets to false)
  useEffect(() => {
    if (selectedId === null || listRef.current === null || selectedFromList) {
      setSelectedFromList(false);
      return;
    }
    const item = listRef.current.querySelector(`[data-node-id="${selectedId}"]`);
    item?.scrollIntoView({ block: "center" });
  }, [selectedId]);

  return (
    <List ref={listRef} dense disablePadding>
      {nodes.map((node) => (
        <NodeRow
          key={node.id}
          node={node}
          setSelectedFromList={setSelectedFromList}
          isSelected={node.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </List>
  );
};
