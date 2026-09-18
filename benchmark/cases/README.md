# Benchmark cases

Each `*.json` file here is a human-written answer sheet for one physical
package. Real package photographs are **team-supplied** and live in the
`photosDir` named by each sheet (relative to this directory, e.g.
`photos/<packageId>/`). The directory starts with one synthetic
documentation example (`synthetic-doc-001.json`) whose photos are not
included — it shows the format only.

Sheet format (see `docs/benchmark.md`):

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
    { "ruleId": "mrp", "result": "no_issue_found" }
  ]
}
```

Include clear declarations, genuinely missing declarations, and
incomplete or unreadable photo sets once photos are supplied. There is no
accuracy threshold — the team has not chosen one.

Benchmark assets are never imported by the app runtime (`scripts/benchmark.ts`
imports node builtins only, and nothing in `src/` reads this directory), so
cases here cannot leak into the repository or dashboard.
