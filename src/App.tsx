import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { GraphEditor } from "./components/GraphEditor";

const theme = createTheme();

export const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <GraphEditor />
  </ThemeProvider>
);
