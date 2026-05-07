import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";
import { useCallback, useState } from "react";
import { SEED_LINKS, SEED_NODES } from "../data/seedGraph";
import type { NamePatch } from "../types/graph-editor";
import { DiagramCanvas } from "./DiagramCanvas";
import { SidePanel } from "./SidePanel";
import { Slide } from "./Slide";

const PANEL_WIDTH = 320;

const Main = styled("main")<{ open?: boolean }>(({ theme, open }) => ({
  flexGrow: 1,
  overflow: "hidden",
  position: "relative",
  height: "100vh",
  marginRight: 0,
  transition: theme.transitions.create("margin", {
    easing: open
      ? theme.transitions.easing.easeOut
      : theme.transitions.easing.sharp,
    duration: open
      ? theme.transitions.duration.enteringScreen
      : theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    [theme.breakpoints.down("md")]: {
      marginRight: PANEL_WIDTH,
    },
  }),
  [theme.breakpoints.up("md")]: {
    marginRight: PANEL_WIDTH,
  },
}));

export const GraphEditor = () => {
  const [open, setOpen] = useState(false);
  const [drawerExited, setDrawerExited] = useState(true);
  const [nodes, setNodes] = useState(SEED_NODES);
  const [links] = useState(SEED_LINKS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [namePatch, setNamePatch] = useState<NamePatch | null>(null);

  const handleOpen = () => {
    setDrawerExited(false);
    setOpen(true);
  };

  const handleSelectionChange = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const handleNameChange = useCallback((id: string, name: string) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, name } : node)),
    );
    setNamePatch({ id, name });
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Main open={open}>
        {drawerExited && (
          <IconButton
            onClick={handleOpen}
            aria-label="Open panel"
            sx={{
              display: { xs: "flex", md: "none" },
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 10,
            }}
          >
            ☰
          </IconButton>
        )}
        <DiagramCanvas
          nodes={nodes}
          links={links}
          selectedId={selectedId}
          namePatch={namePatch}
          onSelectionChange={handleSelectionChange}
        />
      </Main>
      <Slide open={open} onExited={() => setDrawerExited(true)}>
        <SidePanel
          nodes={nodes}
          links={links}
          selectedId={selectedId}
          onClose={() => setOpen(false)}
          onSelect={setSelectedId}
          onNameChange={handleNameChange}
        />
      </Slide>
    </Box>
  );
};
