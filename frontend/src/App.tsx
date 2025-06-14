import React, { useState } from "react";
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from "@mui/material";
import FileUpload from "./components/FileUpload";
import DataGrid from "./components/DataGrid";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import StatisticalSummary from "./components/StatisticalSummary";
import ErrorBoundary from "./components/ErrorBoundary";
import { AgentSummary } from "../../shared/agentSummary";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#f5f5f5",
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

function App() {
  const [data, setData] = useState<AgentSummary[]>([]);
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDataUpload = (uploadedData: AgentSummary[]) => {
    setData(uploadedData);
    // Automatically switch to analytics tab when data is uploaded
    if (uploadedData.length > 0) {
      setTabValue(1);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth={false} sx={{ py: 4, px: 3 }}>
        <ErrorBoundary>
          <Box sx={{ mb: 4, textAlign: "center" }}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: "bold",
                background: "linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 2,
              }}
            >
              Final Expense Agent Performance Analyzer
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 800, mx: "auto" }}
            >
              Comprehensive analytics platform for call center agent performance
              data with compliance monitoring, statistical analysis, and
              actionable insights
            </Typography>
          </Box>

          <Paper sx={{ width: "100%", mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="analytics tabs"
                variant="fullWidth"
                sx={{
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontSize: "1rem",
                    fontWeight: 500,
                    minHeight: 64,
                  },
                }}
              >
                <Tab
                  label="📁 Data Upload & Grid"
                  {...a11yProps(0)}
                  sx={{
                    "&.Mui-selected": {
                      color: "primary.main",
                      fontWeight: 600,
                    },
                  }}
                />
                <Tab
                  label="📊 Performance Analytics"
                  {...a11yProps(1)}
                  disabled={data.length === 0}
                  sx={{
                    "&.Mui-selected": {
                      color: "primary.main",
                      fontWeight: 600,
                    },
                  }}
                />
                <Tab
                  label="📈 Statistical Analysis"
                  {...a11yProps(2)}
                  disabled={data.length === 0}
                  sx={{
                    "&.Mui-selected": {
                      color: "primary.main",
                      fontWeight: 600,
                    },
                  }}
                />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Box sx={{ p: 3 }}>
                <FileUpload onDataUpload={handleDataUpload} />
                {data.length > 0 && (
                  <Box sx={{ mt: 4 }}>
                    <Typography
                      variant="h5"
                      gutterBottom
                      sx={{ mb: 3, fontWeight: 600 }}
                    >
                      📋 Data Overview ({data.length.toLocaleString()} records)
                    </Typography>
                    <DataGrid data={data} />
                  </Box>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <AnalyticsDashboard data={data} />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <StatisticalSummary data={data} />
            </TabPanel>
          </Paper>

          {data.length > 0 && (
            <Paper sx={{ p: 3, mt: 3, bgcolor: "#f8f9fa" }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                💡 Quick Navigation Tips
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                <Typography
                  variant="body2"
                  sx={{
                    bgcolor: "white",
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    border: "1px solid #e0e0e0",
                  }}
                >
                  📁 <strong>Data Tab:</strong> View raw data and upload new
                  files
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    bgcolor: "white",
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    border: "1px solid #e0e0e0",
                  }}
                >
                  📊 <strong>Analytics Tab:</strong> Performance charts, trends,
                  and risk analysis
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    bgcolor: "white",
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    border: "1px solid #e0e0e0",
                  }}
                >
                  📈 <strong>Statistics Tab:</strong> Advanced metrics,
                  correlations, and benchmarks
                </Typography>
              </Box>
            </Paper>
          )}
        </ErrorBoundary>
      </Container>
    </ThemeProvider>
  );
}

export default App;
