import { describe, expect, it } from "vitest";
import {
  parseExtractionResponse,
  repairMrpTranscription,
  type ExtractionResult,
} from "../src/lib/observations";
import { mergePhotoExtractions } from "../src/lib/package-analysis";

function photoResult(partial: Partial<ExtractionResult> & { photoId: string }): ExtractionResult {
  const photoId = partial.photoId;
  const base = parseExtractionResponse(
    {
      choices: [
        {
          message: {
            content: JSON.stringify({
              face: "unknown",
              brand: null,
              productName: null,
              observations: [],
              categorySuggestion: null,
              categoryUncertain: true,
              importSuggestion: "unknown",
              qualityFlags: [],
            }),
          },
        },
      ],
    },
    [photoId],
  );
  const { photoId: _omit, ...rest } = partial;
  void _omit;
  return {
    ...base,
    ...rest,
    identity: { ...base.identity, ...partial.identity },
    photoFaces: partial.photoFaces ?? base.photoFaces,
  };
}

describe("mergePhotoExtractions", () => {
  it("combines a brand-only front with a legal-block back into one package result", () => {
    const front = photoResult({
      photoId: "p-front",
      identity: {
        brand: "Dettol",
        productName: "Original Germ Defence Instant Hand Sanitizer",
        samePackage: null,
        mismatchNote: null,
      },
      photoFaces: [{ photoId: "p-front", face: "front", note: "principal display" }],
      categorySuggestion: "Personal care",
      categoryUncertain: false,
      observations: [],
    });
    const back = photoResult({
      photoId: "p-back",
      identity: {
        brand: "Dettol",
        productName: "Dettol Instant Hand Sanitizer",
        samePackage: null,
        mismatchNote: null,
      },
      photoFaces: [{ photoId: "p-back", face: "back", note: "information panel" }],
      categorySuggestion: "Personal care",
      categoryUncertain: false,
      importSuggestion: "domestic",
      observations: [
        {
          obsId: "obs-1",
          field: "mrp",
          value: "Rs. 35",
          photoId: "p-back",
          confidence: "ok",
          rawModelText: "MRP. Rs. 50 35 *Promo Price",
        },
        {
          obsId: "obs-2",
          field: "netQuantity",
          value: "50ml",
          photoId: "p-back",
          confidence: "ok",
          rawModelText: "Net. Vol: 50ml",
        },
        {
          obsId: "obs-3",
          field: "manufacturer",
          value: "Reckitt Benckiser (India) Pvt Ltd",
          photoId: "p-back",
          confidence: "ok",
          rawModelText: "Reckitt Benckiser (India) Pvt Ltd",
        },
      ],
    });

    const merged = mergePhotoExtractions([front, back], ["p-front", "p-back"]);

    expect(merged.identity.brand).toBe("Dettol");
    expect(merged.identity.productName).toMatch(/Hand Sanitizer/i);
    expect(merged.identity.samePackage).toBe(true);
    expect(merged.photoFaces.map((face) => face.face)).toEqual(["front", "back"]);
    expect(merged.unattestedPhotoIds).toEqual([]);
    expect(merged.observations.map((item) => item.field).sort()).toEqual([
      "manufacturer",
      "mrp",
      "netQuantity",
    ]);
    expect(merged.observations.find((item) => item.field === "mrp")?.photoId).toBe("p-back");
    expect(merged.categorySuggestion).toBe("Personal care");
  });

  it("does not treat a front face without declarations as ignored", () => {
    const front = photoResult({
      photoId: "p-front",
      identity: {
        brand: "Dettol",
        productName: "Hand Sanitizer",
        samePackage: null,
        mismatchNote: null,
      },
      photoFaces: [{ photoId: "p-front", face: "front", note: "" }],
      observations: [],
    });
    const merged = mergePhotoExtractions([front], ["p-front"]);
    expect(merged.unattestedPhotoIds).toEqual([]);
    expect(merged.observations).toEqual([]);
    expect(merged.identity.brand).toBe("Dettol");
  });

  it("flags photographs whose brand tokens do not overlap as different products", () => {
    const a = photoResult({
      photoId: "p-a",
      identity: { brand: "Dettol", productName: "Hand Sanitizer", samePackage: null, mismatchNote: null },
      photoFaces: [{ photoId: "p-a", face: "front", note: "" }],
    });
    const b = photoResult({
      photoId: "p-b",
      identity: { brand: "Lifebuoy", productName: "Soap Bar", samePackage: null, mismatchNote: null },
      photoFaces: [{ photoId: "p-b", face: "front", note: "" }],
    });
    const merged = mergePhotoExtractions([a, b], ["p-a", "p-b"]);
    expect(merged.identity.samePackage).toBe(false);
    expect(merged.identity.mismatchNote).toMatch(/different products/i);
  });

  it("prefers a back-panel quantity over a front batch number misread as net quantity", () => {
    const front = photoResult({
      photoId: "p-front",
      photoFaces: [{ photoId: "p-front", face: "front", note: "" }],
      observations: [
        {
          obsId: "obs-1",
          field: "netQuantity",
          value: "3219591",
          photoId: "p-front",
          confidence: "ok",
          rawModelText: "3219591",
        },
        {
          obsId: "obs-2",
          field: "manufacturer",
          value: "IMA Recommended",
          photoId: "p-front",
          confidence: "ok",
          rawModelText: "IMA Recommended",
        },
      ],
    });
    const back = photoResult({
      photoId: "p-back",
      photoFaces: [{ photoId: "p-back", face: "back", note: "" }],
      observations: [
        {
          obsId: "obs-1",
          field: "netQuantity",
          value: "50ml",
          photoId: "p-back",
          confidence: "ok",
          rawModelText: "Net. Vol: 50ml",
        },
        {
          obsId: "obs-2",
          field: "manufacturer",
          value: "Reckitt Benckiser (India) Pvt Ltd, Gurugram",
          photoId: "p-back",
          confidence: "ok",
          rawModelText: "Reckitt Benckiser (India) Pvt Ltd, Gurugram",
        },
      ],
    });
    const merged = mergePhotoExtractions([front, back], ["p-front", "p-back"]);
    expect(merged.observations.find((item) => item.field === "netQuantity")?.value).toBe("50ml");
    expect(merged.observations.find((item) => item.field === "netQuantity")?.confidence).toBe("ok");
    expect(merged.observations.find((item) => item.field === "manufacturer")?.photoId).toBe("p-back");
    expect(merged.observations.find((item) => item.field === "manufacturer")?.confidence).toBe("ok");
  });

  it("keeps a field conflict for review instead of silently picking one number", () => {
    const a = photoResult({
      photoId: "p-a",
      photoFaces: [{ photoId: "p-a", face: "back", note: "" }],
      observations: [
        {
          obsId: "obs-1",
          field: "mrp",
          value: "Rs. 35",
          photoId: "p-a",
          confidence: "ok",
          rawModelText: "Rs. 35",
        },
      ],
    });
    const b = photoResult({
      photoId: "p-b",
      photoFaces: [{ photoId: "p-b", face: "side", note: "" }],
      observations: [
        {
          obsId: "obs-1",
          field: "mrp",
          value: "Rs. 50",
          photoId: "p-b",
          confidence: "ok",
          rawModelText: "Rs. 50",
        },
      ],
    });
    const merged = mergePhotoExtractions([a, b], ["p-a", "p-b"]);
    const mrp = merged.observations.find((item) => item.field === "mrp");
    expect(mrp?.confidence).toBe("uncertain");
    expect(mrp?.rawModelText).toMatch(/Conflict/i);
  });
});

describe("parseExtractionResponse identity", () => {
  it("attests a single photo that only reports a front face and brand", () => {
    const raw = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              face: "front",
              brand: "Dettol",
              productName: "Instant Hand Sanitizer",
              observations: [],
              categorySuggestion: "Personal care",
              categoryUncertain: false,
              importSuggestion: "unknown",
              qualityFlags: [],
            }),
          },
        },
      ],
    };
    const result = parseExtractionResponse(raw, ["p-front"]);
    expect(result.identity.brand).toBe("Dettol");
    expect(result.identity.productName).toBe("Instant Hand Sanitizer");
    expect(result.photoFaces).toEqual([
      { photoId: "p-front", face: "front", note: "" },
    ]);
    expect(result.unattestedPhotoIds).toEqual([]);
  });
});

describe("repairMrpTranscription", () => {
  it("takes the promo amount when a rupee sign is misread as percent", () => {
    expect(repairMrpTranscription("₹ 56 35%")).toEqual({
      value: "₹ 35",
      repaired: true,
      note: expect.stringMatching(/promo 35/),
    });
    expect(repairMrpTranscription("Rs. 50 35%").value).toBe("Rs. 35");
    expect(repairMrpTranscription("₹ 35").repaired).toBe(false);
  });
});
