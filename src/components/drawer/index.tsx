import MuiDrawer from "@mui/material/Drawer";

const PANEL_WIDTH = 320;

type SlideProps = {
  open: boolean;
  onExited: () => void;
  children?: React.ReactNode;
};

export const Drawer = ({ open, onExited, children }: SlideProps) => (
  <aside>
    <MuiDrawer
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
    </MuiDrawer>

    <MuiDrawer
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
    </MuiDrawer>
  </aside>
);
