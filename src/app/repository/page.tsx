"use client";

import { useMemo, useState } from "react";
import { Download, PackageSearch, Search } from "lucide-react";
import ReportCard, { statusLabel } from "@/components/ReportCard";
import { SAMPLE_REPORTS } from "@/lib/mock-data";
import type { OverallStatus, ProductReport } from "@/lib/types";

type StatusFilter = "All" | OverallStatus;
type SortKey = "newest" | "oldest" | "score-desc" | "score-asc";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "All", label: "All statuses" },
  { value: "COMPLIANT", label: "Compliant" },
  { value: "NON_COMPLIANT", label: "Non-Compliant" },
  { value: "NEEDS_REVIEW", label: "Needs Review" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function loadLocalReports(): ProductReport[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem("lm_reports");
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is ProductReport =>
        isRecord(r) &&
        typeof r["id"] === "string" &&
        typeof r["productName"] === "string",
    );
  } catch {
    return [];
  }
}

function toCsvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function RepositoryPage() {
  const [localReports] = useState<ProductReport[]>(loadLocalReports);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [category, setCategory] = useState<string>("All");
  const [sort, setSort] = useState<SortKey>("newest");

  const all = useMemo(() => {
    const seen = new Set<string>();
    const out: ProductReport[] = [];
    for (const r of [...localReports, ...SAMPLE_REPORTS]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
    }
    return out;
  }, [localReports]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of all) {
      if (typeof r.category === "string" && r.category.length > 0)
        set.add(r.category);
    }
    return ["All", ...Array.from(set).sort()];
  }, [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = all.filter((r) => {
      if (status !== "All" && r.overallStatus !== status) return false;
      if (category !== "All" && r.category !== category) return false;
      if (
        q &&
        !r.productName.toLowerCase().includes(q) &&
        !r.brand.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    switch (sort) {
      case "newest":
        return [...list].sort(
          (a, b) =>
            new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime(),
        );
      case "oldest":
        return [...list].sort(
          (a, b) =>
            new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime(),
        );
      case "score-desc":
        return [...list].sort((a, b) => b.score - a.score);
      case "score-asc":
        return [...list].sort((a, b) => a.score - b.score);
    }
  }, [all, query, status, category, sort]);

  function exportCsv() {
    const header = ["id", "name", "brand", "status", "score", "date"];
    const rows = filtered.map((r) =>
      [
        r.id,
        r.productName,
        r.brand,
        statusLabel(r.overallStatus),
        r.score,
        new Date(r.scannedAt).toISOString(),
      ]
        .map(toCsvCell)
        .join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "repository-export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Scanned Products Repository
          </h1>
          <p className="text-sm text-gray-500">
            {filtered.length} products found
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or brand…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          aria-label="Filter by category"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "All" ? "All categories" : c}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          aria-label="Sort products"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="score-desc">Highest score</option>
          <option value="score-asc">Lowest score</option>
        </select>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <PackageSearch className="h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-700">No products found</p>
          <p className="text-sm text-gray-500">
            Try adjusting your search or filters.
          </p>
        </div>
      )}
    </div>
  );
}
