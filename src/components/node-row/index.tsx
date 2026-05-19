import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { memo } from "react";
import type { AppNode } from "../../types/graph";

export type NodeRowProps = {
  node: AppNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  setSelectedFromList: React.Dispatch<React.SetStateAction<boolean>>;
  ariaRowIndex: number;
};

export const NodeRow = memo(
  ({ node, isSelected, onSelect, setSelectedFromList, ariaRowIndex }: NodeRowProps) => (
    <ListItem
      disablePadding
      data-node-id={node.id}
      aria-rowindex={ariaRowIndex}
    >
      <ListItemButton
        selected={isSelected}
        onClick={() => {
          onSelect(node.id);
          setSelectedFromList(true);
        }}
      >
        <ListItemText primary={node.name} secondary={node.type} />
      </ListItemButton>
    </ListItem>
  ),
);
NodeRow.displayName = "NodeRow";
