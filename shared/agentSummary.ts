export interface AgentSummary {
  week: string;
  agent: string;
  firstQuotes: number;
  secondQuotes: number;
  submitted: number;
  freeLooked: number; // Number of policies cancelled within first 30 days of payment

  // First Quote Percentages
  firstQuoteSmokerPercent: number;

  // Second Quote Percentages
  secondQuoteSmokerPercent: number;
  preferredPercent: number;
  standardPercent: number;
  gradedPercent: number;
  giPercent: number;

  // Financial Metrics
  ccPercent: number; // Credit Card percentage
  issuedPaidMinus: number; // Issued & Paid %- (negative scenarios)
  issuedPaidPlus: number; // Issued & Paid %+ (positive scenarios)

  // Legacy fields for backward compatibility
  smokerPercent: number;
  preLapseCases: number; // Legacy field - keeping for compatibility
}
