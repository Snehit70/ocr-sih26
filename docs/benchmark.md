# Benchmark

Real-photo benchmark for GitHub issue #11 (PRD user stories 35-36).
Rerun after each model or rule change to tell whether changes helped.
No accuracy threshold is claimed — the team has not chosen one.

## Answer-sheet format

One JSON file per physical package in `benchmark/cases/*.json`:

```json
{
  "packageId": "pack-001",
  "photosDir": "photos/pack-001",
  "category": "household",
  "expectedDeclarations": [
    { "field": "mrp", "text": "Rs 199 inclusive of all taxes", "photoId": "p-back" }
  ],
  "applicableChecks": ["manufacturer", "net_quantity", "mrp", "manufacture_date", "consumer_care"],
  "expectedFindings": [
    { "ruleId": "mrp", "result": "no_issue_found" },
    { "ruleId": "manufacture_date", "result": "not_assessed", "reason": "category exception" }
  ]
}
```

- `field` is one of `manufacturer | net_quantity | mrp | manufacture_date | consumer_care`.
- `result` is one of `no_issue_found | suspected_violation | not_assessed`.
- `photosDir` is relative to `benchmark/cases/`; real photographs are
  team-supplied (see `benchmark/cases/README.md`).
- Include clear declarations, genuinely missing declarations, and
  incomplete or unreadable photo sets once photos are supplied.

Optional actual results for comparison live in
`benchmark/results/<packageId>.json`:

```json
{
  "declarations": [{ "field": "mrp", "text": "Rs 199 inclusive of all taxes" }],
  "findings": [{ "ruleId": "mrp", "result": "no_issue_found" }]
}
```

## How to run

```sh
npm run benchmark
npm run benchmark -- --json        # machine-readable output
npm run benchmark -- --help        # usage
```

## Metrics meaning

| Column | Meaning |
| --- | --- |
| fields | Expected declarations on the answer sheet |
| suspected | Expected `suspected_violation` findings |
| not-assessed | Expected `not_assessed` findings (missing evidence / inapplicable rule) |
| field-errors | Per-field extraction mismatches vs actual results (`pending` without a results file) |
| false-flags | Suspected violations the run raised that the sheet does not expect |
| missed | Expected suspected violations the run did not raise |
| photos | Files found in the case `photosDir` (`pending` until the team supplies photos) |
| ms | Sheet validation time for the case |

Footer totals: packages evaluated, total ms and ms/scan.

Comparison columns stay `pending` until a results file exists — a missing
live run is reported as pending, never as a score. Benchmark assets are
never imported by the app runtime (`scripts/benchmark.ts` uses node
builtins only; nothing in `src/` reads `benchmark/`), so cases cannot leak
into the repository or dashboard.
