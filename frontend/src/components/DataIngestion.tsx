import React, { useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { AgentSummary } from "../../../shared/agentSummary";
import {
  Box,
  Typography,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Button,
} from "@mui/material";
import { Analytics } from "./Analytics";

export const DataIngestion: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setError(null);
    setDebugInfo(null);
    if (selectedFile) {
      const sizeMB = (selectedFile.size / 1024 / 1024).toFixed(2);
      console.log(`Selected file: ${selectedFile.name} (${sizeMB}MB)`);
    }
  };

  const handleDebug = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api"
        }/debug`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setDebugInfo(res.data);
      console.log("Debug info:", res.data);
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || e.message || "Debug failed";
      setError(errorMsg);
      console.error("Debug error:", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api"
        }/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(progress);
            }
          },
        }
      );

      console.log("Raw response data:", res.data);
      console.log("First 3 records:", res.data.slice(0, 3));
      console.log("Data type:", typeof res.data);
      console.log("Is array:", Array.isArray(res.data));

      if (res.data && res.data.length > 0) {
        console.log("Sample record keys:", Object.keys(res.data[0]));
        console.log("Sample record values:", Object.values(res.data[0]));
      }

      setRows(res.data);
      setActiveTab(1); // Switch to Analytics tab after successful upload
      console.log(`Successfully loaded ${res.data.length} records`);
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || e.message || "Upload failed";
      setError(errorMsg);
      console.error("Upload error:", errorMsg);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const getDataInsights = () => {
    if (rows.length === 0) return null;

    const totalAgents = new Set(rows.map((r) => r.agent)).size;
    const totalWeeks = new Set(rows.map((r) => r.week)).size;
    const totalFirstQuotes = rows.reduce(
      (sum, r) => sum + (r.firstQuotes || 0),
      0
    );
    const totalSubmitted = rows.reduce((sum, r) => sum + (r.submitted || 0), 0);
    const avgConversionRate =
      totalFirstQuotes > 0
        ? ((totalSubmitted / totalFirstQuotes) * 100).toFixed(1)
        : "0";

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Data Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">
                Total Records
              </Typography>
              <Typography variant="h6">
                {rows.length.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">
                Unique Agents
              </Typography>
              <Typography variant="h6">{totalAgents}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">
                Weeks Covered
              </Typography>
              <Typography variant="h6">{totalWeeks}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">
                Avg Conversion Rate
              </Typography>
              <Typography variant="h6">{avgConversionRate}%</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const columns: GridColDef[] = [
    { field: "week", headerName: "Week", width: 100 },
    { field: "agent", headerName: "Agent", width: 150 },
    {
      field: "firstQuotes",
      headerName: "# 1st Quotes",
      width: 120,
      type: "number",
    },
    {
      field: "secondQuotes",
      headerName: "# 2nd Quotes",
      width: 120,
      type: "number",
    },
    {
      field: "submitted",
      headerName: "# Submitted",
      width: 120,
      type: "number",
    },
    {
      field: "smokerPercent",
      headerName: "Smoker %",
      width: 110,
      type: "number",
    },
    {
      field: "preferredPercent",
      headerName: "Preferred %",
      width: 120,
      type: "number",
    },
    {
      field: "standardPercent",
      headerName: "Standard %",
      width: 120,
      type: "number",
    },
    {
      field: "gradedPercent",
      headerName: "Graded %",
      width: 110,
      type: "number",
    },
    { field: "giPercent", headerName: "GI %", width: 90, type: "number" },
    { field: "ccPercent", headerName: "CC %", width: 90, type: "number" },
    {
      field: "issuedPaidMinus",
      headerName: "Issued & Paid %-",
      width: 150,
      type: "number",
    },
    {
      field: "issuedPaidPlus",
      headerName: "Issued & Paid %+",
      width: 150,
      type: "number",
    },
    {
      field: "preLapseCases",
      headerName: "Pre-Lapse Cases",
      width: 150,
      type: "number",
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileChange}
          style={{ marginRight: 16 }}
        />
        <Button
          variant="outlined"
          onClick={handleDebug}
          disabled={loading || !file}
          sx={{ mr: 1 }}
        >
          Debug File Structure
        </Button>
        <button
          onClick={handleUpload}
          disabled={loading || !file}
          style={{
            padding: "8px 16px",
            backgroundColor: loading || !file ? "#ccc" : "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading || !file ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Processing..." : "Upload & Analyze"}
        </button>

        {file && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
          </Typography>
        )}
      </Box>

      {loading && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            {uploadProgress > 0
              ? `Uploading... ${uploadProgress}%`
              : "Processing file..."}
          </Typography>
          <LinearProgress
            variant={uploadProgress > 0 ? "determinate" : "indeterminate"}
            value={uploadProgress}
          />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {debugInfo && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              File Structure Debug Info
            </Typography>
            <Typography
              variant="body2"
              component="pre"
              sx={{
                whiteSpace: "pre-wrap",
                fontSize: "12px",
                maxHeight: 400,
                overflow: "auto",
              }}
            >
              {JSON.stringify(debugInfo, null, 2)}
            </Typography>
          </CardContent>
        </Card>
      )}

      {getDataInsights()}

      {rows.length > 0 && (
        <Box sx={{ width: "100%" }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={activeTab}
              onChange={(_e, newValue) => setActiveTab(newValue)}
            >
              <Tab label="Raw Data" />
              <Tab label="Analytics & Insights" />
              <Tab label="Debug Info" />
            </Tabs>
          </Box>

          {activeTab === 0 && (
            <Box sx={{ height: 600, width: "100%", mt: 2 }}>
              <DataGrid
                rows={rows.map((row, i) => ({ id: i, ...row }))}
                columns={columns}
                initialState={{
                  pagination: {
                    paginationModel: { page: 0, pageSize: 25 },
                  },
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                density="compact"
              />
            </Box>
          )}

          {activeTab === 1 && <Analytics data={rows} />}

          {activeTab === 2 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Debug Information
              </Typography>
              <Card>
                <CardContent>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{ whiteSpace: "pre-wrap", fontSize: "12px" }}
                  >
                    {JSON.stringify(rows.slice(0, 3), null, 2)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
