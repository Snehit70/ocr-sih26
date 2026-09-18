import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Camera,
  CheckCircle2,
  FileText,
  Landmark,
  PhoneCall,
  Ruler,
  Scale,
  ScanLine,
  ShieldCheck,
  Tag,
  UploadCloud,
  Weight,
  XCircle,
} from "lucide-react";

type CheckCard = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  rule: string;
  description: string;
};

const CHECKS: CheckCard[] = [
  {
    icon: Landmark,
    title: "Manufacturer Details",
    rule: "Rule 6(1)(a) • LM PCR 2011",
    description:
      "Name and complete address of the manufacturer, packer or importer declared on the pack.",
  },
  {
    icon: Weight,
    title: "Net Quantity",
    rule: "Rule 6(1)(e) • LM PCR 2011",
    description:
      "Net quantity in standard units (g, kg, ml, L) with prescribed symbols and placement.",
  },
  {
    icon: Tag,
    title: "MRP Declaration",
    rule: "Rule 6(1)(m) • LM PCR 2011",
    description:
      "Maximum Retail Price inclusive of all taxes, prefixed by MRP and rounded correctly.",
  },
  {
    icon: CalendarCheck,
    title: "Manufacturing Date",
    rule: "Rule 6(1)(d) • LM PCR 2011",
    description:
      "Month and year of manufacture, packing or import in a clear, unambiguous format.",
  },
  {
    icon: PhoneCall,
    title: "Consumer Care",
    rule: "Rule 6(1)(f) • LM PCR 2011",
    description:
      "Consumer care name, address, phone and email for complaints and queries.",
  },
  {
    icon: Ruler,
    title: "Font & Readability",
    rule: "Rule 7 • LM PCR 2011",
    description:
      "Minimum letter height based on pack area, contrast and legibility of declarations.",
  },
];

type Stat = { value: string; label: string };

const STATS: Stat[] = [
  { value: "1,284", label: "Packs scanned" },
  { value: "10", label: "Compliance checks" },
  { value: "30 sec", label: "Avg. scan time" },
  { value: "12", label: "States covered" },
];

type ReportRow = {
  label: string;
  status: "pass" | "fail";
  note: string;
};

const REPORT_PREVIEW: ReportRow[] = [
  { label: "Manufacturer details", status: "pass", note: "Rule 6(1)(a)" },
  { label: "Net quantity", status: "pass", note: "500 g declared" },
  { label: "MRP inclusive of taxes", status: "pass", note: "₹145.00" },
  { label: "Consumer care details", status: "fail", note: "Phone missing" },
];

type Step = {
  icon: React.ComponentType<{ className?: string }>;
  step: string;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    icon: UploadCloud,
    step: "Step 1",
    title: "Upload photo",
    description:
      "Take a photo of the pack's label panel or upload an existing image from your device.",
  },
  {
    icon: ScanLine,
    step: "Step 2",
    title: "AI extracts + validates",
    description:
      "OCR extracts declarations and the engine validates each one against LM PCR 2011 rules.",
  },
  {
    icon: FileText,
    step: "Step 3",
    title: "Get PDF report",
    description:
      "Receive a pass/fail report with rule references and download it as a printable PDF.",
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Ministry of Consumer Affairs • SIH 2026
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Scan any pack. Check legal compliance in seconds.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              NyayaPack reads packaged commodity labels and validates every
              mandatory declaration under the Legal Metrology (Packaged
              Commodities) Rules, 2011 — manufacturer, net quantity, MRP,
              dates, consumer care and more.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/scan"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                Start Scan
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                View Dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              LM Act 2009 • PCR 2011 • Demo prototype — not for enforcement use
            </p>
          </div>

          {/* Mock report card preview */}
          <div className="relative">
            <div
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60"
              aria-label="Sample compliance report preview"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white">
                    <Scale className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Compliance Report
                    </p>
                    <p className="text-xs text-slate-500">
                      Sample • Atta 500 g
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-slate-900">92%</p>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Score
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full w-[92%] rounded-full bg-green-500"
                  aria-hidden="true"
                />
              </div>

              <ul className="mt-5 space-y-2.5">
                {REPORT_PREVIEW.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2.5">
                      {row.status === "pass" ? (
                        <CheckCircle2
                          className="h-5 w-5 shrink-0 text-green-600"
                          aria-hidden="true"
                        />
                      ) : (
                        <XCircle
                          className="h-5 w-5 shrink-0 text-red-500"
                          aria-hidden="true"
                        />
                      )}
                      <span>
                        <span className="block text-sm font-medium text-slate-800">
                          {row.label}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {row.note}
                        </span>
                      </span>
                    </span>
                    <span
                      className={
                        row.status === "pass"
                          ? "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700"
                          : "rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700"
                      }
                    >
                      {row.status === "pass" ? "PASS" : "FAIL"}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex gap-2">
                <span className="flex-1 rounded-md bg-slate-900 px-4 py-2 text-center text-xs font-semibold text-white">
                  Download PDF
                </span>
                <span className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-center text-xs font-semibold text-slate-600">
                  View details
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-slate-200 bg-slate-900">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <dt className="order-2 mt-1 text-sm text-slate-400">
                {stat.label}
              </dt>
              <dd className="order-1 text-3xl font-extrabold text-white">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* What we check */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            Coverage
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            What we check
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Six mandatory declaration groups mapped to the exact rules in the
            Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CHECKS.map((check) => (
            <div
              key={check.title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <check.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                {check.title}
              </h3>
              <p className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {check.rule}
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                {check.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
              Process
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              How it works
            </h2>
            <p className="mt-3 text-base text-slate-600">
              From a label photo to an actionable compliance report in three
              steps.
            </p>
          </div>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="relative rounded-xl border border-slate-200 bg-slate-50 p-6"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white">
                  <s.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-blue-700">
                  {s.step}
                </p>
                <h3 className="mt-1 text-base font-bold text-slate-900">
                  {i + 1}. {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {s.description}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800"
            >
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              Try it now — scan a pack
            </Link>
          </div>
        </div>
      </section>

      {/* For enforcement CTA */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-blue-700 px-6 py-12 text-center sm:px-12">
          <ShieldCheck
            className="mx-auto h-10 w-10 text-blue-200"
            aria-hidden="true"
          />
          <h2 className="mx-auto mt-4 max-w-2xl text-2xl font-bold tracking-tight text-white sm:text-3xl">
            For enforcement teams: track violations across markets
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">
            The inspector dashboard aggregates scan results, flags repeat
            offenders and high-risk categories, and exports evidence-ready
            reports for field action.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
            >
              Open Dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/repository"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-blue-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
            >
              Browse Repository
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
