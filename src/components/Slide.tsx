import Drawer from "@mui/material/Drawer";

const PANEL_WIDTH = 320;

type SlideProps = {
  open: boolean;
  onExited: () => void;
  children?: React.ReactNode;
};

export const Slide = ({ open, onExited, children }: SlideProps) => (
  <aside>
    <Drawer
      variant="persistent"
      anchor="right"
      open={open}
      slotProps={{ transition: { onExited } }}
      sx={{
        display: { xs: "block", md: "none" },
        "& .MuiDrawer-paper": {
          boxSizing: "border-box",
          width: { xs: "100vw", sm: PANEL_WIDTH },
        },
      }}
    >
      {children}
    </Drawer>

    <Drawer
      variant="permanent"
      anchor="right"
      open
      sx={{
        display: { xs: "none", md: "block" },
        "& .MuiDrawer-paper": {
          boxSizing: "border-box",
          width: PANEL_WIDTH,
        },
      }}
    >
      {children}
    </Drawer>
  </aside>
);
