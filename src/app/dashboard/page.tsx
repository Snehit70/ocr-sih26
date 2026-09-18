"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
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
import { statusLabel } from "@/components/ReportCard";
import { DASHBOARD_STATS, SAMPLE_REPORTS } from "@/lib/mock-data";
import type { OverallStatus, ProductReport } from "@/lib/types";

const PIE_COLORS = ["#16a34a", "#dc2626"];

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

function statusBadge(status: OverallStatus): string {
  switch (status) {
    case "COMPLIANT":
      return "bg-green-100 text-green-800";
    case "NON_COMPLIANT":
      return "bg-red-100 text-red-800";
    case "NEEDS_REVIEW":
      return "bg-amber-100 text-amber-800";
  }
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const [localReports] = useState<ProductReport[]>(loadLocalReports);
  const [query, setQuery] = useState("");

  const merged = useMemo(() => {
    const seen = new Set<string>();
    const out: ProductReport[] = [];
    for (const r of [...localReports, ...SAMPLE_REPORTS]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
    }
    return out;
  }, [localReports]);

  const stats = useMemo(() => {
    const localCompliant = localReports.filter(
      (r) => r.overallStatus === "COMPLIANT",
    ).length;
    const localViolations = localReports.filter(
      (r) => r.overallStatus === "NON_COMPLIANT",
    ).length;
    const localPending = localReports.filter(
      (r) => r.overallStatus === "NEEDS_REVIEW",
    ).length;

    const total = DASHBOARD_STATS.totalScans + localReports.length;
    const compliant = DASHBOARD_STATS.compliant + localCompliant;
    const violations = DASHBOARD_STATS.nonCompliant + localViolations;
    const pending = DASHBOARD_STATS.pending + localPending;
    const compliantPct =
      total > 0 ? Math.round((compliant / total) * 100) : 0;

    return { total, compliant, violations, pending, compliantPct };
  }, [localReports]);

  const pieData = useMemo(
    () => [
      { name: "Compliant", value: stats.compliant },
      {
        name: "Non-Compliant",
        value: Math.max(stats.total - stats.compliant, 0),
      },
    ],
    [stats],
  );

  const recent = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? merged.filter((r) => r.productName.toLowerCase().includes(q))
      : merged;
    return [...filtered]
      .sort(
        (a, b) =>
          new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime(),
      )
      .slice(0, 8);
  }, [merged, query]);

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
            Department of Consumer Affairs (DoCA) — Legal Metrology
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-800">
            <ShieldCheck className="h-4 w-4" /> Inspector Login
          </span>
          <span className="text-gray-500">{today}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Scans"
          value={stats.total}
          subtitle="all inspections"
          icon={<ScanLine className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          title="Compliant %"
          value={`${stats.compliantPct}%`}
          subtitle="of total scans"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          title="Violations"
          value={stats.violations}
          subtitle="non-compliant"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
        />
        <StatCard
          title="Pending Review"
          value={stats.pending}
          subtitle="awaiting officer"
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold text-gray-900">
            Violations by Type
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={DASHBOARD_STATS.violationsByType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold text-gray-900">
            Compliance Split
          </h2>
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
              placeholder="Filter by product…"
              className="rounded-lg border border-gray-300 py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2 pr-4 font-medium">Product</th>
                <th className="py-2 pr-4 font-medium">Brand</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Score</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium text-gray-900">
                    {r.productName}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{r.brand}</td>
                  <td className="py-2 pr-4 text-gray-600">
                    {formatDate(r.scannedAt)}
                  </td>
                  <td className="py-2 pr-4 font-semibold">{r.score}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(r.overallStatus)}`}
                    >
                      {statusLabel(r.overallStatus)}
                    </span>
                  </td>
                  <td className="py-2">
                    <Link
                      href={`/report/${r.id}`}
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
      </div>
    </div>
  );
}
