"use client";

import { useMemo, useRef, useState } from "react";
import {
  ClipboardCheck,
  Cookie,
  FileCheck,
  FileImage,
  Package,
  ScanText,
  Sparkles,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { SAMPLE_OCR as RAW_SAMPLES } from "@/lib/mock-data";

export interface OcrSample {
  key: string;
  label: string;
  hint: string;
  text: string;
}

export interface UploadZoneProps {
  panelArea: number;
  onPanelAreaChange: (value: number) => void;
  onFileSelect: (file: File, previewUrl: string) => void;
  onSampleSelect: (text: string, label: string) => void;
  currentStep: number;
  disabled?: boolean;
  onClear?: () => void;
}

const STEPS: { label: string; icon: LucideIcon }[] = [
  { label: "Upload", icon: Upload },
  { label: "OCR", icon: ScanText },
  { label: "Validate", icon: ClipboardCheck },
  { label: "Report", icon: FileCheck },
];

const SAMPLE_ICONS: LucideIcon[] = [Cookie, Package, Sparkles];

export const FALLBACK_SAMPLES: OcrSample[] = [
  {
    key: "biscuit",
    label: "Compliant Biscuit",
    hint: "All declarations present",
    text: [
      "SunFeast Gold Glucose Biscuits",
      "ITC Limited, Virginia House, Kolkata 700001",
      "Net Quantity: 300 g (12 N x 25 g)",
      "MRP Rs. 45.00 (Inclusive of all taxes)",
      "Unit Sale Price: Rs. 0.15 per g",
      "Mfg Date: 02/2026   Exp Date: 08/2026",
      "Batch No: BNG2145",
      "Customer Care: 1800-425-4444, itccares@itc.in",
      "FSSAI Lic No. 10012043001234",
      "Country of Origin: India",
    ].join("\n"),
  },
  {
    key: "chips",
    label: "Missing MRP Chips",
    hint: "MRP declaration absent",
    text: [
      "Lay's Magic Masala Potato Chips",
      "PepsiCo India Holdings, Gurugram, Haryana",
      "Net Quantity: 73 g",
      "Mfg Date: 01/2026",
      "Best Before 4 Months from Manufacture",
      "Batch No: CHD5520",
      "Customer Care: 1800-208-8888",
      "FSSAI Lic No. 10012043000987",
      "Country of Origin: India",
    ].join("\n"),
  },
  {
    key: "soap",
    label: "Small Font Soap",
    hint: "Lettering below Table-I minimum",
    text: [
      "Mysore Sandal Soap",
      "Karnataka Soaps & Detergents Ltd, Bengaluru",
      "Net Quantity: 150 g",
      "MRP Rs. 58.00 (Inclusive of all taxes)",
      "Mfg Date: 12/2025   Batch No: MYS8821",
      "Customer Care: 1800-419-0066",
      "Country of Origin: India",
    ].join("\n"),
  },
];

function resolveSamples(): OcrSample[] {
  try {
    const raw: unknown = RAW_SAMPLES as unknown;
    if (typeof raw === "string" && raw.trim().length > 0) {
      return [{ ...FALLBACK_SAMPLES[0], text: raw }];
    }
    if (Array.isArray(raw)) {
      const texts = (raw as unknown[])
        .map((v) => String(v ?? ""))
        .filter((s) => s.trim().length > 0);
      if (texts.length > 0) {
        return FALLBACK_SAMPLES.map((s, i) => ({
          ...s,
          text: texts[i % texts.length],
        }));
      }
    }
    if (raw !== null && typeof raw === "object") {
      const record = raw as Record<string, unknown>;
      const keys = Object.keys(record);
      const values = keys
        .map((k) => String(record[k] ?? ""))
        .filter((s) => s.trim().length > 0);
      if (values.length > 0) {
        return FALLBACK_SAMPLES.map((s, i) => ({
          ...s,
          key: keys[i] ?? s.key,
          text: values[i % values.length],
        }));
      }
    }
  } catch {
    // Fall through to built-in samples.
  }
  return FALLBACK_SAMPLES;
}

export default function UploadZone({
  panelArea,
  onPanelAreaChange,
  onFileSelect,
  onSampleSelect,
  currentStep,
  disabled = false,
  onClear,
}: UploadZoneProps) {
  const samples = useMemo(() => resolveSamples(), []);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;
    if (thumb && thumb.startsWith("blob:")) URL.revokeObjectURL(thumb);
    const url = URL.createObjectURL(file);
    setThumb(url);
    setFileName(file.name);
    onFileSelect(file, url);
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    if (thumb && thumb.startsWith("blob:")) URL.revokeObjectURL(thumb);
    setThumb(null);
    setFileName(null);
    onClear?.();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Progress steps */}
      <ol className="mb-5 flex items-start" aria-label="Scan pipeline progress">
        {STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          const Icon = step.icon;
          return (
            <li
              key={step.label}
              className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                    done
                      ? "border-green-500 bg-green-500 text-white"
                      : active
                        ? "animate-pulse border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span
                  className={`text-[11px] font-medium sm:text-xs ${
                    done || active ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-1 mb-6 h-0.5 flex-1 rounded sm:mx-2 ${
                    done ? "bg-green-500" : "bg-slate-200"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
            : dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {thumb ? (
          <div className="flex items-center gap-3">
            <img
              src={thumb}
              alt="Label preview thumbnail"
              className="h-20 w-20 rounded-md border border-slate-200 object-cover"
            />
            <div className="text-left">
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                <FileImage className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span className="max-w-40 truncate sm:max-w-56">{fileName ?? "label.jpg"}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Click or drop to replace</p>
              <button
                type="button"
                onClick={handleRemove}
                className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" /> Remove
              </button>
            </div>
          </div>
        ) : (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Upload className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-slate-900">
              Drag &amp; drop a label photo, or click to browse
            </p>
            <p className="text-xs text-slate-500">Accepts image/* — front or back of pack</p>
          </>
        )}
      </div>

      {/* Panel area */}
      <div className="mt-4">
        <label
          htmlFor="panel-area"
          className="block text-sm font-medium text-slate-700"
        >
          Principal display panel area
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id="panel-area"
            type="number"
            min={1}
            step={1}
            value={panelArea}
            disabled={disabled}
            onChange={(e) => onPanelAreaChange(Number(e.target.value))}
            className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
          />
          <span className="text-sm text-slate-500">cm²</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Used for the Table-I minimum font-size lookup.
        </p>
      </div>

      {/* Samples */}
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-700">No photo handy? Try a sample label</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {samples.map((s, i) => {
            const Icon = SAMPLE_ICONS[i % SAMPLE_ICONS.length];
            return (
              <button
                key={s.key}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (thumb && thumb.startsWith("blob:")) URL.revokeObjectURL(thumb);
                  setThumb(null);
                  setFileName(null);
                  onSampleSelect(s.text, s.label);
                }}
                className="flex flex-col items-start gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition-colors hover:border-blue-400 hover:bg-blue-50/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <Icon className="h-4 w-4 text-blue-700" aria-hidden="true" />
                  {s.label}
                </span>
                <span className="text-xs text-slate-500">{s.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
