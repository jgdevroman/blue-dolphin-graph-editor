import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export const LoadingOverlay = () => (
  <Box
    sx={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      bgcolor: "rgba(255,255,255,0.75)",
      zIndex: 10,
    }}
  >
    <Typography>Loading Graph...</Typography>
  </Box>
);
