/**
 * Merge per-photograph extractions into one package-level result.
 *
 * Small vision models attend unreliably to several images in one request,
 * so the scan flow analyses each photograph on its own and this module
 * combines identity, faces, and declarations. No legal verdicts here.
 */

import {
  emptyIdentity,
  type ExtractionResult,
  type ObservationConfidence,
  type ObservationField,
  type ObservedDeclaration,
  type PackageFace,
  type PackageIdentity,
  type PhotoFace,
} from "./observations";
import type { QualityFlag } from "./types";

const CONFIDENCE_RANK: Record<ObservationConfidence, number> = {
  ok: 2,
  uncertain: 1,
  unreadable: 0,
};

const IDENTITY_STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "pack",
  "packaged",
  "original",
  "instant",
  "new",
  "size",
  "ml",
  "gms",
  "gram",
  "grams",
  "kg",
  "ltd",
  "pvt",
  "limited",
]);

function identityTokens(value: string): Set<string> {
  const parts = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/);
  const out = new Set<string>();
  for (const part of parts) {
    if (part.length < 3) continue;
    if (IDENTITY_STOP.has(part)) continue;
    out.add(part);
  }
  return out;
}

function tokenOverlap(a: string, b: string): number {
  const left = identityTokens(a);
  const right = identityTokens(b);
  if (left.size === 0 || right.size === 0) return 0;
  let n = 0;
  for (const token of left) {
    if (right.has(token)) n += 1;
  }
  return n;
}

function identityText(brand: string | null, productName: string | null): string {
  return [brand, productName].filter((part): part is string => typeof part === "string" && part.length > 0).join(" ");
}

function pickPreferredName(
  faces: PhotoFace[],
  values: Array<{ photoId: string; value: string }>,
): string | null {
  if (values.length === 0) return null;
  const frontIds = new Set(faces.filter((face) => face.face === "front").map((face) => face.photoId));
  const fromFront = values.filter((entry) => frontIds.has(entry.photoId));
  const pool = fromFront.length > 0 ? fromFront : values;
  let best = pool[0];
  for (const entry of pool) {
    if (entry.value.length > best.value.length) best = entry;
  }
  return best.value;
}

function valuesConflict(values: string[]): boolean {
  const unique = new Set(values.map((value) => value.toLowerCase().replace(/\s+/g, " ").trim()));
  return unique.size > 1;
}

function quantityLike(value: string): boolean {
  return /\d+(?:[.,]\d+)?\s*(ml|l|ltr|litre|liter|g|gm|gms|kg|mg)\b/i.test(value);
}

function manufacturerLike(value: string): boolean {
  return (
    value.length >= 24 ||
    /ltd|limited|pvt|private|llp|address|road|plot|nagar|marketed|manufactur|packer|importer|mfg/i.test(
      value,
    )
  );
}

function mrpLike(value: string): boolean {
  return /\d/.test(value) && /(rs\.?|₹|inr|mrp)/i.test(value);
}

function dateLike(value: string): boolean {
  return /\d{1,2}[\/.\-]\d{2,4}/.test(value) || /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(value);
}

function plausibleValue(field: ObservationField, value: string | null): boolean {
  if (!value) return false;
  switch (field) {
    case "netQuantity":
      return quantityLike(value);
    case "manufacturer":
      return manufacturerLike(value);
    case "mrp":
      return mrpLike(value);
    case "dateDeclaration":
      return dateLike(value);
    default:
      return true;
  }
}

function faceByPhoto(perPhoto: ExtractionResult[]): Map<string, PackageFace> {
  const map = new Map<string, PackageFace>();
  for (const result of perPhoto) {
    for (const face of result.photoFaces) {
      if (!map.has(face.photoId) || map.get(face.photoId) === "unknown") {
        map.set(face.photoId, face.face);
      }
    }
  }
  return map;
}

