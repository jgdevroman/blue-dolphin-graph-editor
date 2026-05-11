import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { AppNode } from "../../types/graph";

type Props = {
  node: AppNode | null;
  onNameChange: (id: string, name: string) => void;
};

export const PropertiesPanel = ({ node, onNameChange }: Props) => {
  if (!node) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Select a node to view properties
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        label="Name"
        size="small"
        value={node.name}
        onChange={(e) => onNameChange(node.id, e.target.value)}
        fullWidth
      />
      <Typography variant="body2" color="text.secondary">
        Type: {node.type}
      </Typography>
    </Box>
  );
};
