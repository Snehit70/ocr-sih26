/**
 * Mock fixtures for the SIH 2026 Legal Metrology prototype.
 *
 * - `SAMPLE_OCR` : realistic multi-line OCR transcripts per scenario.
 * - `SAMPLE_REPORTS` : `ProductReport`s built via `buildReport` (single
 *   source of truth — no hand-written verdicts).
 * - `DASHBOARD_STATS` : aggregate dashboard numbers.
 * - `SAMPLE_IMAGES` : placeholder image paths (add real files under
 *   `public/samples/` later).
 */

import { buildReport } from './rules';
import type { DashboardStats, ProductReport } from './types';

/* ------------------------------------------------------------------ */
/* Sample label images (placeholders under public/samples/)            */
/* ------------------------------------------------------------------ */

export const SAMPLE_IMAGES: Record<string, string> = {
  compliant_biscuit: '/samples/biscuit.jpg',
  missing_mrp_chips: '/samples/chips.jpg',
  small_font_soap: '/samples/soap.jpg',
  missing_care_oil: '/samples/oil.jpg',
};

/* ------------------------------------------------------------------ */
/* Sample OCR transcripts                                              */
/* ------------------------------------------------------------------ */

/**
 * Four scenarios:
 * - compliant_biscuit : fully compliant pack.
 * - missing_mrp_chips : MRP declaration absent.
 * - small_font_soap   : tiny print (use a small panel area so the
 *                       Table-I font check fails) + sparse declarations.
 * - missing_care_oil  : consumer-care block absent.
 */
export const SAMPLE_OCR: Record<string, string> = {
  compliant_biscuit: [
    'Sunrise Glucose Biscuits',
    'Manufactured by: Sunrise Foods Pvt. Ltd.',
    'Plot 42, MIDC Industrial Estate, Andheri East, Mumbai 400093, India',
    'Generic Name: Biscuits',
    'Net Quantity: 200 g',
    'Mfd: 06/2026',
    'Best Before 9 Months From Manufacture',
    'MRP Rs. 45.00 (Inclusive of all taxes)',
    'Unit Sale Price: Rs. 0.23 per g',
    'Country of Origin: India',
    'Consumer Care: Sunrise Foods, Plot 42, MIDC Industrial Estate, Mumbai 400093',
    'Toll Free: 1800 419 0000 | Email: care@sunrisefoods.in',
  ].join('\n'),

  missing_mrp_chips: [
    'Crunchy Masala Chips',
    'Manufactured by: Crunchy Snacks Ltd.',
    'Plot 7, Industrial Area, Noida 201301, India',
    'Generic Name: Chips',
    'Net Quantity: 150 g',
    'Mfd: Mar 2026',
    'Unit Sale Price: Rs. 0.33 per g',
    'Country of Origin: India',
    'Consumer Care: Crunchy Snacks, Plot 7, Industrial Area, Noida',
    'Phone: 9876543210 | Email: hello@crunchysnacks.in',
    'Best Before 6 Months From Manufacture',
  ].join('\n'),

  small_font_soap: [
    'FreshGlow Soap',
    'Mfd by FreshGlow',
    'Net Wt 75 g',
    'MRP Rs 28',
    'Mfd 2026',
    'Made in India',
  ].join('\n'),

  missing_care_oil: [
    'PureGold Mustard Oil',
    'Manufactured by: PureGold Agro Mills',
    'Plot 12, Industrial Estate, Jaipur 302013, India',
    'Generic Name: Oil',
    'Net Quantity: 1 L',
    'Mfd: 05/2026',
    'MRP Rs. 210.00 (Inclusive of all taxes)',
    'Unit Sale Price: Rs. 210.00 per L',
    'Country of Origin: India',
    'Best Before 12 Months From Manufacture',
  ].join('\n'),
};

/* ------------------------------------------------------------------ */
/* Reports built from the fixtures (no hand-written verdicts)          */
/* ------------------------------------------------------------------ */

export const SAMPLE_REPORTS: ProductReport[] = [
  buildReport(
    'RPT-2026-0001',
    'Sunrise Glucose Biscuits',
    'Sunrise',
    'Biscuits',
    SAMPLE_IMAGES['compliant_biscuit'] as string,
    SAMPLE_OCR['compliant_biscuit'] as string,
    120,
  ),
  buildReport(
    'RPT-2026-0002',
    'Crunchy Masala Chips',
    'Crunchy',
    'Chips',
    SAMPLE_IMAGES['missing_mrp_chips'] as string,
    SAMPLE_OCR['missing_mrp_chips'] as string,
    140,
  ),
  buildReport(
    'RPT-2026-0003',
    'FreshGlow Soap',
    'FreshGlow',
    'Soap',
    SAMPLE_IMAGES['small_font_soap'] as string,
    SAMPLE_OCR['small_font_soap'] as string,
    32, // small panel + sparse print => Table-I font check fails
  ),
  buildReport(
    'RPT-2026-0004',
    'PureGold Mustard Oil',
    'PureGold',
    'Oil',
    SAMPLE_IMAGES['missing_care_oil'] as string,
    SAMPLE_OCR['missing_care_oil'] as string,
    150, // font passes here; the failure of interest is consumer care
  ),
];

/* ------------------------------------------------------------------ */
/* Dashboard aggregates                                                */
/* ------------------------------------------------------------------ */

export const DASHBOARD_STATS: DashboardStats = {
  totalScans: 1284,
  compliant: 892,
  nonCompliant: 268,
  pending: 124,
  violationsByType: [
    { name: 'MRP declaration', value: 96 },
    { name: 'Net quantity', value: 74 },
    { name: 'Consumer care', value: 68 },
    { name: 'Font size / legibility', value: 52 },
    { name: 'Mfg date', value: 41 },
    { name: 'Unit sale price', value: 37 },
  ],
  recentScans: SAMPLE_REPORTS,
};
