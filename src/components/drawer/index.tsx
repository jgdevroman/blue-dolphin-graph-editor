import { useMediaQuery } from "@mui/material";
import MuiDrawer from "@mui/material/Drawer";
import { useTheme } from "@mui/material/styles";

const PANEL_WIDTH = 320;

type SlideProps = {
  open: boolean;
  onExited: () => void;
  children?: React.ReactNode;
};

export const Drawer = ({ open, onExited, children }: SlideProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  if (isMobile) {
    return (
      <aside>
        <MuiDrawer
          variant="persistent"
          anchor="right"
          open={open}
          slotProps={{ transition: { onExited } }}
          sx={{
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: { xs: "100vw", sm: PANEL_WIDTH },
            },
          }}
        >
          {children}
        </MuiDrawer>
      </aside>
    );
  }

  return (
    <aside>
      <MuiDrawer
        variant="permanent"
        anchor="right"
        open
        sx={{
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
};
