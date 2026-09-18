"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import UploadZone, { type UploadZonePhoto } from "@/components/UploadZone";
import ReviewPanel, {
  buildReviewedInputs,
  type ReviewState,
} from "@/components/ReviewPanel";
import { photoBlobToJpegDataUrl } from "@/lib/image";
import { saveReview } from "@/lib/review-store";
import { analyzePackage, ModelClientError } from "@/lib/model-client";
import type { ExtractionResult } from "@/lib/observations";
import { computeHeadline, evaluateRules } from "@/lib/rules";
import {
  addPhotos,
  createInspection,
  removePhoto,
  saveInspection,
} from "@/lib/store";
import type { InspectionRecord } from "@/lib/store";
import type { CategoryHint } from "@/lib/store";
import type { ImportStatus, ReportHeadline, RuleResult } from "@/lib/types";

/** Store-hint value -> display label for the model prompt. */
function hintToModelLabel(hint: string): string {
  switch (hint) {
    case "food-beverages":
      return "Food and beverages";
    case "personal-care":
      return "Personal care";
    case "household":
      return "Household products";
    case "other":
      return "Other";
    default:
      return "Auto-detect";
  }
}

/**
 * Resolve the rules-context category in store-hint form. A manual hint wins;
 * otherwise a confident model suggestion maps back to hint form; anything
 * else stays "unknown" (the rules engine treats hyphenated broad hints and
 * "unknown" as unsettled for the date check — see rules.ts).
 */
function toCtxCategory(
  manualHint: string,
  suggestion: string | null,
  uncertain: boolean,
): string {
  if (manualHint && manualHint !== "auto") return manualHint;
  if (!uncertain && suggestion) {
    const n = suggestion
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
    if (n.includes("food")) return "food-beverages";
    if (n.includes("personal") || n.includes("cosmet")) return "personal-care";
    if (n.includes("household")) return "household";
    if (n === "other") return "other";
  }
  return "unknown";
}

