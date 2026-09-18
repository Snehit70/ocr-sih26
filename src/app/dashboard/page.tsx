"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  ScanLine,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "@/components/StatCard";
import {
  headlineFromLegacyStatus,
  headlineFromResults,
  normalizeHeadline,
  resolveEntryHeadline,
  resolveRealHeadline,
  type RealHeadline,
} from "@/lib/headlines";
import {
  isStorageAvailable,
  listInspections,
  listLegacyReports,
} from "@/lib/store";
import type { InspectionRecord, LegacyReportRef } from "@/lib/store";
import type { ReportHeadline } from "@/lib/types";

const PIE_COLORS = ["#16a34a", "#dc2626", "#d97706"];

type UnifiedEntry = {
  key: string;
  kind: "inspection" | "legacy";
  title: string;
  subtitle: string;
  category: string;
  createdAt: string;
  headline: ReportHeadline;
  /** True until the reviewer confirms (review sidecar confirmedAt null). */
  isDraft: boolean;
  photoCount: number;
  evidenceUnavailable: boolean;
  /** Restorable legacy image URL (http/data:). Null for inspections (Blob URLs) or unrestorable legacy. */
  imageUrl: string | null;
  reportId: string;
  statusNote: string;
  violationLabels: string[];
};

function violationLabelsFromHonestResults(results: unknown): string[] {
  if (!Array.isArray(results)) return [];
  const out: string[] = [];
  for (const item of results) {
    if (item === null || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (rec.result !== "suspected_violation") continue;
    const label =
      typeof rec.label === "string" && rec.label.trim().length > 0
        ? rec.label.trim()
        : typeof rec.ruleId === "string" && rec.ruleId.length > 0
          ? rec.ruleId
          : null;
    if (label) out.push(label);
  }
  return out;
}

/**
 * Headline + violation labels for a real IndexedDB inspection. When review
 * state exists, the headline and labels come from the real cited-rules
 * evaluation (`resolveRealHeadline`); otherwise the shared tolerant
 * resolution applies (honestly "insufficient evidence"). The numeric
 * internal score is never read here.
 */
function resolveInspectionHeadline(
  record: InspectionRecord,
  real?: RealHeadline | null,
): {
  headline: ReportHeadline;
  violationLabels: string[];
  isDraft: boolean;
} {
  if (real) {
    return {
      headline: real.headline,
      violationLabels: violationLabelsFromHonestResults(real.results),
      isDraft: real.isDraft,
    };
  }
  const headline = resolveEntryHeadline(record);
  const rec = record as unknown as Record<string, unknown>;
  const labels: string[] = [];
  for (const key of ["ruleResults", "results", "rule_results"]) {
    labels.push(...violationLabelsFromHonestResults(rec[key]));
  }
  const checks = rec["checks"];
  if (Array.isArray(checks)) {
    labels.push(...violationLabelsFromHonestResults(checks));
    for (const item of checks) {
      if (item === null || typeof item !== "object") continue;
      const c = item as Record<string, unknown>;
      if (c["status"] === "fail" && typeof c["label"] === "string" && c["label"].trim()) {
        labels.push(c["label"].trim());
      }
    }
  }
  return { headline, violationLabels: labels, isDraft: false };
}

function inspectionToEntry(record: InspectionRecord, real?: RealHeadline | null): UnifiedEntry {
  const { headline, violationLabels, isDraft } = resolveInspectionHeadline(record, real);
  const short = record.inspectionId.slice(0, 8);
  return {
    key: `inspection:${record.inspectionId}`,
    kind: "inspection",
    title: `Inspection ${short}`,
    subtitle: `${record.photos.length} photo${record.photos.length === 1 ? "" : "s"} · ${record.status}`,
    category:
      typeof record.categoryHint === "string" && record.categoryHint.length > 0
        ? record.categoryHint
        : "unknown",
    createdAt: record.createdAt,
    headline,
    isDraft,
    photoCount: record.photos.length,
    evidenceUnavailable: record.photos.length === 0,
    imageUrl: null,
    reportId: record.inspectionId,
    statusNote: record.status,
    violationLabels,
  };
}

function legacyToEntry(ref: LegacyReportRef): UnifiedEntry {
  const raw =
    ref.raw !== null && typeof ref.raw === "object"
      ? (ref.raw as Record<string, unknown>)
      : {};
  const explicit =
    normalizeHeadline(raw["headline"]) ??
    normalizeHeadline(raw["reportHeadline"]) ??
    normalizeHeadline(raw["overallHeadline"]);
  const honest = headlineFromResults(raw["ruleResults"] ?? raw["results"]);
  const legacyMapped = headlineFromLegacyStatus(raw["overallStatus"]);
  const headline = explicit ?? honest ?? legacyMapped ?? "insufficient evidence";

  const violationLabels: string[] = [...violationLabelsFromHonestResults(raw["ruleResults"] ?? raw["results"])];
  const checks = raw["checks"];
  if (Array.isArray(checks)) {
    violationLabels.push(...violationLabelsFromHonestResults(checks));
    for (const item of checks) {
      if (item === null || typeof item !== "object") continue;
      const c = item as Record<string, unknown>;
      if (c["status"] === "fail" && typeof c["label"] === "string" && c["label"].trim()) {
        violationLabels.push(c["label"].trim());
      }
    }
  }

  const category = typeof raw["category"] === "string" && raw["category"].length > 0 ? raw["category"] : "legacy";
  const createdAt =
    typeof ref.scannedAt === "string" && ref.scannedAt.length > 0
      ? ref.scannedAt
      : typeof raw["scannedAt"] === "string"
        ? (raw["scannedAt"] as string)
        : "";
  return {
    key: `legacy:${ref.id}`,
    kind: "legacy",
    title: ref.productName,
    subtitle: ref.brand,
    category,
    createdAt,
    headline,
    isDraft: false,
    photoCount: ref.evidenceUnavailable ? 0 : 1,
    evidenceUnavailable: ref.evidenceUnavailable,
    imageUrl: ref.evidenceUnavailable ? null : ref.imageUrl || null,
    reportId: ref.id,
    statusNote: "legacy report",
    violationLabels,
  };
}

function headlineBadge(headline: ReportHeadline): string {
  switch (headline) {
    case "suspected violation":
      return "bg-red-100 text-red-800";
    case "no issue found in assessed checks":
      return "bg-green-100 text-green-800";
    case "insufficient evidence":
      return "bg-amber-100 text-amber-800";
  }
}

function formatDate(value: string): string {
  if (!value) return "date unknown";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "date unknown";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function createdAtTime(value: string): number {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export default function DashboardPage() {
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [legacy, setLegacy] = useState<LegacyReportRef[]>([]);
  const [realHeadlines, setRealHeadlines] = useState<Record<string, RealHeadline>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!isStorageAvailable()) {
          if (!cancelled) {
            setInspections([]);
            setRealHeadlines({});
            setLegacy(listLegacyReports());
            setLoadError(
              "Browser storage (IndexedDB) is unavailable, so saved inspections cannot be listed on this device.",
            );
          }
          return;
        }
        const records = await listInspections();
        // Real per-record headlines from reviewer state (sync localStorage
        // reads resolved here so the loading state below covers them).
        const headlines: Record<string, RealHeadline> = {};
        for (const record of records) {
          try {
            const real = resolveRealHeadline(record.inspectionId, record.photos.length);
            if (real) headlines[record.inspectionId] = real;
          } catch {
            // One unreadable review must not hide the inspection; it falls
            // back to "insufficient evidence" below.
          }
        }
        if (!cancelled) {
          setInspections(records);
          setRealHeadlines(headlines);
          setLegacy(listLegacyReports());
        }
      } catch (err) {
        if (!cancelled) {
          setInspections([]);
          setRealHeadlines({});
          try {
            setLegacy(listLegacyReports());
          } catch {
            setLegacy([]);
          }
          setLoadError(
            err instanceof Error ? err.message : "Could not list saved inspections.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const inspectionEntries = useMemo<UnifiedEntry[]>(
    () => inspections.map((record) => inspectionToEntry(record, realHeadlines[record.inspectionId] ?? null)),
    [inspections, realHeadlines],
  );

  const legacyEntries = useMemo<UnifiedEntry[]>(
    () => legacy.map(legacyToEntry),
    [legacy],
  );

  // Totals, charts, and recent views describe IndexedDB inspections ONLY.
  // Legacy lm_reports entries are excluded and shown separately below.
  const stats = useMemo(() => {
    const total = inspectionEntries.length;
    const suspected = inspectionEntries.filter((e) => e.headline === "suspected violation").length;
    const noIssue = inspectionEntries.filter((e) => e.headline === "no issue found in assessed checks").length;
    const insufficient = inspectionEntries.filter((e) => e.headline === "insufficient evidence").length;
    return { total, suspected, noIssue, insufficient };
  }, [inspectionEntries]);

  const pieData = useMemo(
    () => [
      { name: "No issue found", value: stats.noIssue },
      { name: "Suspected violation", value: stats.suspected },
      { name: "Insufficient evidence", value: stats.insufficient },
    ],
    [stats],
  );

  const violationsByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of inspectionEntries) {
      for (const label of entry.violationLabels) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [inspectionEntries]);

  const recent = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? inspectionEntries.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.subtitle.toLowerCase().includes(q) ||
            e.category.toLowerCase().includes(q) ||
            e.reportId.toLowerCase().includes(q) ||
            e.headline.toLowerCase().includes(q),
        )
      : inspectionEntries;
    return [...filtered]
      .sort((a, b) => createdAtTime(b.createdAt) - createdAtTime(a.createdAt))
      .slice(0, 8);
  }, [inspectionEntries, query]);

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Enforcement Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Department of Consumer Affairs (DoCA) — Legal Metrology · real inspections only
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-800">
            <ShieldCheck className="h-4 w-4" /> Inspector Login
          </span>
          <span className="text-gray-500">{today}</span>
        </div>
      </div>

      {loading ? (
        <div
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading saved inspections…
        </div>
      ) : null}

      {loadError && !loading ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total inspections"
          value={loading ? "…" : stats.total}
          subtitle="real saved records"
          icon={<ScanLine className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          title="Suspected violations"
          value={loading ? "…" : stats.suspected}
          subtitle="awaiting reviewer decision"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
        />
        <StatCard
          title="No issue found"
          value={loading ? "…" : stats.noIssue}
          subtitle="in assessed checks"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          title="Insufficient evidence"
          value={loading ? "…" : stats.insufficient}
          subtitle="not assessed — needs review"
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold text-gray-900">
            Suspected violations by check
          </h2>
          {loading ? (
            <p className="flex items-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…
            </p>
          ) : violationsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={violationsByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} interval={0} angle={-12} dy={8} height={60} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-gray-500">
              No suspected violations recorded in saved inspections yet.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold text-gray-900">
            Headline split
          </h2>
          {loading ? (
            <p className="flex items-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…
            </p>
          ) : stats.total > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-gray-500">
              Nothing scanned yet — headlines will appear here after the first inspection.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">Recent Inspections</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name, ID, or category…"
              className="rounded-lg border border-gray-300 py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
        {loading ? (
          <p className="flex items-center gap-2 py-6 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading saved inspections…
          </p>
        ) : inspectionEntries.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-medium text-gray-700">No inspections yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
              Nothing has been scanned on this laptop. Photograph a package to create the first
              real inspection — no sample data is shown here.
            </p>
            <Link
              href="/scan"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              <ScanLine className="h-4 w-4" /> Start an inspection
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="py-2 pr-4 font-medium">Inspection</th>
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Photos</th>
                  <th className="py-2 pr-4 font-medium">Headline</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((e) => (
                  <tr key={e.key} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <span className="block font-medium text-gray-900">{e.title}</span>
                      <span className="block text-xs text-gray-500">{e.subtitle}</span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{e.category}</td>
                    <td className="py-2 pr-4 text-gray-600">
                      {formatDate(e.createdAt)}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      {e.evidenceUnavailable ? (
                        <span className="text-xs font-medium text-amber-700">
                          evidence unavailable
                        </span>
                      ) : (
                        <span>
                          {e.photoCount} photo{e.photoCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${headlineBadge(e.headline)}`}
                      >
                        {e.headline}
                      </span>
                      {e.isDraft ? (
                        <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-300">
                          Draft
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/report/${e.reportId}`}
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      No inspections match your filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-gray-400">
          Headlines only — no issue found in assessed checks, suspected violation, or insufficient
          evidence. The internal test score is never shown as a compliance result.
        </p>
      </div>

      {!loading && legacyEntries.length > 0 && (
        <section
          aria-label="Older browser records"
          className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 shadow-sm"
        >
          <h2 className="font-semibold text-gray-900">
            Older browser records (evidence unavailable)
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {legacyEntries.length} older {legacyEntries.length === 1 ? "record" : "records"} from
            a previous app version. Their photographs cannot be restored after a reload, so they
            are excluded from the totals and charts above.
          </p>
          <ul className="mt-3 space-y-2">
            {legacyEntries.map((e) => (
              <li
                key={e.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900">{e.title}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {e.subtitle} · {formatDate(e.createdAt)} · evidence unavailable
                  </span>
                </span>
                <Link
                  href={`/report/${e.reportId}`}
                  className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="h-3.5 w-3.5" /> View
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
