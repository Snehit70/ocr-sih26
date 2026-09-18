Part of #1. The current scan can substitute sample text after OCR failure, the upload offers sample labels, and an unknown report ID can open a sample report. A real photograph must never produce a report from unrelated text.

## Outcome

Every report shown as an inspection comes from an uploaded package photograph and a successful analysis. A failed scan leaves the inspection unfinished.

## Acceptance

- Remove sample-label controls and automatic sample-text fallback from the inspection flow.
- A failed, empty, or invalid analysis shows an error, creates no report, and does not navigate to a report page.
- An unknown report ID shows a not-found state, not a sample report.
- Preserve existing user-created browser records; do not clear storage as a shortcut.
- Verify the failed and empty result paths with repeatable tests.

Dashboard and repository sample records are handled in a separate issue.
