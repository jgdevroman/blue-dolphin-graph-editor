import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppLink, AppNode } from "../types/graph";
import type { NamePatch } from "../types/graph-editor";
import { GENERATED_GRAPH } from "../utils/graphUtils";
import { DiagramCanvas } from "./DiagramCanvas";
import { LoadingOverlay } from "./LoadingOverlay";
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
  const [nodes, setNodes] = useState<AppNode[]>(() => GENERATED_GRAPH.nodes);
  const [links, setLinks] = useState<AppLink[]>(() => GENERATED_GRAPH.links);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [namePatch, setNamePatch] = useState<NamePatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const nodeIndexRef = useRef<Map<string, number>>(
    new Map(GENERATED_GRAPH.nodes.map((node, index) => [node.id, index])),
  );
  const linkIndexRef = useRef<Map<string, number>>(
    new Map(GENERATED_GRAPH.links.map((link, index) => [link.id, index])),
  );

  const refreshNodeIndex = (updatedNodes: AppNode[]) => {
    const freshIndex = new Map<string, number>();
    updatedNodes.forEach((node, index) => {
      freshIndex.set(node.id, index);
    });
    nodeIndexRef.current = freshIndex;
  };

  const refreshLinkIndex = (updatedLinks: AppLink[]) => {
    const freshIndex = new Map<string, number>();
    updatedLinks.forEach((link, index) => {
      freshIndex.set(link.id, index);
    });
    linkIndexRef.current = freshIndex;
  };

  // On mount, populate the node/link index refs with the initial data.
  // biome-ignore lint/correctness/useExhaustiveDependencies: needs to run only once on mount. The refresh functions are stable and do not need to be included in the dependency array.
  useEffect(() => {
    refreshNodeIndex(nodes);
    refreshLinkIndex(links);
  }, []);

  const handleInitialLayoutCompleted = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleOpen = () => {
    setDrawerExited(false);
    setOpen(true);
  };

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
          nodeIndexRef={nodeIndexRef}
          linkIndexRef={linkIndexRef}
          selectedId={selectedId}
          namePatch={namePatch}
          setSelectedId={setSelectedId}
          onInitialLayoutCompleted={handleInitialLayoutCompleted}
          setNodes={setNodes}
          setLinks={setLinks}
        />
        {isLoading && <LoadingOverlay />}
      </Main>
      <Slide open={open} onExited={() => setDrawerExited(true)}>
        <SidePanel
          nodes={nodes}
          links={links}
          nodeIndexRef={nodeIndexRef}
          selectedId={selectedId}
          isLoading={isLoading}
          onClose={() => setOpen(false)}
          onSelect={setSelectedId}
          setNodes={setNodes}
          setNamePatch={setNamePatch}
        />
      </Slide>
    </Box>
  );
};
