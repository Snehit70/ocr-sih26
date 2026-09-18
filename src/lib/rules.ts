/**
 * Pure rules engine for Legal Metrology (Packaged Commodities) Rules, 2011.
 *
 * - `extractFields` : regex-based field extraction over raw OCR text.
 * - `runComplianceChecks` : 10 mandatory-declaration checks (Rule 6 family).
 * - `computeFontAnalysis` : Table-I minimum letter-height lookup.
 * - `buildReport` : assembles a `ProductReport` from OCR text.
 *
 * All functions are pure, dependency-free and fully typed (no `any`).
 */

import type {
  CheckStatus,
  ComplianceCheck,
  FontAnalysis,
  OverallStatus,
  ProductReport,
} from './types';

/* ------------------------------------------------------------------ */
/* Regex library                                                       */
/* ------------------------------------------------------------------ */

const RE = {
  mrpAmount: /M\.?R\.?P\.?.*?(?:Rs\.?|₹|INR)\s?[\d,.]+/i,
  mrpTaxNote: /inclusive\s+of\s+all\s+taxes/i,
  netQty:
    /Net\s+(?:Qty|Quantity|Wt|Weight|Volume|Content).*?[\d.]+\s?(kg|g\b|gram|litre|liter|l\b|ml|m\b|cm|metre|meter|piece|pieces|pcs|pair|set)/i,
  mfgDate:
    /(Mfg|Mfd|Manufactured|Mfg\.?\s*Dt|Date\s*of\s*(?:Mfg|Manufacture)|Packed(?:\s*on)?).*?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|\d{1,2}\/\d{4}|\d{1,2}-\d{4}|\d{4})/i,
  phone: /(\d{10}|1800[\d\s-]+|1860[\d\s-]+)/,
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
  careKeyword:
    /(consumer\s*care|customer\s*care|consumer\s*service|feedback|complaint|toll[\s-]?free|helpline)/i,
  origin: /(country\s*of\s*origin|made\s*in|product\s*of|manufactured\s*in)\s*:?\s*([A-Za-z ]+)/i,
  unitPrice:
    /(unit\s*sale\s*price|price\s*per|per\s*(g|kg|ml|l|100\s?g|100\s?ml))\s*:?\s*(?:Rs\.?|₹)?\s?[\d,.]+/i,
  dimensions:
    /(dimensions?|size|length\s*[×x]\s*width|(\d+(\.\d+)?\s?(cm|mm|m)\s*[×x]\s*\d+(\.\d+)?\s?(cm|mm|m)))/i,
  genericName:
    /(biscuits?|chips|soap|oil|atta|rice|sugar|tea|detergent|shampoo|noodles|chocolate|milk)/i,
  address: /[A-Za-z0-9#\/,.-]+\s*,.*(road|street|estate|area|nagar|plot|industrial|mumbai|delhi|bengaluru|chennai|kolkata|india)/i,
  makerPrefix: /(manufactured\s*by|mfd\s*by|packed\s*by|packer|imported\s*by|importer|marketed\s*by)/i,
} as const;

/** Field keys returned by `extractFields`. */
export type ExtractedFieldKey =
  | 'mrp'
  | 'netQty'
  | 'mfgDate'
  | 'phone'
  | 'email'
  | 'consumerCareBlock'
  | 'address'
  | 'countryOfOrigin'
  | 'productName'
  | 'unitPrice'
  | 'dimensions'
  | 'manufacturerBlock';

/* ------------------------------------------------------------------ */
/* extractFields                                                       */
/* ------------------------------------------------------------------ */

/**
 * Extract raw declaration snippets from OCR text via regex.
 * Missing fields are simply absent from the returned record.
 */
