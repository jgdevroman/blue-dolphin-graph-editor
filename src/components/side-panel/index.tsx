import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useCallback } from "react";
import type { AppNode } from "../../types/graph";
import { NodeList } from "../node-list";
import { PropertiesPanel } from "../properties-panel";

type Props = {
  nodes: AppNode[];
  nodeIndexRef: React.RefObject<Map<string, number>>;
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
  nodeIndexRef,
  selectedId,
  onClose,
  onSelect,
  setNodes,
  setNamePatch,
}: Props) => {
  const selectedNode =
    selectedId !== null
      ? (nodes[nodeIndexRef.current.get(selectedId) ?? -1] ?? null)
      : null;

  const handleNameChange = useCallback(
    (id: string, name: string) => {
      setNodes((prev) => {
        const nodeIndex = nodeIndexRef.current.get(id);
        if (nodeIndex === undefined) {
          return prev;
        }
        const next = [...prev];
        next[nodeIndex] = { ...prev[nodeIndex], name };
        return next;
      });
      setNamePatch({ id, name });
    },
    [setNodes, setNamePatch, nodeIndexRef],
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
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            p: 1,
            position: "sticky",
            top: 0,
            zIndex: 1,
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
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
