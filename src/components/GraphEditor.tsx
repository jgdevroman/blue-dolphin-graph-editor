import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import { Canvas } from "./Canvas";
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
        <IconButton
          onClick={handleOpen}
          aria-label="Open panel"
          sx={{
            display: drawerExited ? { xs: "flex", md: "none" } : "none",
            position: "absolute",
            top: 8,
            right: 8,
          }}
        >
          ☰
        </IconButton>
        <Canvas />
      </Main>
      <Slide open={open} onExited={() => setDrawerExited(true)}>
        <SidePanel onClose={() => setOpen(false)} />
      </Slide>
    </Box>
  );
};