function observationScore(
  item: ObservedDeclaration,
  field: ObservationField,
  faces: Map<string, PackageFace>,
): number {
  let score = CONFIDENCE_RANK[item.confidence] * 10;
  if (item.value) score += 4;
  if (plausibleValue(field, item.value)) score += 12;
  else if (item.value) score -= 8;
  // Legal declarations usually live on the information panel, not the front.
  if (faces.get(item.photoId) === "back") score += 6;
  if (faces.get(item.photoId) === "front") score -= 2;
  if (item.value) score += Math.min(item.value.length, 40) / 20;
  return score;
}

function mergeObservations(perPhoto: ExtractionResult[]): ObservedDeclaration[] {
  const faces = faceByPhoto(perPhoto);
  const byField = new Map<ObservationField, ObservedDeclaration[]>();
  for (const result of perPhoto) {
    for (const observation of result.observations) {
      const list = byField.get(observation.field) ?? [];
      list.push(observation);
      byField.set(observation.field, list);
    }
  }
  const merged: ObservedDeclaration[] = [];
  let index = 1;
  for (const [field, list] of byField) {
    const withText = list.filter((item) => item.value !== null);
    const pool = withText.length > 0 ? withText : list;
    let winner = pool[0];
    let best = observationScore(winner, field, faces);
    for (const candidate of pool) {
      const score = observationScore(candidate, field, faces);
      if (score > best) {
        winner = candidate;
        best = score;
      }
    }
    const plausibleOk = pool
      .filter((item) => item.confidence === "ok" && plausibleValue(field, item.value))
      .map((item) => item.value as string);
    const conflict = valuesConflict(plausibleOk);
    const others = list
      .filter((item) => item.photoId !== winner.photoId && item.value)
      .map((item) => `${item.photoId}: ${item.rawModelText || item.value || item.confidence}`);
    const rawParts = [winner.rawModelText];
    if (conflict) rawParts.push(`Conflict across photos: ${others.join("; ")}`);
    else if (others.length > 0) rawParts.push(`Also seen: ${others.join("; ")}`);
    merged.push({
      ...winner,
      obsId: `obs-${index}`,
      field,
      confidence: conflict && winner.confidence === "ok" ? "uncertain" : winner.confidence,
      rawModelText: rawParts.filter((part) => part.length > 0).join(" | "),
    });
    index += 1;
  }
  return merged;
}

function mergeFaces(perPhoto: ExtractionResult[], photoIds: string[]): PhotoFace[] {
  const byId = new Map<string, PhotoFace>();
  for (const result of perPhoto) {
    for (const face of result.photoFaces) {
      const existing = byId.get(face.photoId);
      if (!existing || existing.face === "unknown") byId.set(face.photoId, face);
    }
  }
  return photoIds.map((photoId) => byId.get(photoId) ?? { photoId, face: "unknown" as PackageFace, note: "" });
}

function mergeIdentity(perPhoto: ExtractionResult[], faces: PhotoFace[], photoCount: number): PackageIdentity {
  const brands: Array<{ photoId: string; value: string }> = [];
  const products: Array<{ photoId: string; value: string }> = [];
  for (const result of perPhoto) {
    const photoId = result.photoFaces[0]?.photoId ?? result.observations[0]?.photoId ?? "";
    if (result.identity.brand) brands.push({ photoId, value: result.identity.brand });
    if (result.identity.productName) products.push({ photoId, value: result.identity.productName });
  }
  const brand = pickPreferredName(faces, brands);
  const productName = pickPreferredName(faces, products);
  if (photoCount <= 1) {
    return { brand, productName, samePackage: null, mismatchNote: null };
  }

  const texts = perPhoto
    .map((result) => identityText(result.identity.brand, result.identity.productName))
    .filter((text) => text.length > 0);
  if (texts.length < 2) {
    return {
      brand,
      productName,
      samePackage: null,
      mismatchNote: texts.length === 0
        ? "Not enough brand/product text on the photographs to confirm they are the same package."
        : "Identity text was only readable on one photograph; same-package is unconfirmed.",
    };
  }

  let overlap = 0;
  let compared = 0;
  for (let i = 0; i < texts.length; i += 1) {
    for (let j = i + 1; j < texts.length; j += 1) {
      overlap += tokenOverlap(texts[i], texts[j]);
      compared += 1;
    }
  }
  if (compared === 0) {
    return { brand, productName, samePackage: null, mismatchNote: null };
  }
  if (overlap >= compared) {
    return { brand, productName, samePackage: true, mismatchNote: null };
  }
  return {
    brand,
    productName,
    samePackage: false,
    mismatchNote: `Photographs may show different products (${texts.join(" vs ")}). Confirm they belong to one package before treating this as a single inspection.`,
  };
}

