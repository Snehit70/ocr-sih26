Part of #1. Depends on the complete inspection flow. The team will supply real package photographs and human-written expected answers; there is no numeric accuracy target yet.

## Outcome

The team can rerun the same full-flow tests and real-photo benchmark, then start the app and LM Studio on one laptop for SIH evaluation.

## Acceptance

- Add the smallest repeatable test setup that exercises photo upload, controlled model response, rules, review, local save/reopen, export, and dashboard. Assert user-visible results rather than internal prompt details.
- Test the stopped or invalid model response path. It must show an error and create no report.
- Define a benchmark answer-sheet format for real packages with expected declaration text, source photo, category, applicable checks, and expected findings. Include clear, genuinely missing, and incomplete or unreadable cases once photos are supplied.
- Report field extraction errors, false suspected violations, missed known issues, not-assessed cases, scan time, and the number of packages evaluated. Do not claim an accuracy threshold before the team chooses one.
- Keep benchmark assets out of the app's runtime repository and dashboard.
- Document the same-laptop startup sequence, LM Studio model selection, local endpoint configuration, and how to check that the live model flow works. The optional online provider is not a prerequisite.
