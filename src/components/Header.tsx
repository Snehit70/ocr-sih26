"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Scale, X } from "lucide-react";

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Scan", href: "/scan" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Repository", href: "/repository" },
];

export default function Header() {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <header className="no-print sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white">
            <Scale className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-slate-900">
              NyayaPack
            </span>
            <span className="hidden rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-200 sm:inline-block">
              SIH 26034 • DoCA
            </span>
          </span>
        </Link>

        {/* Center: desktop nav */}
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: actions */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Inspector Login
          </Link>
          <Link
            href="/scan"
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800"
          >
            Start Scan
          </Link>
        </div>

        {/* Mobile: hamburger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 md:hidden"
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav
          className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden"
          aria-label="Mobile"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Inspector Login
            </Link>
            <Link
              href="/scan"
              onClick={() => setOpen(false)}
              className="rounded-md bg-blue-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-800"
            >
              Start Scan
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
