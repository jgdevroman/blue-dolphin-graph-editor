import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export const Canvas = () => (
  <Box
    sx={{
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      bgcolor: "grey.100",
      overflow: "hidden",
    }}
  >
    <Typography variant="body1" color="text.secondary">
      Diagram canvas
    </Typography>
  </Box>
);
