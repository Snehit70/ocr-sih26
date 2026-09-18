"use client";

import { useRef, useState } from "react";
import { FileImage, Upload, X, type LucideIcon } from "lucide-react";

export interface UploadZonePhoto {
  photoId: string;
  url: string;
  name: string;
  face?: string;
}

export interface UploadZoneProps {
  photos: UploadZonePhoto[];
  categoryHint: string;
  onCategoryHintChange: (hint: string) => void;
  onFilesSelect: (files: File[]) => void;
  onRemovePhoto: (photoId: string) => void;
  currentStep: number;
  disabled?: boolean;
}

const STEPS: { label: string; icon: LucideIcon }[] = [
  { label: "Upload", icon: Upload },
  { label: "Analyze", icon: FileImage },
  { label: "Review", icon: FileImage },
  { label: "Confirm", icon: FileImage },
];

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: "food-beverages", label: "Food and beverages" },
  { value: "personal-care", label: "Personal care" },
  { value: "household", label: "Household products" },
  { value: "other", label: "Other" },
];

export default function UploadZone({
  photos,
  categoryHint,
  onCategoryHintChange,
  onFilesSelect,
  onRemovePhoto,
  currentStep,
  disabled = false,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length > 0) onFilesSelect(images);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Progress steps */}
      <ol className="mb-5 flex items-start" aria-label="Inspection progress">
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

      {/* Category select: manual choice wins over model inference (PRD stories 4-6). */}
      <div>
        <label
          htmlFor="category-hint"
          className="block text-sm font-medium text-slate-700"
        >
          Package category
        </label>
        <select
          id="category-hint"
          value={categoryHint}
          disabled={disabled}
          onChange={(e) => onCategoryHintChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 sm:w-72"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Optional. Auto-detect lets the model suggest one; your choice overrides
          the suggestion. The reviewer can still correct it before confirming.
        </p>
      </div>

      {/* Dropzone: multiple photos of the same package. */}
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
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
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
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <Upload className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-slate-900">
          Drag &amp; drop package photos, or click to browse
        </p>
        <p className="text-xs text-slate-500">
          Multiple images allowed — photograph the front, back, and sides of one
          package
        </p>
      </div>

      {/* Previews with remove buttons. */}
      {photos.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700">
            {photos.length} photo{photos.length === 1 ? "" : "s"} in this inspection
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <li
                key={photo.photoId}
                className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
              >
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="h-28 w-full object-cover"
                />
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <span className="flex min-w-0 items-center gap-1 text-xs text-slate-600">
                    <FileImage
                      className="h-3.5 w-3.5 shrink-0 text-slate-400"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {photo.name}
                      {photo.face && photo.face !== "unknown" ? ` · ${photo.face}` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemovePhoto(photo.photoId)}
                    aria-label={`Remove ${photo.name}`}
                    className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
