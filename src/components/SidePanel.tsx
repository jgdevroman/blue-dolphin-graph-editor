import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo } from "react";
import type { AppLink, AppNode } from "../types/graph";
import { LoadingOverlay } from "./LoadingOverlay";
import { NodeList } from "./NodeList";
import { PropertiesPanel } from "./PropertiesPanel";

type Props = {
  nodes: Map<string, AppNode>;
  links: Map<string, AppLink>;
  selectedId: string | null;
  isLoading: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  setNodes: React.Dispatch<React.SetStateAction<Map<string, AppNode>>>;
  setNamePatch: React.Dispatch<
    React.SetStateAction<{ id: string; name: string } | null>
  >;
};

export const SidePanel = ({
  nodes,
  selectedId,
  isLoading,
  onClose,
  onSelect,
  setNodes,
  setNamePatch,
}: Props) => {
  const selectedNode =
    selectedId !== null ? (nodes.get(selectedId) ?? null) : null;
  const nodeArray = useMemo(() => [...nodes.values()], [nodes]);

  const handleNameChange = useCallback(
    (id: string, name: string) => {
      setNodes((prev) => {
        const existing = prev.get(id);
        if (!existing) {
          return prev;
        }
        const next = new Map(prev);
        next.set(id, { ...existing, name });
        return next;
      });
      setNamePatch({ id, name });
    },
    [setNodes, setNamePatch],
  );

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
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
        <NodeList
          nodes={nodeArray}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </Box>

      {isLoading && <LoadingOverlay />}
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
