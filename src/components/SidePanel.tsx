import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useCallback } from "react";
import type { AppLink, AppNode } from "../types/graph";
import { NodeList } from "./NodeList";
import { PropertiesPanel } from "./PropertiesPanel";

type Props = {
  nodes: AppNode[];
  links: AppLink[];
  selectedId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  setNodes: React.Dispatch<React.SetStateAction<AppNode[]>>;
  setNamePatch: React.Dispatch<
    React.SetStateAction<{ id: string; name: string } | null>
  >;
};

export const SidePanel = ({
  nodes,
  selectedId,
  onClose,
  onSelect,
  setNodes,
  setNamePatch,
}: Props) => {
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null;

  const handleNameChange = useCallback(
    (id: string, name: string) => {
      setNodes((prev) =>
        prev.map((node) => (node.id === id ? { ...node, name } : node)),
      );
      setNamePatch({ id, name });
    },
    [setNodes, setNamePatch],
  );

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderLeft: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          flex: "1 1 auto",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", p: 1 }}>
          <Typography
            variant="overline"
            sx={{
              flexGrow: 1,
              px: 2,
              pt: 2,
              pb: 1,
              padding: "8px 8px",
            }}
          >
            Nodes
          </Typography>
          <IconButton
            onClick={onClose}
            aria-label="Close panel"
            sx={{ display: { md: "none" } }}
          >
            ✕
          </IconButton>
        </Box>
        <Divider />
        <NodeList nodes={nodes} selectedId={selectedId} onSelect={onSelect} />
      </Box>

      <Box sx={{ flex: "0 0 auto", borderTop: 1, borderColor: "divider" }}>
        <Typography variant="overline" sx={{ px: 2, pt: 2, pb: 1 }}>
          Properties
        </Typography>
        <Divider />
        <PropertiesPanel node={selectedNode} onNameChange={handleNameChange} />
      </Box>
    </Box>
  );
};
