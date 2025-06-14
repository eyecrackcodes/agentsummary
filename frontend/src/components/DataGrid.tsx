import React, { useMemo } from "react";
import {
  DataGrid as MuiDataGrid,
  GridColDef,
  GridToolbar,
} from "@mui/x-data-grid";
import { Box, Card, CardContent, Typography, Chip, Grid } from "@mui/material";
import { AgentSummary } from "../../../shared/agentSummary";

interface DataGridProps {
  data: AgentSummary[];
}

const DataGrid: React.FC<DataGridProps> = ({ data }) => {
  const { rows, insights } = useMemo(() => {
    // Add unique IDs to rows for DataGrid
    const processedRows = data.map((item, index) => ({
      id: index,
      ...item,
      conversionRate:
        item.firstQuotes > 0
          ? Number(((item.submitted / item.firstQuotes) * 100).toFixed(2))
          : 0,
      efficiency: (() => {
        const totalActivity =
          item.firstQuotes + item.secondQuotes + item.submitted;
        return totalActivity > 0
          ? Number(((item.submitted / totalActivity) * 100).toFixed(2))
          : 0;
      })(),
    }));

    // Calculate insights
    const totalRecords = processedRows.length;
    const uniqueAgents = new Set(processedRows.map((r) => r.agent)).size;
    const uniqueWeeks = new Set(processedRows.map((r) => r.week)).size;
    const totalSubmissions = processedRows.reduce(
      (sum, r) => sum + (r.submitted || 0),
      0
    );
    const avgConversion =
      processedRows.length > 0
        ? processedRows.reduce((sum, r) => sum + r.conversionRate, 0) /
          processedRows.length
        : 0;

    return {
      rows: processedRows,
      insights: {
        totalRecords,
        uniqueAgents,
        uniqueWeeks,
        totalSubmissions,
        avgConversion: Number(avgConversion.toFixed(2)),
      },
    };
  }, [data]);

  const columns: GridColDef[] = [
    {
      field: "week",
      headerName: "Week",
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === "Total" ? "primary" : "default"}
          variant={params.value === "Total" ? "filled" : "outlined"}
        />
      ),
    },
    {
      field: "agent",
      headerName: "Agent",
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium">
          {params.value}
        </Typography>
      ),
    },
    {
      field: "firstQuotes",
      headerName: "1st Quotes",
      width: 120,
      type: "number",
      renderCell: (params) => (
        <Typography
          variant="body2"
          color={params.value > 0 ? "text.primary" : "text.secondary"}
        >
          {params.value?.toLocaleString() || 0}
        </Typography>
      ),
    },
    {
      field: "secondQuotes",
      headerName: "2nd Quotes",
      width: 120,
      type: "number",
      renderCell: (params) => (
        <Typography
          variant="body2"
          color={params.value > 0 ? "text.primary" : "text.secondary"}
        >
          {params.value?.toLocaleString() || 0}
        </Typography>
      ),
    },
    {
      field: "submitted",
      headerName: "Submitted",
      width: 120,
      type: "number",
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold" color="success.main">
          {params.value?.toLocaleString() || 0}
        </Typography>
      ),
    },
    {
      field: "conversionRate",
      headerName: "Conversion %",
      width: 130,
      type: "number",
      renderCell: (params) => {
        const value = params.value || 0;
        const color =
          value >= 30
            ? "success.main"
            : value >= 20
            ? "warning.main"
            : "error.main";
        return (
          <Typography variant="body2" fontWeight="bold" color={color}>
            {value.toFixed(1)}%
          </Typography>
        );
      },
    },
    {
      field: "efficiency",
      headerName: "Efficiency %",
      width: 130,
      type: "number",
      renderCell: (params) => {
        const value = params.value || 0;
        const color =
          value >= 25
            ? "success.main"
            : value >= 15
            ? "warning.main"
            : "error.main";
        return (
          <Typography variant="body2" fontWeight="bold" color={color}>
            {value.toFixed(1)}%
          </Typography>
        );
      },
    },
    {
      field: "smokerPercent",
      headerName: "Smoker %",
      width: 110,
      type: "number",
      renderCell: (params) => `${params.value || 0}%`,
    },
    {
      field: "preferredPercent",
      headerName: "Preferred %",
      width: 120,
      type: "number",
      renderCell: (params) => (
        <Typography variant="body2" color="success.main" fontWeight="medium">
          {params.value || 0}%
        </Typography>
      ),
    },
    {
      field: "standardPercent",
      headerName: "Standard %",
      width: 120,
      type: "number",
      renderCell: (params) => `${params.value || 0}%`,
    },
    {
      field: "gradedPercent",
      headerName: "Graded %",
      width: 110,
      type: "number",
      renderCell: (params) => (
        <Typography variant="body2" color="warning.main">
          {params.value || 0}%
        </Typography>
      ),
    },
    {
      field: "giPercent",
      headerName: "GI %",
      width: 100,
      type: "number",
      renderCell: (params) => (
        <Typography variant="body2" color="error.main">
          {params.value || 0}%
        </Typography>
      ),
    },
    {
      field: "preLapseCases",
      headerName: "Pre-lapse",
      width: 110,
      type: "number",
      renderCell: (params) => {
        const value = params.value || 0;
        const color =
          value > 10
            ? "error.main"
            : value > 5
            ? "warning.main"
            : "text.primary";
        return (
          <Typography variant="body2" color={color}>
            {value.toLocaleString()}
          </Typography>
        );
      },
    },
  ];

  return (
    <Box>
      {/* Data Insights Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: "#e3f2fd" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="body2" color="text.secondary">
                Total Records
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {insights.totalRecords.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: "#e8f5e8" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="body2" color="text.secondary">
                Unique Agents
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {insights.uniqueAgents}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: "#fff3e0" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="body2" color="text.secondary">
                Time Periods
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {insights.uniqueWeeks}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: "#f3e5f5" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="body2" color="text.secondary">
                Total Submissions
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {insights.totalSubmissions.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: "#fce4ec" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="body2" color="text.secondary">
                Avg Conversion
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {insights.avgConversion}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Grid */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ height: 600, width: "100%" }}>
            <MuiDataGrid
              rows={rows}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 25 },
                },
                sorting: {
                  sortModel: [{ field: "submitted", sort: "desc" }],
                },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              checkboxSelection
              disableRowSelectionOnClick
              slots={{ toolbar: GridToolbar }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: { debounceMs: 500 },
                },
              }}
              sx={{
                border: 0,
                "& .MuiDataGrid-cell": {
                  borderBottom: "1px solid #f0f0f0",
                },
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "#f8f9fa",
                  borderBottom: "2px solid #e0e0e0",
                },
                "& .MuiDataGrid-row:hover": {
                  backgroundColor: "#f5f5f5",
                },
                "& .MuiDataGrid-toolbarContainer": {
                  padding: "16px",
                  borderBottom: "1px solid #e0e0e0",
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card sx={{ mt: 2, bgcolor: "#f8f9fa" }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📊 Data Legend
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Performance Indicators:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip
                  label="Conversion ≥30% = Excellent"
                  size="small"
                  color="success"
                />
                <Chip label="20-29% = Good" size="small" color="warning" />
                <Chip
                  label="<20% = Needs Improvement"
                  size="small"
                  color="error"
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Rating Quality:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip
                  label="Preferred = Best Quality"
                  size="small"
                  sx={{ bgcolor: "#4caf50", color: "white" }}
                />
                <Chip
                  label="Standard = Good Quality"
                  size="small"
                  sx={{ bgcolor: "#2196f3", color: "white" }}
                />
                <Chip
                  label="Graded = Lower Quality"
                  size="small"
                  sx={{ bgcolor: "#ff9800", color: "white" }}
                />
                <Chip
                  label="GI = Guaranteed Issue"
                  size="small"
                  sx={{ bgcolor: "#f44336", color: "white" }}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DataGrid;