export default function ScanPage() {
  const router = useRouter();
  const urlsRef = useRef<Record<string, string>>({});

  const [record, setRecord] = useState<InspectionRecord | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [hint, setHint] = useState<string>("auto");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [ruleResults, setRuleResults] = useState<RuleResult[]>([]);
  const [headline, setHeadline] = useState<ReportHeadline>("insufficient evidence");
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  // One inspection per page visit; photos persist in IndexedDB on every
  // add/remove so a reload never loses the evidence.
  useEffect(() => {
    let cancelled = false;
    createInspection()
      .then((created) => {
        if (!cancelled) setRecord(created);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? `Browser storage is unavailable — photos cannot be saved. (${err.message})`
              : "Browser storage is unavailable — photos cannot be saved.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Revoke preview URLs on unmount.
  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const url of Object.values(urls)) URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    urlsRef.current = photoUrls;
  }, [photoUrls]);

  const uploadPhotos: UploadZonePhoto[] = useMemo(() => {
    if (!record) return [];
    const faces = new Map(
      (extraction?.photoFaces ?? []).map((face) => [face.photoId, face.face] as const),
    );
    return record.photos.map((photo) => ({
      photoId: photo.photoId,
      url: photoUrls[photo.photoId] ?? "",
      name: photo.name,
      face: faces.get(photo.photoId),
    }));
  }, [record, photoUrls, extraction]);

  function resetAnalysis(reason: string) {
    setExtraction(null);
    setReview(null);
    setRuleResults([]);
    setHeadline("insufficient evidence");
    setConfirmedAt(null);
    setNotice(reason);
  }

  function handleHintChange(next: string) {
    setHint(next);
    if (record) {
      const updated = { ...record, categoryHint: next as CategoryHint };
      setRecord(updated);
      // Changing the category invalidates the analysis it was based on.
      if (extraction) resetAnalysis("Category changed — run the analysis again.");
      saveInspection(updated).catch(() => {
        // Non-fatal: the in-memory record still drives this session.
      });
    }
  }

  async function handleFilesSelect(files: File[]) {
    if (!record || analyzing || confirming) return;
    setError(null);
    try {
      const added = await addPhotos(record.inspectionId, files);
      const urls: Record<string, string> = {};
      for (const photo of added.photos) {
        urls[photo.photoId] = URL.createObjectURL(photo.blob);
      }
      setPhotoUrls((prev) => ({ ...prev, ...urls }));
      setRecord((prev) =>
        prev
          ? { ...prev, photos: [...prev.photos, ...added.photos], updatedAt: added.updatedAt }
          : prev,
      );
      if (extraction) {
        resetAnalysis("Photos changed — run the analysis again on the new set.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Photos were not saved. (${err.message})`
          : "Photos were not saved.",
      );
    }
  }

  async function handleRemovePhoto(photoId: string) {
    if (!record || analyzing || confirming) return;
    setError(null);
    try {
      const updated = await removePhoto(record.inspectionId, photoId);
      const url = photoUrls[photoId];
      if (url) URL.revokeObjectURL(url);
      setPhotoUrls((prev) => {
        const next = { ...prev };
        delete next[photoId];
        return next;
      });
      setRecord(updated);
      if (extraction) {
        resetAnalysis("Photos changed — run the analysis again on the new set.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Photo was not removed. (${err.message})`
          : "Photo was not removed.",
      );
    }
  }

  function runRules(
    observations: ExtractionResult["observations"],
    correctedTexts: Record<string, string>,
    category: string,
    importStatus: ImportStatus,
    coverageConfirmed: boolean,
    photoCount: number,
  ): { results: RuleResult[]; headline: ReportHeadline } {
    const inputs = buildReviewedInputs(observations, correctedTexts);
    const results = evaluateRules(inputs, {
      category,
      importStatus,
      coverageConfirmed,
      photoCount,
    });
    return { results, headline: computeHeadline(results) };
  }

  function persistReviewPayload(
    inspectionId: string,
    parsed: ExtractionResult,
    state: ReviewState,
    confirmedAtValue: string | null,
  ) {
    saveReview(inspectionId, {
      observations: parsed.observations,
      correctedTexts: state.correctedTexts,
      reviewedCategory: state.reviewedCategory,
      reviewedImport: state.reviewedImport,
      coverageConfirmed: state.coverageConfirmed,
      decisions: state.decisions,
      confirmedAt: confirmedAtValue,
      productName: state.productName || parsed.identity.productName,
      brand: state.brand || parsed.identity.brand,
      photoFaces: parsed.photoFaces,
      samePackage: parsed.identity.samePackage,
      mismatchNote: parsed.identity.mismatchNote,
    });
  }

  async function handleAnalyze() {
    if (!record || analyzing || confirming) return;
    if (record.photos.length === 0) {
      setError("Upload at least one package photo first.");
      return;
    }
    setError(null);
    setNotice(null);
    setAnalyzing(true);
    setAnalyzeProgress(
      record.photos.length > 1
        ? `Analyzing photo 1 of ${record.photos.length}…`
        : "Analyzing photo…",
    );
    try {
      // Real upload bytes -> normalized JPEG data URLs -> vision model.
      // Originals stay untouched in IndexedDB; only the transmitted copy is
      // re-encoded (phone HEIC/WebP fail server-side otherwise). No fallback text.
      // Each photograph is analysed on its own, then merged, so a front face
      // (brand/product) is not dropped when a back face carries the legal block.
      const modelPhotos = [];
      for (const photo of record.photos) {
        modelPhotos.push({ id: photo.photoId, dataUrl: await photoBlobToJpegDataUrl(photo.blob) });
      }
      const parsed = await analyzePackage(modelPhotos, hintToModelLabel(hint), {
        onProgress: (done, total) => {
          if (done < total) setAnalyzeProgress(`Analyzing photo ${done + 1} of ${total}…`);
          else setAnalyzeProgress("Combining photographs…");
        },
      });

      const hasIdentity = Boolean(parsed.identity.brand || parsed.identity.productName);
      const anyAttested = parsed.unattestedPhotoIds.length < record.photos.length;
      if (parsed.observations.length === 0 && !hasIdentity && !anyAttested) {
        setError(
          "The model looked at these photos but found no readable package identity or declarations. No report was created — try clearer, well-lit views of the front and the information panel, then run the analysis again.",
        );
        return;
      }

      const ctxCategory = toCtxCategory(hint, parsed.categorySuggestion, parsed.categoryUncertain);
      const initialReview: ReviewState = {
        correctedTexts: {},
        reviewedCategory: ctxCategory,
        reviewedImport: parsed.importSuggestion,
        coverageConfirmed: false,
        decisions: {},
        productName: parsed.identity.productName ?? "",
        brand: parsed.identity.brand ?? "",
        samePackageConfirmed: false,
      };
      // Draft evaluation: coverage unconfirmed, so nothing can be called
      // missing yet — absent declarations stay "not assessed".
      const { results, headline: draftHeadline } = runRules(
        parsed.observations,
        {},
        ctxCategory,
        parsed.importSuggestion,
        false,
        record.photos.length,
      );
      setExtraction(parsed);
      setReview(initialReview);
      setRuleResults(results);
      setHeadline(draftHeadline);
      setConfirmedAt(null);

      const analyzed = await saveInspection({
        ...record,
        categoryHint: hint as CategoryHint,
        status: "analyzed",
      });
      setRecord(analyzed);
      persistReviewPayload(record.inspectionId, parsed, initialReview, null);
    } catch (err) {
      // ModelClientError carries the honest server/connectivity reason.
      // No report is created and there is no navigation.
      if (err instanceof ModelClientError) setError(`${err.message} No report was created.`);
      else if (err instanceof Error) setError(`${err.message} No report was created.`);
      else setError("Analysis failed unexpectedly. No report was created.");
    } finally {
      setAnalyzing(false);
      setAnalyzeProgress(null);
    }
  }

  function handleReviewChange(next: ReviewState) {
    if (!record || !extraction) return;
    setReview(next);
    // Re-run rules on every reviewer change; coverage=true only after the
    // reviewer checks the box, so missing requires coverage.
    const { results, headline: nextHeadline } = runRules(
      extraction.observations,
      next.correctedTexts,
      next.reviewedCategory,
      next.reviewedImport,
      next.coverageConfirmed,
      record.photos.length,
    );
    setRuleResults(results);
    setHeadline(nextHeadline);
    persistReviewPayload(record.inspectionId, extraction, next, null);
  }

  const confirmBlockers = useMemo(() => {
    if (!record || !extraction || !review) return ["Run the analysis first."];
    const blockers: string[] = [];
    if (!review.coverageConfirmed) {
      blockers.push("Confirm that the relevant package sides were photographed.");
    }
    if (extraction.unattestedPhotoIds.length > 0) {
      blockers.push(
        "One or more photos contributed nothing to this analysis — re-run the analysis or remove the ignored photo before confirming.",
      );
    }
    if (extraction.identity.samePackage === false && !review.samePackageConfirmed) {
      blockers.push("Confirm that these photographs are the same physical package.");
    }
    const undecided = ruleResults.filter(
      (result) =>
        result.result === "suspected_violation" &&
        review.decisions[result.ruleId] === undefined,
    );
    if (undecided.length > 0) {
      blockers.push(
        `Accept or reject each suspected violation (${undecided.length} undecided).`,
      );
    }
    return blockers;
  }, [record, extraction, review, ruleResults]);

  async function handleConfirm() {
    if (!record || !extraction || !review || confirming) return;
    if (confirmBlockers.length > 0) return;
    setError(null);
    setConfirming(true);
    try {
      const at = new Date().toISOString();
      const confirmed = await saveInspection({
        ...record,
        categoryHint: review.reviewedCategory as CategoryHint,
        status: "confirmed",
      });
      setRecord(confirmed);
      persistReviewPayload(record.inspectionId, extraction, review, at);
      setConfirmedAt(at);
      router.push(`/report/${record.inspectionId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Confirmation was not saved. (${err.message})`
          : "Confirmation was not saved.",
      );
      setConfirming(false);
    }
  }

  const busy = analyzing || confirming || record === null;
  const currentStep =
    confirmedAt !== null ? 4 : extraction !== null ? 2 : record && record.photos.length > 0 ? 1 : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Scan a Packaged Commodity
        </h1>
        <p className="mt-1 text-sm text-slate-600 sm:text-base">
          One inspection covers one physical package. Upload its photographs,
          run the vision-model analysis, review each finding against its photo,
          then confirm the report.
        </p>
        {record && (
          <p className="mt-1 font-mono text-xs text-slate-400">
            Inspection {record.inspectionId} · status {record.status}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <UploadZone
            photos={uploadPhotos}
            categoryHint={hint}
            onCategoryHintChange={handleHintChange}
            onFilesSelect={handleFilesSelect}
            onRemovePhoto={handleRemovePhoto}
            currentStep={currentStep}
            disabled={busy}
          />

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            {error ? (
              <p
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                {notice}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={busy || record === null || record.photos.length === 0}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {analyzeProgress ?? "Analyzing photos…"}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Analyze with vision model
                </>
              )}
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Photos go to the configured vision model (local LM Studio by
              default; see Settings). The API key, if any, lives in session
              memory only. A failed or empty model response is an error — never
              a substitute report.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {extraction && review ? (
            <ReviewPanel
              inspectionId={record?.inspectionId ?? ""}
              photos={uploadPhotos.filter((photo) => photo.url !== "")}
              extraction={extraction}
              review={review}
              onReviewChange={handleReviewChange}
              ruleResults={ruleResults}
              headline={headline}
              confirming={confirming}
              confirmedAt={confirmedAt}
              confirmBlockers={confirmBlockers}
              onConfirm={handleConfirm}
            />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-400">
              Analysis results and reviewer checks will appear here after you
              upload photos and run the analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