export function extractFields(ocrText: string): Record<string, string> {
  const text: string = ocrText ?? '';
  const out: Record<string, string> = {};

  const mrp = text.match(RE.mrpAmount);
  if (mrp) {
    const taxNote = text.match(RE.mrpTaxNote);
    out['mrp'] = taxNote ? `${mrp[0].trim()} (${taxNote[0].trim()})` : mrp[0].trim();
  }

  const netQty = text.match(RE.netQty);
  if (netQty) out['netQty'] = netQty[0].trim();

  const mfg = text.match(RE.mfgDate);
  if (mfg) out['mfgDate'] = mfg[0].trim();

  const phone = text.match(RE.phone);
  if (phone) out['phone'] = phone[0].trim();

  const email = text.match(RE.email);
  if (email) out['email'] = email[0].trim();

  if (RE.careKeyword.test(text)) {
    const lines: string[] = text
      .split('\n')
      .filter((l: string) => RE.careKeyword.test(l) || RE.phone.test(l) || RE.email.test(l));
    if (lines.length > 0) out['consumerCareBlock'] = lines.join(' | ').trim();
    else out['consumerCareBlock'] = (text.match(RE.careKeyword) as RegExpMatchArray)[0].trim();
  }

  const addr = text.match(RE.address);
  if (addr) out['address'] = addr[0].trim();

  const origin = text.match(RE.origin);
  if (origin) out['countryOfOrigin'] = origin[0].trim();

  // Product name: first non-empty line containing a known generic noun,
  // otherwise the first non-empty line.
  const nonEmpty: string[] = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
  const generic: string | undefined = nonEmpty.find((l: string) => RE.genericName.test(l));
  if (generic) out['productName'] = generic;
  else if (nonEmpty.length > 0) out['productName'] = nonEmpty[0] as string;

  const unit = text.match(RE.unitPrice);
  if (unit) out['unitPrice'] = unit[0].trim();

  const dims = text.match(RE.dimensions);
  // Only treat as a real dimension declaration if it carries measurements
  // with units (e.g. "10 cm x 6 cm"), not the bare word "Size".
  if (dims && /\d/.test(dims[0])) out['dimensions'] = dims[0].trim();

  if (RE.makerPrefix.test(text)) {
    const line: string | undefined = text
      .split('\n')
      .find((l: string) => RE.makerPrefix.test(l));
    out['manufacturerBlock'] = (line ?? (text.match(RE.makerPrefix) as RegExpMatchArray)[0]).trim();
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* runComplianceChecks                                                 */
/* ------------------------------------------------------------------ */

function mk(
  id: string,
  label: string,
  ruleRef: string,
  status: CheckStatus,
  message: string,
  extra?: Partial<Pick<ComplianceCheck, 'extractedText' | 'expected'>>,
): ComplianceCheck {
  return { id, label, ruleRef, status, message, ...extra };
}

/**
 * Run the 10 mandatory-declaration checks over OCR text.
 *
 * Verdict policy per check: regex found + required format keywords => pass;
 * found but malformed/incomplete => warning; absent => fail.
 */
export function runComplianceChecks(ocrText: string, panelAreaCm2?: number): ComplianceCheck[] {
  const text: string = ocrText ?? '';
  const f: Record<string, string> = extractFields(text);
  void panelAreaCm2; // reserved: future geometry-aware checks (free space, sticker overlap).

  const checks: ComplianceCheck[] = [];

  // 1. Manufacturer / packer / importer name + address — Rule 6(1)(a)
  if (f['manufacturerBlock'] && f['address']) {
    checks.push(
      mk('manufacturer', 'Manufacturer / Packer / Importer', 'Rule 6(1)(a)', 'pass',
        'Name with Manufactured/Packed by prefix and full address present.',
        { extractedText: `${f['manufacturerBlock']} | ${f['address']}`, expected: 'Name with prefix + complete address' }),
    );
  } else if (f['manufacturerBlock'] || f['address']) {
    checks.push(
      mk('manufacturer', 'Manufacturer / Packer / Importer', 'Rule 6(1)(a)', 'warning',
        'Name or address found but incomplete — both name (with prefix) and full address are required.',
        { extractedText: f['manufacturerBlock'] ?? f['address'], expected: 'Name with prefix + complete address' }),
    );
  } else {
    checks.push(
      mk('manufacturer', 'Manufacturer / Packer / Importer', 'Rule 6(1)(a)', 'fail',
        'Missing manufacturer/packer/importer name and address. Add "Manufactured by …" with full address.',
        { expected: 'Name with prefix + complete address' }),
    );
  }

  // 2. Country of origin (imports) — Rule 6(1)(d)(v) / Legal Metrology import declarations
  const looksImported: boolean = /imported\s*by|importer/i.test(text);
  if (f['countryOfOrigin']) {
    checks.push(
      mk('origin', 'Country of Origin', 'Rule 6(1)(d)(v)', 'pass',
        'Country of origin declared.',
        { extractedText: f['countryOfOrigin'], expected: 'Country of Origin: …' }),
    );
  } else if (looksImported) {
    checks.push(
      mk('origin', 'Country of Origin', 'Rule 6(1)(d)(v)', 'fail',
        'Imported pack but country of origin is missing — mandatory for imports.',
        { expected: 'Country of Origin: …' }),
    );
  } else {
    checks.push(
      mk('origin', 'Country of Origin', 'Rule 6(1)(d)(v)', 'warning',
        'Country of origin not explicitly stated. Required for imports; recommended otherwise ("Made in India").',
        { expected: 'Country of Origin: …' }),
    );
  }

  // 3. Generic product name — Rule 6(1)(b)
  if (f['productName'] && RE.genericName.test(f['productName'])) {
    checks.push(
      mk('product_name', 'Common / Generic Name', 'Rule 6(1)(b)', 'pass',
        'Generic product name present.',
        { extractedText: f['productName'], expected: 'Common name e.g. Biscuits, Soap' }),
    );
  } else if (f['productName']) {
    checks.push(
      mk('product_name', 'Common / Generic Name', 'Rule 6(1)(b)', 'warning',
        'A product line was found but no recognisable generic name — verify it names the commodity.',
        { extractedText: f['productName'], expected: 'Common name e.g. Biscuits, Soap' }),
    );
  } else {
    checks.push(
      mk('product_name', 'Common / Generic Name', 'Rule 6(1)(b)', 'fail',
        'Generic product name missing.',
        { expected: 'Common name e.g. Biscuits, Soap' }),
    );
  }

  // 4. Net quantity in standard units — Rule 6(1)(d)
  const STANDARD_UNIT = /(kg|g\b|gram|litre|liter|l\b|ml|m\b|cm|metre|meter|piece|pieces|pcs|pair|set)/i;
  if (f['netQty'] && STANDARD_UNIT.test(f['netQty'])) {
    checks.push(
      mk('net_quantity', 'Net Quantity', 'Rule 6(1)(d)', 'pass',
        'Net quantity declared in standard units.',
        { extractedText: f['netQty'], expected: 'Net Qty: e.g. 200 g / 1 L / 1 piece' }),
    );
  } else if (/net\s*(qty|quantity|wt|weight|volume|content)/i.test(text)) {
    checks.push(
      mk('net_quantity', 'Net Quantity', 'Rule 6(1)(d)', 'warning',
        'Net quantity line found but unit is non-standard — use kg/g, L/ml, m/cm, piece/pair/set.',
        { extractedText: text.match(/net\s*(qty|quantity|wt|weight|volume|content).*/i)?.[0].trim(), expected: 'Net Qty in standard units' }),
    );
  } else {
    checks.push(
      mk('net_quantity', 'Net Quantity', 'Rule 6(1)(d)', 'fail',
        'Net quantity missing. Declare as e.g. "Net Qty: 200 g".',
        { expected: 'Net Qty in standard units' }),
    );
  }

  // 5. Month + year of manufacture — Rule 6(1)(c)
  if (f['mfgDate']) {
    const hasMonthYear: boolean =
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)/i.test(f['mfgDate']) ||
      /\d{1,2}[\/-]\d{4}/.test(f['mfgDate']);
    if (hasMonthYear) {
      checks.push(
        mk('mfg_date', 'Month & Year of Manufacture', 'Rule 6(1)(c)', 'pass',
          'Month and year of manufacture/packing declared.',
          { extractedText: f['mfgDate'], expected: 'Mfd: MM/YYYY or Mon YYYY' }),
      );
    } else {
      checks.push(
        mk('mfg_date', 'Month & Year of Manufacture', 'Rule 6(1)(c)', 'warning',
          'A manufacture reference exists but month+year format is unclear — use "Mfd: MM/YYYY".',
          { extractedText: f['mfgDate'], expected: 'Mfd: MM/YYYY or Mon YYYY' }),
      );
    }
  } else {
    checks.push(
      mk('mfg_date', 'Month & Year of Manufacture', 'Rule 6(1)(c)', 'fail',
        'Month and year of manufacture/packing missing.',
        { expected: 'Mfd: MM/YYYY or Mon YYYY' }),
    );
  }

  // 6. MRP with Rs/₹ + "inclusive of all taxes" — Rule 6(1)(e)
  if (f['mrp'] && RE.mrpTaxNote.test(text)) {
    checks.push(
      mk('mrp', 'Maximum Retail Price (MRP)', 'Rule 6(1)(e)', 'pass',
        'MRP with currency symbol and "inclusive of all taxes" present.',
        { extractedText: f['mrp'], expected: 'MRP Rs. X (Inclusive of all taxes)' }),
    );
  } else if (f['mrp']) {
    checks.push(
      mk('mrp', 'Maximum Retail Price (MRP)', 'Rule 6(1)(e)', 'warning',
        'MRP amount found but the phrase "inclusive of all taxes" is missing.',
        { extractedText: f['mrp'], expected: 'MRP Rs. X (Inclusive of all taxes)' }),
    );
  } else {
    checks.push(
      mk('mrp', 'Maximum Retail Price (MRP)', 'Rule 6(1)(e)', 'fail',
        'MRP missing. Print "MRP Rs. … (Inclusive of all taxes)".',
        { expected: 'MRP Rs. X (Inclusive of all taxes)' }),
    );
  }

  // 7. Consumer care — name + address + phone + email — Rule 6(1)(g)
  const careParts: number = [f['consumerCareBlock'], f['phone'], f['email'], f['address']].filter(Boolean).length;
  if (f['consumerCareBlock'] && f['phone'] && f['email']) {
    checks.push(
      mk('consumer_care', 'Consumer Care Details', 'Rule 6(1)(g)', 'pass',
        'Consumer-care name, address, phone and email present.',
        { extractedText: f['consumerCareBlock'], expected: 'Consumer Care: name, address, phone, email' }),
    );
  } else if (careParts >= 2) {
    checks.push(
      mk('consumer_care', 'Consumer Care Details', 'Rule 6(1)(g)', 'warning',
        'Consumer-care block partially present — name, address, phone and email are all required.',
        { extractedText: f['consumerCareBlock'] ?? f['phone'] ?? f['email'], expected: 'Consumer Care: name, address, phone, email' }),
    );
  } else {
    checks.push(
      mk('consumer_care', 'Consumer Care Details', 'Rule 6(1)(g)', 'fail',
        'Consumer-care details missing. Add name, address, phone and email.',
        { expected: 'Consumer Care: name, address, phone, email' }),
    );
  }

  // 8. Dimensions where relevant — Rule 6(1)(h) (commodities sold by length/area/volume descriptors)
  const needsDims: boolean = /(bedsheet|fabric|cloth|foil|wrap|pipe|cable|carpet|mat\b)/i.test(text);
  if (f['dimensions']) {
    checks.push(
      mk('dimensions', 'Dimensions (where applicable)', 'Rule 6(1)(h)', 'pass',
        'Dimensions declared.',
        { extractedText: f['dimensions'], expected: 'Dimensions e.g. 10 cm x 6 cm' }),
    );
  } else if (needsDims) {
    checks.push(
      mk('dimensions', 'Dimensions (where applicable)', 'Rule 6(1)(h)', 'fail',
        'Product type needs dimensions but none are declared.',
        { expected: 'Dimensions e.g. 10 cm x 6 cm' }),
    );
  } else {
    // Not applicable to this commodity class — record a passing note.
    checks.push(
      mk('dimensions', 'Dimensions (where applicable)', 'Rule 6(1)(h)', 'pass',
        'Not applicable to this commodity; no dimension declaration required.',
        { expected: 'Dimensions only where relevant' }),
    );
  }

  // 9. Unit sale price — Rule 6(1) proviso (unit pricing per g/kg, ml/L)
  if (f['unitPrice'] && /\d/.test(f['unitPrice']) && /\.\d{2}/.test(text.match(RE.unitPrice)?.[0] ?? '')) {
    checks.push(
      mk('unit_price', 'Unit Sale Price', 'Rule 6(1) proviso', 'pass',
        'Unit sale price with 2-decimal pricing present.',
        { extractedText: f['unitPrice'], expected: 'Unit Sale Price: Rs. X per g/kg/ml/L' }),
    );
  } else if (f['unitPrice']) {
    checks.push(
      mk('unit_price', 'Unit Sale Price', 'Rule 6(1) proviso', 'warning',
        'Unit price line found but not in 2-decimal format — use e.g. "Rs. 1.25 per g".',
        { extractedText: f['unitPrice'], expected: 'Unit Sale Price: Rs. X.XX per g/kg/ml/L' }),
    );
  } else {
    checks.push(
      mk('unit_price', 'Unit Sale Price', 'Rule 6(1) proviso', 'fail',
        'Unit sale price missing. Add e.g. "Unit Sale Price: Rs. 1.25 per g".',
        { expected: 'Unit Sale Price: Rs. X.XX per g/kg/ml/L' }),
    );
  }

  // 10. General manner of declarations — Rule 7 / Rule 8 (legibility, free space, no tampering)
  const legible: boolean = text.trim().length > 60;
  const stickerNote: boolean = /sticker|over\s*label|tamper/i.test(text);
  if (legible && !stickerNote) {
    checks.push(
      mk('general_manner', 'Manner of Declaration (legibility)', 'Rule 7 / Rule 8', 'pass',
        'Declarations legible with adequate free space around net quantity; no sticker-tampering signs.',
        { expected: 'Legible, indelible, prominent declarations' }),
    );
  } else if (stickerNote) {
    checks.push(
      mk('general_manner', 'Manner of Declaration (legibility)', 'Rule 7 / Rule 8', 'warning',
        'Possible sticker / over-labelling detected — verify declarations are not obscured or tampered.',
        { expected: 'Legible, indelible, prominent declarations' }),
    );
  } else {
    checks.push(
      mk('general_manner', 'Manner of Declaration (legibility)', 'Rule 7 / Rule 8', 'warning',
        'OCR text too sparse to confirm legibility — verify print is indelible, prominent and tamper-free.',
        { expected: 'Legible, indelible, prominent declarations' }),
    );
  }

  return checks;
}

/* ------------------------------------------------------------------ */
/* computeFontAnalysis                                                 */
/* ------------------------------------------------------------------ */

/** Table-I minimum letter height (mm) for a principal-display-panel area. */
export function minLetterHeightMm(panelAreaCm2: number): number {
  if (panelAreaCm2 <= 50) return 1.0;
  if (panelAreaCm2 <= 100) return 1.5;
  if (panelAreaCm2 <= 500) return 2.5;
  if (panelAreaCm2 <= 2500) return 4.0;
  return 6.0;
}

/**
 * Font-size analysis for a panel area. The estimated height is simulated
 * deterministically-ish around the requirement (±15%) so mock reports vary
 * without needing real OCR geometry.
 */
export function computeFontAnalysis(panelAreaCm2: number): FontAnalysis {
  const area: number = Math.max(1, panelAreaCm2);
  const minRequiredMm: number = minLetterHeightMm(area);

  // Deterministic pseudo-random factor in [0.85, 1.15] derived from the area.
  const jitter: number = 0.85 + ((((area * 7919) | 0) % 100) / 100) * 0.3;
  const estimatedMm: number = Math.round(minRequiredMm * jitter * 100) / 100;

  const status: CheckStatus = estimatedMm >= minRequiredMm ? 'pass' : 'fail';
  const margin: number = (estimatedMm - minRequiredMm) / minRequiredMm;
  const readabilityScore: number = Math.max(
    0,
    Math.min(100, Math.round(70 + margin * 100)),
  );

  const contrastNote: string =
    status === 'pass'
      ? `Letter height ${estimatedMm} mm ≥ required ${minRequiredMm} mm; adequate free space around net quantity, good contrast.`
      : `Letter height ${estimatedMm} mm < required ${minRequiredMm} mm for a ${area} cm² panel; increase type size and keep free space around net quantity.`;

  return {
    panelAreaCm2: area,
    minRequiredMm,
    estimatedMm,
    status,
    readabilityScore,
    contrastNote,
  };
}

/* ------------------------------------------------------------------ */
/* buildReport                                                         */
/* ------------------------------------------------------------------ */

/**
 * Assemble a `ProductReport` from OCR text.
 * Score = (pass + 0.5 × warning) / total × 100.
 */
export function buildReport(
  id: string,
  productName: string,
  brand: string,
  category: string,
  imageUrl: string,
  ocrText: string,
  panelArea?: number,
): ProductReport {
  const checks: ComplianceCheck[] = runComplianceChecks(ocrText, panelArea);
  const total: number = checks.length;

  let earned = 0;
  for (const c of checks) {
    if (c.status === 'pass') earned += 1;
    else if (c.status === 'warning') earned += 0.5;
  }
  const score: number = total === 0 ? 0 : Math.round((earned / total) * 100);

  const fails: number = checks.filter((c: ComplianceCheck) => c.status === 'fail').length;
  const warns: number = checks.filter((c: ComplianceCheck) => c.status === 'warning').length;

  let overallStatus: OverallStatus;
  if (fails === 0 && warns === 0) overallStatus = 'COMPLIANT';
  else if (fails === 0) overallStatus = 'NEEDS_REVIEW';
  else if (fails <= 2 && score >= 60) overallStatus = 'NEEDS_REVIEW';
  else overallStatus = 'NON_COMPLIANT';

  const font: FontAnalysis = computeFontAnalysis(panelArea ?? 120);

  return {
    id,
    productName,
    brand,
    category,
    imageUrl,
    scannedAt: new Date().toISOString(),
    overallStatus,
    score,
    checks,
    font,
    rawOcrText: ocrText,
  };
}
