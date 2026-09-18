/**
 * Evidence-gated readability checks — GitHub issue #8, PRD stories 23–25.
 *
 * Rule 7 context (see docs/legal-rule-sources.md): minimum numeral/letter
 * height ties to the principal display panel's area, with separate figures
 * for moulded/formed text and a width-relative-to-height rule
 * (G.S.R. 629(E), effective 1 January 2018). Selecting the applicable
 * threshold (panel-area Table-I band, moulded-text variant) is the rules
 * agent's job; this module only converts a photographed known-size
 * reference into millimetres and refuses to guess when it cannot.
 *
 * Out of scope (see docs/legal-rule-sources.md): packages containing
 * medical devices follow the Medical Devices Rules, 2017 per G.S.R. 778(E)
 * (24 Oct 2025) — always `not_assessed` here.
 *
 * Deliberately absent: contrast-score simulation, readability %, and any
 * pixel-to-mm synthesis without a known-size reference in the same photo.
 * Per docs/adr/0002-preserve-not-assessed-results.md, checks without enough
 * evidence stay `not_assessed` rather than passing or failing. A valid
 * measurement below the cited threshold is evidence, so it returns
 * `suspected_violation` for reviewer confirmation.
 *
 * Quality vocabulary is the canonical `QualityIssue` / `QualityFlag` from
 * `types.ts` (blur, crop, obstruction, unreadable) — no local duplicates.
 */

import type { QualityFlag, QualityIssue } from './types';

/** A photographed known-size reference plus the text measured against it. */
export interface ScaleReference {
  /** Source photograph id the measurements were taken from. */
  photoId: string;
  /** Human label for the reference, e.g. "steel ruler", "coin". */
  referenceLabel: string;
  /** True physical size of the reference object, in millimetres. */
  referenceSizeMm: number;
  /** Length of the reference object as measured in the photo, in pixels. */
  measuredRefPx: number;
  /** Height of the declaration text as measured in the photo, in pixels. */
  measuredTextPx: number;
  /** False when perspective skew defeats measurement. */
  perspectiveOk: boolean;
  /** False when package curvature defeats measurement. */
  curvatureOk: boolean;
}

/**
 * Verdicts this module may return for the font-height check.
 * `suspected_violation` is returned ONLY when a valid scale-reference
 * measurement falls below the cited threshold; every unmeasurable case
 * stays `not_assessed`.
 */
export type ReadabilityVerdict = 'no_issue_found' | 'suspected_violation' | 'not_assessed';

/** Outcome of the Rule 7 font-height check for one declaration. */
export interface ReadabilityResult {
  check: 'font_height';
  result: ReadabilityVerdict;
  /** Measurement method shown only when the photo supports measurement. */
  method: string | null;
  /** Estimated letter/numeral height in mm; null when unmeasurable. */
  estimatedMm: number | null;
  /** Applicable cited Rule 7 threshold in mm; null when unknown. */
  thresholdMm: number | null;
  /** Source photograph id; null when no reference photograph exists. */
  photoId: string | null;
  /** Human-readable reason or finding, including the legal citation. */
  note: string;
}

/** Per-photo quality observations, typically from the model or reviewer. */
export interface PhotoQualityInput {
  photoId: string;
  blur?: boolean;
  crop?: boolean;
  obstruction?: boolean;
  unreadable?: boolean;
  /** Extra context appended to each emitted flag note. */
  note?: string;
}

/**
 * True when the citation routes numeral-height requirements to the
 * Medical Devices Rules, 2017 (G.S.R. 778(E)) instead of Rule 7.
 */
function isMedicalDeviceCitation(citation: string): boolean {
  return /medical[\s-]*device/i.test(citation) || /\b778\b/.test(citation);
}

function notAssessed(
  note: string,
  photoId: string | null = null,
  thresholdMm: number | null = null,
): ReadabilityResult {
  return {
    check: 'font_height',
    result: 'not_assessed',
    method: null,
    estimatedMm: null,
    thresholdMm,
    photoId,
    note,
  };
}

