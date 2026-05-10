import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import type { AppNode } from "../types/graph";

type Props = {
  nodes: AppNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export const NodeList = ({ nodes, selectedId, onSelect }: Props) => (
  <List dense disablePadding>
    {nodes.map((node) => (
      <ListItem key={node.id} disablePadding>
        <ListItemButton
          selected={node.id === selectedId}
          onClick={() => onSelect(node.id)}
        >
          <ListItemText primary={node.name} secondary={node.type} />
        </ListItemButton>
      </ListItem>
    ))}
  </List>
);
