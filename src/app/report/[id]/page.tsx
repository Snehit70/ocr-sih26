"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { jsPDF } from "jspdf";
import {
  ArrowLeft,
  Camera,
  Download,
  FileJson,
  Info,
  LayoutDashboard,
  Loader2,
  Pencil,
  Type,
} from "lucide-react";
import Checklist from "@/components/Checklist";
import { SAMPLE_REPORTS } from "@/lib/mock-data";
import type { OverallStatus, ProductReport } from "@/lib/types";

const STATUS_BADGE: Record<OverallStatus, string> = {
  COMPLIANT: "bg-green-100 text-green-800 ring-green-300",
  NON_COMPLIANT: "bg-red-100 text-red-800 ring-red-300",
  NEEDS_REVIEW: "bg-amber-100 text-amber-800 ring-amber-300",
};

const STATUS_LABEL: Record<OverallStatus, string> = {
  COMPLIANT: "Compliant",
  NON_COMPLIANT: "Non-Compliant",
  NEEDS_REVIEW: "Needs Review",
};

function isReportLike(v: unknown): v is ProductReport {
  if (v === null || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === "string" && Array.isArray(r.checks);
}

const STORE_SENTINEL = "__NYAYAPACK_SERVER__";

function getStoreSnapshot(): string {
  try {
    if (typeof window === "undefined") return STORE_SENTINEL;
    return window.localStorage.getItem("lm_reports") ?? "";
  } catch {
    return "";
  }
}

function subscribeToStore(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function parseSnapshot(
  storeJson: string,
  id: string,
): { report: ProductReport | null; recent: { id: string; imageUrl: string }[] } {
  let found: ProductReport | null = null;
  let recent: { id: string; imageUrl: string }[] = [];
  if (storeJson !== "" && storeJson !== STORE_SENTINEL) {
    try {
      const parsed: unknown = JSON.parse(storeJson);
      if (Array.isArray(parsed)) {
        const list = (parsed as unknown[]).filter(isReportLike);
        found = list.find((r) => r.id === id) ?? null;
        recent = list
          .filter((r) => r.id !== id && r.imageUrl)
          .slice(-4)
          .map((r) => ({ id: r.id, imageUrl: r.imageUrl }));
      }
    } catch {
      // Corrupt store — fall through to samples.
    }
  }
  if (!found && storeJson !== STORE_SENTINEL) {
    try {
      const samples: unknown = SAMPLE_REPORTS as unknown;
      if (Array.isArray(samples)) {
        const list = (samples as unknown[]).filter(isReportLike);
        found = list.find((r) => r.id === id) ?? list[0] ?? null;
      }
    } catch {
      found = null;
    }
  }
  return { report: found, recent };
}

function scoreColor(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = c * (1 - clamped / 100);
  return (
    <div className="relative h-28 w-28 shrink-0" role="img" aria-label={`Compliance score ${clamped} percent`}>
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={scoreColor(clamped)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">{clamped}%</span>
        <span className="text-[11px] font-medium text-slate-500">score</span>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const rawParams = useParams() as unknown as Record<string, string | string[]> | null;
  const id = useMemo(() => {
    const v = rawParams?.id;
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v[0] ?? "";
    return "";
  }, [rawParams]);

  // Browser-only store, read via useSyncExternalStore so the server
  // prerender and the first client render agree (loading skeleton), with
  // the real snapshot applied right after hydration. The render-phase
  // adjustment below re-syncs the editable copy when navigating between
  // report ids without a remount — the documented alternative to an effect.
  const storeJson = useSyncExternalStore(
    subscribeToStore,
    getStoreSnapshot,
    () => STORE_SENTINEL,
  );
  const snapshot = useMemo(() => parseSnapshot(storeJson, id), [storeJson, id]);
  const [prevKey, setPrevKey] = useState<string | null>(null);
  const [report, setReport] = useState<ProductReport | null>(null);
  const syncKey = `${id}::${storeJson}`;
  if (prevKey !== syncKey) {
    setPrevKey(syncKey);
    setReport(snapshot.report);
  }
  const recentThumbs = snapshot.recent;

  function updateDetails(patch: { productName?: string; brand?: string }) {
    setReport((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        productName: patch.productName ?? prev.productName,
        brand: patch.brand ?? prev.brand,
      };
      try {
        const rawStore = window.localStorage.getItem("lm_reports");
        if (rawStore) {
          const parsed: unknown = JSON.parse(rawStore);
          if (Array.isArray(parsed)) {
            const list = (parsed as unknown[]).map((r) =>
              isReportLike(r) && r.id === next.id ? next : r,
            );
            window.localStorage.setItem("lm_reports", JSON.stringify(list));
          }
        }
      } catch {
        // Non-fatal: edits still apply to the on-screen report.
      }
      return next;
    });
  }

  function safeFileBase(): string {
    const base = (report?.productName || "product")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/-+/g, "-")
      .slice(0, 60)
      .replace(/^-|-$/g, "");
    return base || "product";
  }

  function downloadPdf() {
    if (!report) return;
    const doc = new jsPDF();
    const margin = 14;
    let y = 20;
    doc.setFontSize(16);
    doc.text("Packaged Commodity Compliance Report", margin, y);
    y += 9;
    doc.setFontSize(11);
    const headerLines = [
      `Product: ${report.productName}`,
      `Brand: ${report.brand}`,
      `Category: ${report.category}`,
      `Scanned: ${report.scannedAt}`,
      `Overall: ${report.overallStatus} (Score ${report.score}%)`,
      `Panel: ${report.font.panelAreaCm2} cm2 | Required: ${report.font.minRequiredMm} mm | Estimated: ${report.font.estimatedMm} mm`,
    ];
    for (const line of headerLines) {
      doc.text(line, margin, y);
      y += 7;
    }
    y += 3;
    doc.setFontSize(13);
    doc.text("Compliance checks", margin, y);
    y += 7;
    doc.setFontSize(10);
    for (const c of report.checks) {
      const row = `- [${c.status.toUpperCase()}] ${c.label} (${c.ruleRef}): ${c.message}`;
      const wrapped = doc.splitTextToSize(row, 180);
      if (y + wrapped.length * 5 > 285) {
        doc.addPage();
        y = 20;
      }
      doc.text(wrapped, margin, y);
      y += wrapped.length * 5 + 1;
    }
    y += 3;
    doc.setFontSize(10);
    const note = doc.splitTextToSize(`Font note: ${report.font.contrastNote}`, 180);
    if (y + note.length * 5 > 285) {
      doc.addPage();
      y = 20;
    }
    doc.text(note, margin, y);
    doc.save(`${safeFileBase()}-compliance.pdf`);
  }

  function downloadJson() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileBase()}-compliance.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (storeJson === STORE_SENTINEL) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading report…
        </div>
        <div className="mt-4 animate-pulse space-y-4">
          <div className="h-32 rounded-xl bg-slate-200" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="h-64 rounded-xl bg-slate-200 lg:col-span-2" />
            <div className="h-64 rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-bold text-slate-900">Report not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          No report with id &ldquo;{id || "unknown"}&rdquo; exists in this browser or the
          bundled samples.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href="/scan"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to scan
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> View dashboard
          </Link>
        </div>
      </div>
    );
  }

  const passed = report.checks.filter((c) => c.status === "pass").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Nav */}
      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        <Link
          href="/scan"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to scan
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> View dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ScoreRing score={report.score} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${STATUS_BADGE[report.overallStatus]}`}
              >
                {STATUS_LABEL[report.overallStatus]}
              </span>
              <span className="text-xs text-slate-500">
                {passed}/{report.checks.length} checks passed
              </span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                  <Pencil className="h-3 w-3" aria-hidden="true" /> Product name (editable)
                </span>
                <input
                  value={report.productName}
                  onChange={(e) => updateDetails({ productName: e.target.value })}
                  className="mt-0.5 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-lg font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                  <Pencil className="h-3 w-3" aria-hidden="true" /> Brand (editable)
                </span>
                <input
                  value={report.brand}
                  onChange={(e) => updateDetails({ brand: e.target.value })}
                  className="mt-0.5 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {report.category} · Scanned {new Date(report.scannedAt).toLocaleString()} · ID{" "}
              <span className="font-mono">{report.id.slice(0, 8)}</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="no-print mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
          <button
            type="button"
            onClick={downloadPdf}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Download PDF
          </button>
          <button
            type="button"
            onClick={downloadJson}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileJson className="h-4 w-4" aria-hidden="true" /> Download JSON
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Checklist */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Declaration checklist ({report.checks.length})
          </h2>
          <Checklist checks={report.checks} />

          {/* Raw OCR */}
          <details className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">
              Raw OCR text
            </summary>
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-200">
              {report.rawOcrText || "No OCR text stored."}
            </pre>
          </details>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Font analysis */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Type className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Font analysis
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Panel area</dt>
                <dd className="font-semibold text-slate-900">{report.font.panelAreaCm2} cm²</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Required (Table-I)</dt>
                <dd className="font-semibold text-slate-900">{report.font.minRequiredMm} mm</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Estimated</dt>
                <dd className="font-semibold text-slate-900">{report.font.estimatedMm} mm</dd>
              </div>
            </dl>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">Readability</span>
                <span className="font-semibold text-slate-900">{report.font.readabilityScore}%</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${
                    report.font.readabilityScore >= 70
                      ? "bg-green-500"
                      : report.font.readabilityScore >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, report.font.readabilityScore))}%` }}
                />
              </div>
            </div>
            <p className="mt-3 flex items-start gap-1.5 rounded-md bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              {report.font.contrastNote}
            </p>
          </div>

          {/* Evidence */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Camera className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Evidence photos
            </h2>
            {report.imageUrl ? (
              <img
                src={report.imageUrl}
                alt={`${report.productName} label evidence`}
                className="mt-3 max-h-64 w-full rounded-lg border border-slate-200 bg-slate-50 object-contain"
              />
            ) : (
              <div className="mt-3 flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-400">
                No image stored — this report came from sample text.
              </div>
            )}
            {recentThumbs.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-500">Recent uploads</p>
                <div className="mt-1.5 flex gap-2">
                  {recentThumbs.map((t) => (
                    <Link
                      key={t.id}
                      href={`/report/${t.id}`}
                      className="block h-14 w-14 overflow-hidden rounded-md border border-slate-200 hover:border-blue-400"
                    >
                      <img
                        src={t.imageUrl}
                        alt="Recent scan thumbnail"
                        className="h-full w-full object-cover"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