function validThreshold(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Assess declaration letter/numeral height against a cited Rule 7 threshold.
 *
 * Never synthesises millimetres from pixels without a known-size reference
 * visible in the same photograph, and never invents a measurement: every
 * unmeasurable case returns `not_assessed` with the reason in `note`.
 *
 * Unmeasurable (all `not_assessed`): no reference; unknown/invalid
 * reference size; missing pixel measurements or unreadable text; bad
 * perspective or curvature; unknown threshold; medical-device citation
 * (G.S.R. 778(E) out of scope).
 *
 * Measurable: returns the method string, `estimatedMm`
 * (`referenceSizeMm * measuredTextPx / measuredRefPx`), the threshold, and
 * the photo id. At or above threshold the result is `no_issue_found`.
 * Below threshold the measurement itself is the evidence, so the result
 * is `suspected_violation` with the numbers reported for reviewer
 * confirmation — the reviewer still makes the final call.
 *
 * Width-relative-to-height and moulded/formed-text variants are not
 * computed here; the caller must pass the threshold for the variant that
 * applies and cite it.
 */
export function assessFontHeight(
  ref: ScaleReference | null,
  ruleThresholdMm: number | null,
  citation: string,
): ReadabilityResult {
  if (isMedicalDeviceCitation(citation)) {
    return notAssessed(
      'Medical-device package: numeral-height requirements follow the Medical Devices Rules, 2017 ' +
        'per G.S.R. 778(E) (24 Oct 2025) — outside Rule 7 scope, not assessed.',
      ref?.photoId ?? null,
      validThreshold(ruleThresholdMm) ? ruleThresholdMm : null,
    );
  }

  if (ref === null) {
    return notAssessed(
      'Font height not assessed: no known-size reference visible in the photographs. ' +
        `Threshold unknown without scale; see ${citation}. Recapture with a ruler or known-size object.`,
    );
  }

  const threshold: number | null = validThreshold(ruleThresholdMm) ? ruleThresholdMm : null;

  if (!Number.isFinite(ref.referenceSizeMm) || ref.referenceSizeMm <= 0) {
    return notAssessed(
      'Font height not assessed: reference object has no known physical size — ' +
        'millimetres cannot be derived from pixels without one.',
      ref.photoId,
      threshold,
    );
  }

  if (!Number.isFinite(ref.measuredRefPx) || ref.measuredRefPx <= 0) {
    return notAssessed(
      'Font height not assessed: reference pixel measurement missing — ' +
        'no pixel-to-mm scale can be established for this photograph.',
      ref.photoId,
      threshold,
    );
  }

  if (!Number.isFinite(ref.measuredTextPx) || ref.measuredTextPx <= 0) {
    return notAssessed(
      'Font height not assessed: declaration text is unreadable or unmeasured in the photograph. ' +
        'Recapture a sharper, closer view; do not guess the reading.',
      ref.photoId,
      threshold,
    );
  }

  if (ref.perspectiveOk !== true) {
    return notAssessed(
      'Font height not assessed: perspective skew prevents reliable measurement. ' +
        'Recapture straight-on with the reference flat beside the text.',
      ref.photoId,
      threshold,
    );
  }

  if (ref.curvatureOk !== true) {
    return notAssessed(
      'Font height not assessed: package curvature prevents reliable measurement. ' +
        'Recapture with the declaration and reference on a flat plane.',
      ref.photoId,
      threshold,
    );
  }

  if (threshold === null) {
    return notAssessed(
      'Font height not assessed: applicable Rule 7 threshold unknown ' +
        '(panel-area band / moulded-text variant not established).',
      ref.photoId,
      null,
    );
  }

  const estimatedMm: number =
    Math.round((ref.referenceSizeMm * (ref.measuredTextPx / ref.measuredRefPx)) * 100) / 100;
  const method =
    `Rule 7 scale-reference measurement: ${ref.referenceLabel} ` +
    `${ref.referenceSizeMm} mm = ${ref.measuredRefPx} px; ` +
    `text height ${ref.measuredTextPx} px, per ${citation}.`;

  if (estimatedMm >= threshold) {
    return {
      check: 'font_height',
      result: 'no_issue_found',
      method,
      estimatedMm,
      thresholdMm: threshold,
      photoId: ref.photoId,
      note:
        `Estimated letter height ${estimatedMm} mm meets the cited threshold ` +
        `${threshold} mm (${citation}).`,
    };
  }

  return {
    check: 'font_height',
    result: 'suspected_violation',
    method,
    estimatedMm,
    thresholdMm: threshold,
    photoId: ref.photoId,
    note:
      `Estimated letter height ${estimatedMm} mm is below the cited threshold ` +
      `${threshold} mm (${citation}); suspected violation awaiting reviewer confirmation.`,
  };
}

const RECAPTURE_NOTES: Record<QualityIssue, string> = {
  blur: 'is blurred — recapture a sharper, well-lit view of the same side',
  crop: 'crops the declaration area — recapture showing the full panel or label',
  obstruction: 'is obstructed (glare, finger, sticker, or shadow) — recapture with a clear view',
  unreadable: 'has unreadable text — recapture closer with focus on the declaration; do not guess the reading',
};

/**
 * Flag poor photograph quality for recapture or reviewer attention.
 *
 * CONTRACT for the rules agent: a flagged (poor) photograph can never prove
 * a declaration missing. Mark a declaration missing only after readable
 * relevant views plus reviewer confirmation of photo coverage; otherwise
 * the check stays `not_assessed`.
 */
export function flagPhotoQuality(inputs: PhotoQualityInput[]): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const order: QualityIssue[] = ['blur', 'crop', 'obstruction', 'unreadable'];

  for (const input of inputs) {
    const present: Record<QualityIssue, boolean> = {
      blur: input.blur === true,
      crop: input.crop === true,
      obstruction: input.obstruction === true,
      unreadable: input.unreadable === true,
    };
    for (const issue of order) {
      if (!present[issue]) continue;
      const extra: string = input.note !== undefined && input.note !== '' ? ` (${input.note})` : '';
      flags.push({
        photoId: input.photoId,
        issue,
        note: `Photo "${input.photoId}" ${RECAPTURE_NOTES[issue]} before assessing declarations${extra}.`,
      });
    }
  }

  return flags;
}

