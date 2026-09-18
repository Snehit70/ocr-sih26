import type { ReactNode } from "react";

export type StatCardTone = "green" | "red" | "blue" | "amber";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: string;
  tone?: StatCardTone;
}

const toneStyles: Record<StatCardTone, string> = {
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  tone = "blue",
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        {icon ? (
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneStyles[tone]}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      {subtitle || trend ? (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend ? (
            <span className="font-semibold text-gray-700">{trend}</span>
          ) : null}
          {subtitle ? <span className="text-gray-500">{subtitle}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
