/**
 * Real-photo benchmark runner (GitHub issue #11, PRD user stories 35-36).
 *
 * Reads human-written answer sheets in benchmark/cases/*.json and reports
 * extraction/findings metrics. Standalone: node builtins only, NO imports
 * from src/ so benchmark assets stay out of the app runtime.
 *
 * Answer-sheet shape per case:
 * {
 *   packageId: string,
 *   photosDir: string,            // relative to benchmark/cases/
 *   category: string,
 *   expectedDeclarations: [{ field, text, photoId }],
 *   applicableChecks: string[],
 *   expectedFindings: [{ ruleId, result, reason? }]
 * }
 *
 * Comparison metrics (per-field extraction errors, false suspected
 * violations, missed known issues) are computed ONLY when a matching
 * actual-results file exists at benchmark/results/<packageId>.json:
 * { declarations: [{ field, text }], findings: [{ ruleId, result }] }.
 * Without one, those columns report "pending" — no live model run is
 * attempted and no accuracy threshold is claimed (the team has not
 * chosen one).
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BENCH_ROOT = resolve(HERE, "..", "benchmark");
const CASES_DIR = join(BENCH_ROOT, "cases");
const RESULTS_DIR = join(BENCH_ROOT, "results");

type FindingResult = "no_issue_found" | "suspected_violation" | "not_assessed";

interface ExpectedDeclaration {
  field: string;
  text: string | null;
  photoId: string;
}

interface ExpectedFinding {
  ruleId: string;
  result: FindingResult;
  reason?: string;
}

interface AnswerSheet {
  packageId: string;
  photosDir: string;
  category: string;
  expectedDeclarations: ExpectedDeclaration[];
  applicableChecks: string[];
  expectedFindings: ExpectedFinding[];
}

interface ActualResults {
  declarations?: { field: string; text: string | null }[];
  findings?: { ruleId: string; result: FindingResult }[];
}

interface CaseReport {
  packageId: string;
  fieldsExpected: number;
  suspectedExpected: number;
  notAssessedExpected: number;
  photosFound: number;
  photosMissing: boolean;
  fieldErrors: number | null;
  falseFlags: number | null;
  missed: number | null;
  ms: number;
  problems: string[];
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function validateSheet(raw: unknown, file: string): { sheet: AnswerSheet | null; problems: string[] } {
  const problems: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { sheet: null, problems: [`${file}: not a JSON object`] };
  }
  const rec = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const packageId = str(rec.packageId).trim();
  if (!packageId) problems.push(`${file}: missing packageId`);
  if (!str(rec.photosDir).trim()) problems.push(`${file}: missing photosDir`);
  if (!str(rec.category).trim()) problems.push(`${file}: missing category`);
  if (!Array.isArray(rec.expectedDeclarations)) problems.push(`${file}: missing expectedDeclarations[]`);
  if (!Array.isArray(rec.applicableChecks)) problems.push(`${file}: missing applicableChecks[]`);
  if (!Array.isArray(rec.expectedFindings)) problems.push(`${file}: missing expectedFindings[]`);
  if (problems.length > 0) return { sheet: null, problems };
  const sheet = {
    packageId,
    photosDir: str(rec.photosDir).trim(),
    category: str(rec.category).trim(),
    expectedDeclarations: (rec.expectedDeclarations as unknown[]).map((d) => {
      const r = d as unknown as Record<string, unknown>;
      return {
        field: str(r.field),
        text: typeof r.text === "string" ? r.text : null,
        photoId: str(r.photoId),
      };
    }),
    applicableChecks: (rec.applicableChecks as unknown[]).map((c) => String(c)),
    expectedFindings: (rec.expectedFindings as unknown[]).map((f) => {
      const r = f as unknown as Record<string, unknown>;
      return {
        ruleId: str(r.ruleId),
        result: str(r.result) as FindingResult,
        reason: typeof r.reason === "string" ? r.reason : undefined,
      };
    }),
  };
  for (const f of sheet.expectedFindings) {
    if (f.result !== "no_issue_found" && f.result !== "suspected_violation" && f.result !== "not_assessed") {
      problems.push(`${file}: finding ${f.ruleId} has unknown result "${f.result}"`);
    }
  }
  return { sheet, problems };
}

function loadActual(packageId: string): ActualResults | null {
  const file = join(RESULTS_DIR, `${packageId}.json`);
  if (!existsSync(file)) return null;
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
    if (!raw || typeof raw !== "object") return null;
    return raw as ActualResults;
  } catch {
    return null;
  }
}

function evaluateCase(file: string, casesDir: string = CASES_DIR): CaseReport {
  const started = Date.now();
  const problems: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(casesDir, file), "utf8")) as unknown;
  } catch (err) {
    return {
      packageId: file,
      fieldsExpected: 0,
      suspectedExpected: 0,
      notAssessedExpected: 0,
      photosFound: 0,
      photosMissing: true,
      fieldErrors: null,
      falseFlags: null,
      missed: null,
      ms: Date.now() - started,
      problems: [`${file}: unreadable JSON (${err instanceof Error ? err.message : String(err)})`],
    };
  }
  const { sheet, problems: schemaProblems } = validateSheet(raw, file);
  problems.push(...schemaProblems);
  if (!sheet) {
    return {
      packageId: file, fieldsExpected: 0, suspectedExpected: 0, notAssessedExpected: 0,
      photosFound: 0, photosMissing: true, fieldErrors: null, falseFlags: null, missed: null,
      ms: Date.now() - started, problems,
    };
  }

  // Photos are team-supplied; absence is "pending", never an error count.
  const photosAbs = resolve(casesDir, sheet.photosDir);
  let photosFound = 0;
  let photosMissing = true;
  if (existsSync(photosAbs)) {
    try {
      const entries = readdirSync(photosAbs).filter((e) => !e.startsWith("."));
      photosFound = entries.filter((e) => {
        try {
          return statSync(join(photosAbs, e)).isFile();
        } catch {
          return false;
        }
      }).length;
      photosMissing = photosFound === 0;
    } catch {
      photosMissing = true;
    }
  }

  const suspectedExpected = sheet.expectedFindings.filter((f) => f.result === "suspected_violation").length;
  const notAssessedExpected = sheet.expectedFindings.filter((f) => f.result === "not_assessed").length;

  // Comparison only against a recorded actual-results file; otherwise pending.
  const actual = loadActual(sheet.packageId);
  let fieldErrors: number | null = null;
  let falseFlags: number | null = null;
  let missed: number | null = null;
  if (actual) {
    fieldErrors = 0;
    for (const exp of sheet.expectedDeclarations) {
      const got = (actual.declarations ?? []).find((d) => d.field === exp.field);
      if (!got || normalizeText(got.text) !== normalizeText(exp.text)) fieldErrors += 1;
    }
    const actualByRule = new Map((actual.findings ?? []).map((f) => [f.ruleId, f.result]));
    falseFlags = 0;
    missed = 0;
    for (const exp of sheet.expectedFindings) {
      const got = actualByRule.get(exp.ruleId);
      if (exp.result === "suspected_violation" && got !== "suspected_violation") missed += 1;
      if (exp.result !== "suspected_violation" && got === "suspected_violation") falseFlags += 1;
    }
  }

  return {
    packageId: sheet.packageId,
    fieldsExpected: sheet.expectedDeclarations.length,
    suspectedExpected,
    notAssessedExpected,
    photosFound,
    photosMissing,
    fieldErrors,
    falseFlags,
    missed,
    ms: Date.now() - started,
    problems,
  };
}

function cell(value: number | null): string {
  return value === null ? "pending" : String(value);
}

function printTable(reports: CaseReport[]): void {
  const headers = ["package", "fields", "suspected", "not-assessed", "field-errors", "false-flags", "missed", "photos", "ms"];
  const rows = reports.map((r) => [
    r.packageId,
    String(r.fieldsExpected),
    String(r.suspectedExpected),
    String(r.notAssessedExpected),
    cell(r.fieldErrors),
    cell(r.falseFlags),
    cell(r.missed),
    r.photosMissing ? `pending (0 found)` : `${r.photosFound} found`,
    String(r.ms),
  ]);
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join("  ");
  console.log(line(headers));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const row of rows) console.log(line(row));
}

function printHelp(): void {
  console.log(`NyayaPack benchmark — real-photo answer-sheet runner (issue #11)

Usage:
  npm run benchmark [-- --dir <cases-dir>] [--json] [--help]

Reads benchmark/cases/*.json answer sheets plus optional actual results in
benchmark/results/<packageId>.json and prints a metrics table:
per-field extraction errors, false suspected violations, missed known
issues, not-assessed counts, ms/scan, and packages evaluated.

Photos are team-supplied; a case whose photosDir has no files reports
photos "pending" and leaves comparison columns pending. No accuracy
threshold is claimed — the team has not chosen one.`);
}

export function main(argv: string[] = process.argv.slice(2)): number {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return 0;
  }
  const dirFlag = argv.indexOf("--dir");
  const casesDir = dirFlag >= 0 && argv[dirFlag + 1] ? resolve(argv[dirFlag + 1]) : CASES_DIR;
  const asJson = argv.includes("--json");

  let files: string[] = [];
  try {
    files = readdirSync(casesDir).filter((f) => f.endsWith(".json")).sort();
  } catch {
    console.log(`No cases directory at ${casesDir} — nothing evaluated.`);
    console.log("Add answer sheets per docs/benchmark.md; no threshold is claimed.");
    return 0;
  }
  if (files.length === 0) {
    console.log("No answer sheets found — nothing evaluated. No threshold is claimed.");
    return 0;
  }

  const reports = files.map((f) => evaluateCase(f, casesDir));
  const totalMs = reports.reduce((n, r) => n + r.ms, 0);

  if (asJson) {
    console.log(JSON.stringify({
      packagesEvaluated: reports.length,
      totalMs,
      msPerScan: reports.length > 0 ? Math.round((totalMs / reports.length) * 100) / 100 : 0,
      cases: reports,
      note: "No accuracy threshold: the team has not chosen one.",
    }, null, 2));
    return 0;
  }

  printTable(reports);
  console.log("");
  console.log(`packages evaluated: ${reports.length}`);
  console.log(`total time: ${totalMs} ms (${reports.length > 0 ? (totalMs / reports.length).toFixed(1) : "0.0"} ms/scan)`);
  const pendingPhotos = reports.filter((r) => r.photosMissing).length;
  if (pendingPhotos > 0) {
    console.log(`photos pending (team-supplied): ${pendingPhotos}/${reports.length} cases`);
  }
  const withProblems = reports.filter((r) => r.problems.length > 0);
  for (const r of withProblems) {
    for (const p of r.problems) console.log(`warning: ${p}`);
  }
  console.log("No accuracy threshold is claimed — the team has not chosen one.");
  return 0;
}

const invokedDirectly = (() => {
  try {
    const entry = process.argv[1] ? resolve(process.argv[1]) : "";
    return entry.endsWith(join("scripts", "benchmark.ts")) || entry.endsWith("benchmark.ts");
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  process.exitCode = main();
}
