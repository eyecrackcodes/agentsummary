import React, { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Box,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Paper,
  Chip,
} from "@mui/material";
import { CloudUpload, InsertDriveFile, Analytics } from "@mui/icons-material";
import { AgentSummary } from "../../../shared/agentSummary";

interface FileUploadProps {
  onDataUpload: (data: AgentSummary[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setError(null);
    setSuccess(null);

    if (selectedFile) {
      const sizeMB = (selectedFile.size / 1024 / 1024).toFixed(2);
      console.log(`Selected file: ${selectedFile.name} (${sizeMB}MB)`);

      // Validate file type
      const validTypes = [".csv", ".xlsx", ".xls"];
      const fileExtension = selectedFile.name
        .toLowerCase()
        .substring(selectedFile.name.lastIndexOf("."));

      if (!validTypes.includes(fileExtension)) {
        setError("Please select a CSV or Excel file (.csv, .xlsx, .xls)");
        setFile(null);
        return;
      }

      // Validate file size (50MB limit)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError("File size must be less than 50MB");
        setFile(null);
        return;
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    try {
      const fileExtension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf("."));
      let parsedData: any[] = [];

      if (fileExtension === ".csv") {
        // Parse CSV file
        const text = await file.text();
        setUploadProgress(50);

        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            parsedData = results.data;
            setUploadProgress(75);
          },
          error: (error: any) => {
            throw new Error(`CSV parsing error: ${error.message}`);
          },
        });
      } else if (fileExtension === ".xlsx" || fileExtension === ".xls") {
        // Parse Excel file
        const arrayBuffer = await file.arrayBuffer();
        setUploadProgress(50);

        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        parsedData = XLSX.utils.sheet_to_json(worksheet);
        setUploadProgress(75);
      }

      // Transform data to match AgentSummary interface
      const transformedData: AgentSummary[] = parsedData.map((record: any) => ({
        week: String(record.Week || record.week || ""),
        agent: String(record.Agent || record.agent || ""),
        firstQuotes:
          parseInt(
            String(record["# 1st Quotes"] || record.firstQuotes || "0")
          ) || 0,
        secondQuotes:
          parseInt(
            String(record["# 2nd Quotes"] || record.secondQuotes || "0")
          ) || 0,
        submitted:
          parseInt(String(record["# Submitted"] || record.submitted || "0")) ||
          0,
        freeLooked:
          parseInt(String(record["# Free look"] || record.freeLooked || "0")) ||
          0,
        firstQuoteSmokerPercent:
          parseFloat(
            String(
              record["1st Quote Smoker %"] ||
                record.firstQuoteSmokerPercent ||
                "0"
            )
          ) || 0,
        secondQuoteSmokerPercent:
          parseFloat(
            String(
              record["2nd Quote Smoker %"] ||
                record.secondQuoteSmokerPercent ||
                "0"
            )
          ) || 0,
        preferredPercent:
          parseFloat(
            String(record["Preferred %"] || record.preferredPercent || "0")
          ) || 0,
        standardPercent:
          parseFloat(
            String(record["Standard %"] || record.standardPercent || "0")
          ) || 0,
        gradedPercent:
          parseFloat(
            String(record["Graded %"] || record.gradedPercent || "0")
          ) || 0,
        giPercent:
          parseFloat(String(record["GI %"] || record.giPercent || "0")) || 0,
        ccPercent:
          parseFloat(String(record["CC %"] || record.ccPercent || "0")) || 0,
        issuedPaidMinus:
          parseFloat(
            String(record["Issued & Paid %-"] || record.issuedPaidMinus || "0")
          ) || 0,
        issuedPaidPlus:
          parseFloat(
            String(record["Issued & Paid %+"] || record.issuedPaidPlus || "0")
          ) || 0,
        smokerPercent:
          parseFloat(
            String(record["Smoker %"] || record.smokerPercent || "0")
          ) || 0,
        preLapseCases:
          parseInt(
            String(record["Pre-lapse Cases"] || record.preLapseCases || "0")
          ) || 0,
      }));

      setUploadProgress(100);

      console.log("Upload successful:", transformedData.length, "records");

      if (transformedData.length > 0) {
        onDataUpload(transformedData);
        setSuccess(
          `Successfully processed ${transformedData.length.toLocaleString()} records!`
        );

        // Clear the file input after successful upload
        setFile(null);
        const fileInput = document.getElementById(
          "file-upload"
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        setError("No data found in the uploaded file");
      }
    } catch (e: any) {
      const errorMsg = e.message || "File processing failed";
      setError(errorMsg);
      console.error("Upload error:", errorMsg);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        📁 Upload Agent Performance Data
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select File
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Upload your agent performance data in CSV or Excel format.
                Maximum file size: 50MB
              </Typography>

              <Box sx={{ mb: 3 }}>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <label htmlFor="file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    sx={{ mr: 2 }}
                    size="large"
                  >
                    Choose File
                  </Button>
                </label>

                {file && (
                  <Button
                    variant="contained"
                    onClick={handleUpload}
                    disabled={loading}
                    startIcon={<Analytics />}
                    size="large"
                  >
                    {loading ? "Processing..." : "Process & Analyze"}
                  </Button>
                )}
              </Box>

              {file && (
                <Paper sx={{ p: 2, bgcolor: "#f8f9fa", mb: 2 }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <InsertDriveFile color="primary" />
                    <Box flexGrow={1}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {file.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                    </Box>
                    <Chip
                      label={file.name
                        .substring(file.name.lastIndexOf(".") + 1)
                        .toUpperCase()}
                      color="primary"
                      size="small"
                    />
                  </Box>
                </Paper>
              )}

              {loading && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Processing file... {uploadProgress}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={uploadProgress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: "#f8f9fa" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Expected Data Format
              </Typography>
              <Typography variant="body2" paragraph>
                Your file should contain the following columns:
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                <Typography component="li" variant="body2">
                  Week
                </Typography>
                <Typography component="li" variant="body2">
                  Agent
                </Typography>
                <Typography component="li" variant="body2">
                  # 1st Quotes
                </Typography>
                <Typography component="li" variant="body2">
                  # 2nd Quotes
                </Typography>
                <Typography component="li" variant="body2">
                  # Submitted
                </Typography>
                <Typography component="li" variant="body2">
                  Smoker %
                </Typography>
                <Typography component="li" variant="body2">
                  Preferred %
                </Typography>
                <Typography component="li" variant="body2">
                  Standard %
                </Typography>
                <Typography component="li" variant="body2">
                  Graded %
                </Typography>
                <Typography component="li" variant="body2">
                  GI %
                </Typography>
                <Typography component="li" variant="body2">
                  # Free look
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ mt: 2, fontStyle: "italic" }}>
                💡 The system will automatically detect and map your column
                headers.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FileUpload;
