/**
 * Honest inspection vocabulary for NyayaPack (GitHub issue #6:
 * "Apply cited rules with honest not-assessed results").
 *
 * Canonical model: structured observations (`ObservedInput`) plus reviewer
 * context (`ReviewContext`) are evaluated by `rules.ts` into per-check
 * `RuleResult`s with the verdicts `no_issue_found | suspected_violation |
 * not_assessed`. There is no pass/fail/warning model and no weighted score
 * that decides legal wording. A numeric score survives ONLY as an internal
 * testing measure (`computeInternalScore` in `rules.ts`) and must never
 * decide the headline or any legal wording.
 *
 * Glossary (CONTEXT.md): "not assessed" is neither a confirmed violation
 * nor a pass; "suspected violation" awaits officer review.
 *
 * NOTE on `ObservedInput`: this is the rules-facing observation shape.
 * `src/lib/observations.ts` (issue #5, structured extraction) owns the
 * model-facing `ObservedDeclaration` (camelCase fields) and adapts it to
 * this shape via its exported `FIELD_MAP` + `toObservedInputs()`.
 * `value: null` means the relevant view was readable and the declaration
 * was not found there; `needsReview: true` means the reading is uncertain
 * or the view was unreadable.
 */

/** Honest per-check verdict. Never rendered as pass/fail. */
export type CheckResult = 'no_issue_found' | 'suspected_violation' | 'not_assessed';

/**
 * Report headline. The ONLY user-visible overall wording.
 * - "suspected violation": at least one check is a suspected violation.
 * - "insufficient evidence": no check could be assessed (all not_assessed
 *   or no assessable evidence at all).
 * - "no issue found in assessed checks": at least one check was assessed
 *   and none is a suspected violation. This is an inspection aid result,
 *   not legal certification.
 */
export type ReportHeadline =
  | 'no issue found in assessed checks'
  | 'suspected violation'
  | 'insufficient evidence';

/** Declaration fields covered by the 5-check cited catalog. */
export type ObservedField =
  | 'manufacturer'
  | 'net_quantity'
  | 'mrp'
  | 'manufacture_date'
  | 'consumer_care';

/**
 * Image-quality concern tied to one photograph. Single canonical
 * definition (measure ticket: blur, crop, obstruction, unreadable) —
 * `observations.ts` and `readability.ts` import this instead of defining
 * their own. There is no `glare` literal: glare is reported as an
 * `obstruction` with the detail kept in `note`.
 */
export type QualityIssue = 'blur' | 'crop' | 'obstruction' | 'unreadable';

/** One quality problem on one photograph, with a recapture prompt. */
export interface QualityFlag {
  photoId: string;
  issue: QualityIssue;
  note: string;
}

/**
 * Rules-facing observation input (see header note: produced from the
 * observations agent's declarations via `toObservedInputs()`).
 */
export interface ObservedInput {
  /** Which catalog check this observation feeds. */
  field: ObservedField;
  /**
   * Extracted (reviewed where available) declaration text. `null` means the
   * relevant view was readable and the declaration was not found there.
   * A photograph verifies declared text only — never actual contents.
   */
  value: string | null;
  /** Source photograph id, when the observation is linked to one. */
  photoId?: string;
  /** True when the reading is uncertain or the view was unreadable. */
  needsReview: boolean;
}

/** Reviewed import status. Never inferred from a photo alone. */
export type ImportStatus = 'imported' | 'domestic' | 'unknown';

/**
 * Reviewer-confirmed context that gates applicability. A declaration may be
 * marked suspected-missing ONLY when the rule applies, the relevant view is
 * readable, and `coverageConfirmed` is true.
 */
export interface ReviewContext {
  /** Broad retail category hint (reviewed); "unknown" when undecided. */
  category: string;
  /** Reviewed import status; "unknown" until the reviewer confirms it. */
  importStatus: ImportStatus;
  /** Reviewer confirms the relevant package sides were photographed. */
  coverageConfirmed: boolean;
  /** Number of photographs in the inspection. */
  photoCount: number;
}

/** Photo-linked evidence carried by a rule result. */
export interface RuleEvidence {
  value: string;
  photoId?: string;
}

/**
 * One supported check with its exact legal citation. `exceptions` records
 * the category/exclusion limits that force `not_assessed` instead of a
 * verdict. `effectiveFrom` is an ISO date; never a single 2011 date for
 * amended text.
 */
export interface RuleCatalogEntry {
  ruleId: ObservedField;
  label: string;
  legalCitation: string;
  gazetteNumber: string;
  /** ISO date the cited wording took effect. */
  effectiveFrom: string;
  sourceUrl: string;
  appliesWhen: string;
  exceptions: string;
  expectedDeclaration: string;
}

/**
 * Result of evaluating one catalog check against observations + context.
 */
export interface RuleResult {
  ruleId: ObservedField;
  label: string;
  legalCitation: string;
  gazetteNumber: string;
  /** ISO date the cited wording took effect. */
  effectiveFrom: string;
  sourceUrl: string;
  appliesWhen: string;
  result: CheckResult;
  /** Supporting declaration text, or null when nothing assessable was seen. */
  evidence: RuleEvidence | null;
  /** Honest explanation, including the reason for any not_assessed. */
  message: string;
  /** True when a reviewer must look at this check before export. */
  needsReview: boolean;
}

/* ------------------------------------------------------------------ */
/* Deprecated pre-#6 compatibility shapes (do not extend)               */
/* ------------------------------------------------------------------ */
/**
 * Everything below is a deprecated compatibility shim so pages owned by
 * other agents (scan/report/repository/dashboard, mock-data) keep compiling
 * until they migrate to `CheckResult`/`RuleResult`/headlines. New code must
 * use the honest vocabulary above. The old pass/fail/warning + weighted
 * score model no longer decides any legal wording.
 */

/** @deprecated Use `CheckResult`. Kept only for pre-migration UI. */
export type CheckStatus = 'pass' | 'fail' | 'warning';

/** @deprecated Use `ReportHeadline`. Kept only for pre-migration UI. */
export type OverallStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';

/** @deprecated Use `RuleResult`. Kept only for pre-migration UI. */
export interface ComplianceCheck {
  id: string;
  label: string;
  ruleRef: string;
  status: CheckStatus;
  extractedText?: string;
  expected?: string;
  message: string;
}

/**
 * @deprecated Font measurement is owned by the readability agent (issue #8).
 * Kept only for pre-migration UI; new code must show "not assessed" without
 * a usable known-size reference instead of simulated millimetres.
 */
export interface FontAnalysis {
  panelAreaCm2: number;
  minRequiredMm: number;
  estimatedMm: number;
  status: CheckStatus;
  readabilityScore: number;
  contrastNote: string;
}

/** @deprecated Kept only for pre-migration UI and stored legacy reports. */
export interface ProductReport {
  id: string;
  productName: string;
  brand: string;
  category: string;
  imageUrl: string;
  /** ISO timestamp of the scan. */
  scannedAt: string;
  overallStatus: OverallStatus;
  /**
   * @deprecated Internal-testing number only; never decides legal wording.
   * Kept so stored reports still typecheck.
   */
  score: number;
  checks: ComplianceCheck[];
  font: FontAnalysis;
  rawOcrText: string;
}

/** @deprecated Kept only for pre-migration dashboard UI. */
export interface DashboardStats {
  totalScans: number;
  compliant: number;
  nonCompliant: number;
  pending: number;
  violationsByType: { name: string; value: number }[];
  recentScans: ProductReport[];
}
