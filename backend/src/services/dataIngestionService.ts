import { AgentSummary } from "../../../shared/agentSummary";
import { parse } from "csv-parse/sync";
import xlsx from "xlsx";

export class DataIngestionService {
  async processFile(file: Buffer, ext: string): Promise<AgentSummary[]> {
    if (ext === ".csv") {
      const records = parse(file, { columns: true, skip_empty_lines: true });
      return this.mapRecords(records);
    } else if (ext === ".xlsx") {
      const workbook = xlsx.read(file, { type: "buffer" });

      // Debug: Log all sheet names
      console.log("Available sheets:", workbook.SheetNames);

      // Find the "agent summary" sheet with flexible matching
      const findAgentSummarySheet = (sheetNames: string[]): string | null => {
        // First try to find a sheet with "agent" and "summary" in the name
        const found = sheetNames.find(
          (name) =>
            name.toLowerCase().includes("agent") &&
            name.toLowerCase().includes("summary")
        );
        if (found) return found;

        // Fallback to exact matches
        const possibleNames = [
          "agent summary",
          "Agent Summary",
          "AGENT SUMMARY",
          "AgentSummary",
          "agent_summary",
          "Agent_Summary",
        ];

        for (const possibleName of possibleNames) {
          if (sheetNames.includes(possibleName)) {
            return possibleName;
          }
        }

        return null;
      };

      const targetSheetName = findAgentSummarySheet(workbook.SheetNames);

      if (!targetSheetName) {
        throw new Error(
          `Could not find "agent summary" sheet. Available sheets: ${workbook.SheetNames.join(
            ", "
          )}`
        );
      }

      console.log(`Using sheet: "${targetSheetName}"`);

      const sheet = workbook.Sheets[targetSheetName];
      const records = xlsx.utils.sheet_to_json(sheet);
      return this.mapRecords(records);
    }
    throw new Error("Unsupported file type");
  }

  private mapRecords(records: any[]): AgentSummary[] {
    if (records.length === 0) return [];

    // Debug: Log the first record to see actual column names
    console.log("First record keys:", Object.keys(records[0]));
    console.log("First record:", records[0]);

    return records.map((row: any) => {
      // Get all column names to handle potential variations
      const keys = Object.keys(row);

      // Helper function to find column by partial match
      const findColumn = (patterns: string[]): string | null => {
        for (const pattern of patterns) {
          const found = keys.find((key) =>
            key.toLowerCase().includes(pattern.toLowerCase())
          );
          if (found) return found;
        }
        return null;
      };

      // Find percentage columns - there might be duplicates for 1st vs 2nd quotes
      const smokerCols = keys.filter((key) =>
        key.toLowerCase().includes("smoker")
      );
      const preferredCols = keys.filter((key) =>
        key.toLowerCase().includes("preferred")
      );
      const standardCols = keys.filter((key) =>
        key.toLowerCase().includes("standard")
      );
      const gradedCols = keys.filter((key) =>
        key.toLowerCase().includes("graded")
      );
      const giCols = keys.filter((key) => key.toLowerCase().includes("gi"));

      // Find issued & paid columns
      const issuedPaidMinusCol = findColumn([
        "issued & paid %-",
        "issued paid %-",
        "issued_paid_minus",
      ]);
      const issuedPaidPlusCol = findColumn([
        "issued & paid %+",
        "issued paid %+",
        "issued_paid_plus",
      ]);

      const mapped: AgentSummary = {
        week: row["Week"] || row["week"] || null,
        agent: row["Agent"] || row["agent"] || null,
        firstQuotes:
          Number(row["# 1st Quotes"] || row["cnt_q1"] || row["First Quotes"]) ||
          0,
        secondQuotes:
          Number(
            row["# 2nd Quotes"] || row["cnt_q2"] || row["Second Quotes"]
          ) || 0,
        submitted:
          Number(row["# Submitted"] || row["cnt_subm"] || row["Submitted"]) ||
          0,
        freeLooked:
          Number(row["# Free look"] || row["Free Look"] || row["Free_Look"]) ||
          0,

        // First Quote Smoker % (if available)
        firstQuoteSmokerPercent:
          smokerCols.length > 0 ? this.parsePercent(row[smokerCols[0]]) : 0,

        // Second Quote Percentages (use second column if available, otherwise first)
        secondQuoteSmokerPercent:
          smokerCols.length > 1
            ? this.parsePercent(row[smokerCols[1]])
            : smokerCols.length > 0
            ? this.parsePercent(row[smokerCols[0]])
            : 0,

        // For other percentages, use the last occurrence (likely 2nd quote percentages)
        preferredPercent:
          preferredCols.length > 0
            ? this.parsePercent(row[preferredCols[preferredCols.length - 1]])
            : 0,
        standardPercent:
          standardCols.length > 0
            ? this.parsePercent(row[standardCols[standardCols.length - 1]])
            : 0,
        gradedPercent:
          gradedCols.length > 0
            ? this.parsePercent(row[gradedCols[gradedCols.length - 1]])
            : 0,
        giPercent:
          giCols.length > 0
            ? this.parsePercent(row[giCols[giCols.length - 1]])
            : 0,

        // Financial metrics
        ccPercent: this.parsePercent(
          row["CC %"] || row["Credit Card %"] || row["cc_percent"]
        ),
        issuedPaidMinus: issuedPaidMinusCol
          ? this.parsePercent(row[issuedPaidMinusCol])
          : 0,
        issuedPaidPlus: issuedPaidPlusCol
          ? this.parsePercent(row[issuedPaidPlusCol])
          : 0,

        // Legacy compatibility
        smokerPercent:
          smokerCols.length > 0 ? this.parsePercent(row[smokerCols[0]]) : 0,
        preLapseCases:
          Number(row["Pre-lapse"] || row["Pre Lapse"] || row["PreLapse"]) || 0,
      };

      // Debug: Log the first mapped record
      if (records.indexOf(row) === 0) {
        console.log("Mapped first record:", mapped);
        console.log("Available smoker columns:", smokerCols);
        console.log("Available preferred columns:", preferredCols);
        console.log("Issued & Paid columns found:", {
          minus: issuedPaidMinusCol,
          plus: issuedPaidPlusCol,
        });
      }

      return mapped;
    });
  }

  private parsePercent(value: any): number {
    if (!value) return 0;
    const str = String(value).replace("%", "").trim();
    return Number(str) || 0;
  }
}
