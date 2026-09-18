import Link from "next/link";
import { Mail, MapPin, Phone, Scale } from "lucide-react";

const QUICK_LINKS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Scan a Pack", href: "/scan" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Repository", href: "/repository" },
];

export default function Footer() {
  return (
    <footer className="no-print bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        {/* About */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Scale className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold text-white">NyayaPack</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Built for the Ministry of Consumer Affairs, Food &amp; Public
            Distribution — Department of Consumer Affairs (DoCA).
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-400">
            <li>Legal Metrology Act, 2009</li>
            <li>Legal Metrology (Packaged Commodities) Rules, 2011</li>
            <li>Problem Statement SIH 26034</li>
          </ul>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            Quick Links
          </h3>
          <ul className="mt-4 space-y-2.5">
            {QUICK_LINKS.map((link) => (
              <li key={link.href + link.label}>
                <Link
                  href={link.href}
                  className="text-sm text-slate-400 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            Contact
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li className="flex items-start gap-2.5">
              <Phone
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                aria-hidden="true"
              />
              <span>
                DoCA National Consumer Helpline
                <br />
                <span className="font-medium text-slate-200">
                  1800-11-4000 / 1915
                </span>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                aria-hidden="true"
              />
              <span>consumersupport-doca@gov.in</span>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                aria-hidden="true"
              />
              <span>
                Legal Metrology Division, Krishi Bhawan,
                <br />
                New Delhi — 110001
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <p>Prototype for SIH 2026 • Team Demo • Not for enforcement use</p>
          <p>NyayaPack • SIH 26034 • DoCA</p>
        </div>
      </div>
    </footer>
  );
}