function mergeCategory(perPhoto: ExtractionResult[]): Pick<ExtractionResult, "categorySuggestion" | "categoryUncertain"> {
  const suggestions = perPhoto
    .filter((result) => result.categorySuggestion && !result.categoryUncertain)
    .map((result) => result.categorySuggestion as string);
  const unique = [...new Set(suggestions)];
  if (unique.length === 1) return { categorySuggestion: unique[0], categoryUncertain: false };
  if (unique.length > 1) return { categorySuggestion: unique[0], categoryUncertain: true };
  const any = perPhoto.find((result) => result.categorySuggestion)?.categorySuggestion ?? null;
  return { categorySuggestion: any, categoryUncertain: true };
}

function mergeImport(perPhoto: ExtractionResult[]): ExtractionResult["importSuggestion"] {
  const values = new Set(perPhoto.map((result) => result.importSuggestion));
  values.delete("unknown");
  if (values.size === 1) return [...values][0];
  return "unknown";
}

function mergeQualityFlags(perPhoto: ExtractionResult[]): QualityFlag[] {
  const out: QualityFlag[] = [];
  for (const result of perPhoto) {
    for (const flag of result.qualityFlags) {
      const face = result.photoFaces.find((item) => item.photoId === flag.photoId)?.face;
      // A front without a legal block is not an unreadable photo.
      if (flag.issue === "unreadable" && face === "front") continue;
      out.push(flag);
    }
  }
  return out;
}

function attestedIds(result: ExtractionResult): Set<string> {
  const attested = new Set<string>();
  for (const observation of result.observations) attested.add(observation.photoId);
  for (const flag of result.qualityFlags) attested.add(flag.photoId);
  for (const face of result.photoFaces) {
    if (face.face !== "unknown") attested.add(face.photoId);
  }
  return attested;
}

/**
 * Combine one ExtractionResult per photograph (same photoId set) into a
 * single package-level result. Callers pass the inspection's photo ids so
 * unattested photos stay visible even when a per-photo parse was empty.
 */
export function mergePhotoExtractions(
  perPhoto: ExtractionResult[],
  photoIds: string[],
): ExtractionResult {
  const ids = photoIds.filter((id) => typeof id === "string" && id.length > 0);
  const list = Array.isArray(perPhoto) ? perPhoto : [];
  if (ids.length === 0) {
    return {
      observations: [],
      categorySuggestion: null,
      categoryUncertain: true,
      importSuggestion: "unknown",
      qualityFlags: [],
      unattestedPhotoIds: [],
      identity: emptyIdentity(),
      photoFaces: [],
    };
  }

  const photoFaces = mergeFaces(list, ids);
  const identity = mergeIdentity(list, photoFaces, ids.length);
  const category = mergeCategory(list);
  const observations = mergeObservations(list);
  const qualityFlags = mergeQualityFlags(list);

  const attested = new Set<string>();
  for (const result of list) {
    for (const id of attestedIds(result)) attested.add(id);
  }
  for (const face of photoFaces) {
    if (face.face !== "unknown") attested.add(face.photoId);
  }
  if (identity.brand || identity.productName) {
    for (const result of list) {
      if (result.identity.brand || result.identity.productName) {
        const id = result.photoFaces[0]?.photoId;
        if (id) attested.add(id);
      }
    }
  }

  return {
    observations,
    categorySuggestion: category.categorySuggestion,
    categoryUncertain: category.categoryUncertain,
    importSuggestion: mergeImport(list),
    qualityFlags,
    unattestedPhotoIds: ids.filter((id) => !attested.has(id)),
    identity,
    photoFaces,
  };
}