/** Input for gating one model-suggested text region. */
export interface GateRegionInput {
  /** Source photograph id the region was suggested on. */
  photoId: string;
  /** Suggested region; absent when the model could not locate the text. */
  region?: { x: number; y: number; w: number; h: number } | null;
  /** Why the region is unusable (uncertain placement, unverifiable, ...). */
  reason?: string;
}

/** Gate outcome: show the highlight, or withhold it with a reviewer note. */
export interface GateRegionResult {
  show: boolean;
  reviewerNote: string | null;
}

/**
 * Gate a model-suggested text region on the photograph.
 *
 * Returns `{ show: true, reviewerNote: null }` only when a region is
 * present to check against the photo. Otherwise returns `show: false`
 * with a `reviewerNote` naming the photo (plus the reason, when given):
 * the caller must surface uncertain placement as a reviewer note instead
 * of asserting a location the photo cannot establish.
 */
export function gateRegion(input: GateRegionInput): GateRegionResult {
  const reason: string =
    input.reason !== undefined ? input.reason.trim() : '';
  if ((input.region === undefined || input.region === null) || reason !== '') {
    const detail: string = reason !== '' ? ` (${reason})` : '';
    return {
      show: false,
      reviewerNote:
        `Photo "${input.photoId}" text location withheld${detail} — ` +
        'left to reviewer notes; no highlight asserted.',
    };
  }
  return { show: true, reviewerNote: null };
}

/** Potentially misleading declaration wording flagged for a reviewer. */
export interface MisleadingWordingInput {
  photoId: string;
  /** Transcribed wording that may mislead (kept verbatim, never a verdict). */
  text: string;
  /** Why the wording looks misleading. */
  reason: string;
}

/** One note for the review UI. Never an automatic violation. */
export interface ReviewerNote {
  photoId: string;
  note: string;
}

/**
 * Flag potentially misleading wording as reviewer notes.
 *
 * This NEVER returns an automatic violation: each input becomes one
 * `{ photoId, note }` for a human to judge. The caller (review UI)
 * shows these notes alongside the inspection so the reviewer — not the
 * module — decides whether the wording breaches any cited rule.
 */
export function flagMisleadingWording(inputs: MisleadingWordingInput[]): ReviewerNote[] {
  const list = Array.isArray(inputs) ? inputs : [];
  return list.map((input) => ({
    photoId: input.photoId,
    note:
      `Photo "${input.photoId}" wording for reviewer: "${input.text}" — ` +
      `${input.reason} (reviewer note only, not a violation).`,
  }));
}
