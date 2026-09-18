"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { OverallStatus, ProductReport } from "@/lib/types";

interface ReportCardProps {
  report: ProductReport;
}

export function statusLabel(status: OverallStatus): string {
  switch (status) {
    case "COMPLIANT":
      return "Compliant";
    case "NON_COMPLIANT":
      return "Non-Compliant";
    case "NEEDS_REVIEW":
      return "Needs Review";
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

function scoreBadge(score: number): string {
  if (score >= 80) return "bg-green-600 text-white";
  if (score >= 50) return "bg-amber-500 text-white";
  return "bg-red-600 text-white";
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

export default function ReportCard({ report }: ReportCardProps) {
  const failed = report.checks
    .filter((c) => c.status === "fail")
    .slice(0, 2);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={report.imageUrl || "/placeholder.svg"}
        alt={report.productName}
        className="h-40 w-full object-cover"
        onError={(e) => {
          if (e.currentTarget.src.endsWith("/placeholder.svg")) return;
          e.currentTarget.src = "/placeholder.svg";
        }}
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900">{report.productName}</h3>
            <p className="text-sm text-gray-500">{report.brand}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${scoreBadge(report.score)}`}
          >
            {report.score}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${statusBadge(report.overallStatus)}`}
          >
            {statusLabel(report.overallStatus)}
          </span>
          <span className="text-gray-400">{formatDate(report.scannedAt)}</span>
        </div>
        {failed.length > 0 ? (
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-red-600">
            {failed.map((check) => (
              <li key={check.id}>{check.label}</li>
            ))}
          </ul>
        ) : null}
        <Link
          href={`/report/${report.id}`}
          className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          View Report <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
