import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import xlsx from "xlsx";
import { DataIngestionService } from "./services/dataIngestionService";

const app = express();
const upload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});
const ingestionService = new DataIngestionService();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  console.log(
    `Processing file: ${req.file.originalname} (${(
      req.file.size /
      1024 /
      1024
    ).toFixed(2)}MB)`
  );

  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    const data = await ingestionService.processFile(req.file.buffer, ext);

    console.log(`Successfully processed ${data.length} records`);
    res.json(data);
  } catch (e: any) {
    console.error("File processing error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Debug endpoint to inspect Excel file structure
app.post("/api/debug", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === ".xlsx") {
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });

      const result: any = {
        sheetNames: workbook.SheetNames,
        sheets: {},
      };

      // Get info for each sheet
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const records = xlsx.utils.sheet_to_json(sheet) as any[];

        result.sheets[sheetName] = {
          recordCount: records.length,
          columns:
            records.length > 0 && records[0] ? Object.keys(records[0]) : [],
          firstRecord: records.length > 0 ? records[0] : null,
        };
      });

      res.json(result);
    } else {
      res
        .status(400)
        .json({ error: "Debug endpoint only supports Excel files" });
    }
  } catch (e: any) {
    console.error("Debug error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Error handler for multer file size limit
app.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File too large. Maximum size is 50MB." });
    }
  }
  next(error);
});

app.listen(4000, () => console.log("Backend running on port 4000"));
