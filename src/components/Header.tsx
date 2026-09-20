"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Scale, X } from "lucide-react";

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Inspection", href: "/scan" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Repository", href: "/repository" },
  { label: "Settings", href: "/settings" },
];

export default function Header() {
  const pathname = usePathname();
  const onScan = pathname === "/scan";
  const [open, setOpen] = useState<boolean>(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

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
            <span className="hidden rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200 sm:inline-block">
              SIH 26034 • DoCA
            </span>
          </span>
        </Link>

        {/* Center: desktop nav */}
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) => {
            const current = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 ${
                  current
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: actions */}
        <div className="hidden items-center gap-2 md:flex">
          {onScan ? null : (
            <Link
              href="/scan"
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800"
            >
              Start an inspection
            </Link>
          )}
        </div>

        {/* Mobile: hamburger */}
        <button
          type="button"
          ref={menuButtonRef}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="app-mobile-nav"
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
          id="app-mobile-nav"
          className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden"
          aria-label="Mobile"
        >
          {NAV_LINKS.map((link) => {
            const current = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={current ? "page" : undefined}
                className={`block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-slate-100 hover:text-slate-900 ${
                  current ? "bg-slate-100 text-slate-900" : "text-slate-700"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {onScan ? null : (
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3">
              <Link
                href="/scan"
                onClick={() => setOpen(false)}
                className="rounded-md bg-blue-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-800"
              >
                Start an inspection
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
