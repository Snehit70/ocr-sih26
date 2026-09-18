/**
 * Shared domain types for the Legal Metrology (Packaged Commodities) Rules, 2011
 * compliance checker prototype.
 *
 * These types are consumed by the rules engine (`rules.ts`), mock data
 * (`mock-data.ts`), and the dashboard / report UI components.
 */

/** Per-check verdict. */
export type CheckStatus = 'pass' | 'fail' | 'warning';

/** Overall verdict for a scanned product. */
export type OverallStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';

/**
 * A single mandatory-declaration check mapped to a Legal Metrology rule.
 */
export interface ComplianceCheck {
  /** Stable machine key, e.g. "mrp", "net_quantity". */
  id: string;
  /** Human-readable label, e.g. "Maximum Retail Price (MRP)". */
  label: string;
  /** Rule reference, e.g. "Rule 6(1)(e)". */
  ruleRef: string;
  status: CheckStatus;
  /** Raw OCR snippet that triggered the verdict (when found). */
  extractedText?: string;
  /** What the engine expected to see. */
  expected?: string;
  /** Human-readable explanation of the verdict. */
  message: string;
}

/**
 * Font-size / legibility analysis derived from principal-display-panel area.
 * Thresholds follow Table-I of the Packaged Commodities Rules.
 */
export interface FontAnalysis {
  /** Principal display panel area in cm² (input). */
  panelAreaCm2: number;
  /** Minimum letter height in mm required by Table-I. */
  minRequiredMm: number;
  /** Estimated measured letter height in mm (simulated from OCR geometry). */
  estimatedMm: number;
  status: CheckStatus;
  /** 0–100 legibility score (size margin + contrast heuristics). */
  readabilityScore: number;
  /** Short note on contrast / free-space / legibility. */
  contrastNote: string;
}

/**
 * Full compliance report for one scanned product.
 */
export interface ProductReport {
  id: string;
  productName: string;
  brand: string;
  category: string;
  imageUrl: string;
  /** ISO timestamp of the scan. */
  scannedAt: string;
  overallStatus: OverallStatus;
  /** 0–100, percentage of checks passing (warnings count as half). */
  score: number;
  checks: ComplianceCheck[];
  font: FontAnalysis;
  rawOcrText: string;
}

/**
 * Aggregated numbers for the dashboard overview.
 */
export interface DashboardStats {
  totalScans: number;
  compliant: number;
  nonCompliant: number;
  pending: number;
  violationsByType: { name: string; value: number }[];
  recentScans: ProductReport[];
}
