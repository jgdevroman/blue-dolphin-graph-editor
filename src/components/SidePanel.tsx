import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

type SidePanelProps = {
  onClose: () => void;
};

export const SidePanel = ({ onClose }: SidePanelProps) => (
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
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No nodes yet
        </Typography>
      </Box>
    </Box>

    <Box sx={{ flex: "0 0 auto", borderTop: 1, borderColor: "divider" }}>
      <Typography variant="overline" sx={{ px: 2, pt: 2, pb: 1 }}>
        Properties
      </Typography>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Select a node to view properties
        </Typography>
      </Box>
    </Box>
  </Box>
);
