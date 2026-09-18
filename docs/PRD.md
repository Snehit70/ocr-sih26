# NyayaPack: photo-based package inspection for SIH

Status: agreed product scope, 18 September 2026. This spec describes the target prototype. It does not claim the current app already behaves this way.

## Problem Statement

A person checking a retail package must inspect several photographed sides, read small declarations, decide which rules apply, and keep evidence for each finding. The current prototype can fill failed scans with sample text, report simulated font measurements, and display sample products as if they were inspections. Those behaviors make a convincing-looking report possible without evidence from the package in front of the user.

For the SIH demo, the team needs a working inspection aid that uses real package photographs and a local vision-language model. Judges should be able to see what the model read, which photograph supports it, what the rule checked, and what a reviewer changed. The app must be honest when a photo or supported rule is insufficient.

## Solution

One inspection covers one physical package and can contain several photographs. Qwen3-VL-4B, served locally through LM Studio on the same laptop as the web app, proposes the product category and declarations with image references. An explicit rule set checks only supported, applicable declarations. The team member running the demo confirms photo coverage, reviews the model's observations and suspected violations, corrects mistakes, and confirms the report. The app saves the inspection in browser-only storage, exports PDF and editable DOCX, and shows real inspection history in the repository and dashboard.

The result is an inspection aid, not legal certification. It says "no issue found in assessed checks," "suspected violation," or "insufficient evidence" before reviewer confirmation. Checks that lack evidence or rule support say "not assessed." A numeric compliance score remains an internal test measure and does not decide the result.

## User Stories

1. As a demo operator, I want to start an inspection for one package, so that all its evidence stays together.
2. As a demo operator, I want to upload several photographs of the same package, so that front, back, and side declarations can be checked together.
3. As a demo operator, I want to preview and remove a photograph before analysis, so that I can correct a mistaken upload.
4. As a demo operator, I want an optional list of broad retail categories, so that I can choose an obvious category quickly.
5. As a demo operator, I want the model to suggest a category when I leave the choice blank, so that category selection does not block a scan.
6. As a demo operator, I want my chosen category to override a model suggestion, so that an obvious model mistake does not control the rules.
7. As a reviewer, I want to correct a category and any imported or domestic indication before confirming a report, so that applicability checks use reviewed information.
8. As a demo operator, I want the app to connect to Qwen3-VL-4B in LM Studio on my laptop, so that the core demo works without internet.
9. As a demo operator, I want to set an API base URL, model identifier, and optional key, so that I can point the same prototype at a compatible online model later.
10. As a demo operator, I want a clear error when the model server fails, so that a failed scan is never presented as a real analysis.
11. As a demo operator, I want the app to have no sample inspection mode or sample records, so that every visible product came from a real upload.
12. As a reviewer, I want each proposed declaration linked to its source photograph, so that I can verify the reading.
13. As a reviewer, I want a visible region on the photograph when the model can locate a declaration reliably, so that I can find the printed text quickly.
14. As a reviewer, I want an uncertain or unreadable observation marked for review, so that the app does not invent a value or location.
15. As a reviewer, I want to confirm that the relevant package sides were photographed, so that an unseen declaration is not called missing from one partial view.
16. As a reviewer, I want to see the extracted manufacturer, packer, or importer name and address, so that I can check the package identity declaration.
17. As a reviewer, I want to see the extracted net quantity, so that I can check its presence and supported format rules.
18. As a reviewer, I want to see the extracted MRP, so that I can check its presence and supported format rules.
19. As a reviewer, I want to see the extracted date declaration where the reviewed rule requires one, so that the app does not apply a universal packing or import date check.
20. As a reviewer, I want to see consumer care details, so that I can check the supported contact declaration.
21. As a reviewer, I want every check to show its source and effective date, so that I can understand why the app raised it.
22. As a reviewer, I want unsupported, inapplicable, or unobservable checks marked "not assessed," so that they do not appear to pass or fail.
23. As a reviewer, I want poor photograph quality flagged, so that I know when to capture another view.
24. As a reviewer, I want font height checked only when a known-size reference is visible, so that the app does not present pixel estimates as millimetres.
25. As a reviewer, I want uncertain placement or potentially misleading wording left for my review, so that the app does not assert a violation it cannot establish.
26. As a reviewer, I want to correct extracted text while retaining the original model reading, so that the final report is accurate and the change is traceable.
27. As a reviewer, I want to accept or reject each suspected violation, so that the confirmed report reflects my decision.
28. As a reviewer, I want to confirm a report only after reviewing its evidence, so that exports cannot look final while checks are still pending.
29. As a demo operator, I want a saved inspection to reopen with its photographs after a reload, so that I can show its evidence again.
30. As a demo operator, I want to search and filter saved inspections, so that I can retrieve a report during the demo.
31. As a demo operator, I want dashboard totals calculated from real saved inspections, so that the dashboard matches what I scanned.
32. As a demo operator, I want a clear empty state when nothing has been scanned, so that the app does not imply inspection activity that never happened.
33. As a reviewer, I want a PDF containing reviewed findings and evidence, so that I can share a fixed report.
34. As a reviewer, I want a DOCX containing reviewed findings and evidence, so that I can edit the report after download.
35. As a team member, I want a fixed set of labelled real package photos, so that I can rerun a benchmark after each model or rule change.
36. As a team member, I want the benchmark to report extraction errors, false flags, missed issues, unassessed cases, and time per scan, so that I can tell whether changes helped.

## Implementation Decisions

- Keep the existing web app and its main scan, report, repository, and dashboard journeys. Replace the behaviors that contradict this spec rather than building a second app.
- Treat an inspection as one package with many photographs. Store image bytes and inspection records in browser-only storage that survives a reload, such as IndexedDB. There is no server database or account sync. Small preferences may use localStorage.
- Use a model connection boundary that accepts photographs and current configuration and returns validated, structured observations, image references, a category suggestion, and quality notes. An invalid response is an error or an observation needing review, never a silent success.
- Connect to the local LM Studio server by default. Expose base URL, model identifier, and optional API key in configuration for a later compatible online endpoint. Keep the key in memory for the current session only. The online provider and exact remote model are undecided; local operation is the required path.
- Offer Auto-detect, Food and beverages, Personal care, Household products, and Other as broad category choices. A manual choice wins over model inference. An uncertain inference may remain unknown. Category names assist review and do not alone establish legal applicability.
- The rule catalog contains each supported check's source link, exact citation, effective date, applicability conditions, and expected declaration. The team reviews its wording against official sources before the demo. The first set covers manufacturer, packer or importer name and address; net quantity; MRP; an applicable month and year declaration; and consumer care details. The date check must follow the reviewed current wording and category exceptions, not a universal packing or import date assumption.
- Separate observed declarations, rule results, and reviewer decisions. Preserve the original model reading beside any correction and the supporting image. A rule may mark a declaration missing only after applicable rule support, readable relevant views, and reviewer confirmation of photo coverage.
- Use "no issue found," "suspected violation," and "not assessed" for individual checks as appropriate. The report headline uses the three agreed phrases. The internal numeric score does not convert a failed required check into a pass or claim legal compliance.
- Check physical font height only with a usable known-size reference and the measurements needed by the supported rule. If those are missing, show not assessed. Show poor photo quality and uncertain placement as review prompts. Leave misleading wording to the reviewer.
- Let the reviewer edit observations and findings, then confirm the report. PDF and DOCX use the confirmed values, rule citations, and evidence. A report with pending review is visibly a draft.
- Derive repository entries, dashboard totals, and violation summaries only from saved real inspections. Remove sample records, fixed counts, and the fallback that substitutes sample text after model failure. Keep benchmark fixtures separate from app runtime data.
- Run the app and LM Studio on the same laptop for local testing and the core SIH demo. If an optional online endpoint is configured later, a model error still produces an error rather than a substitute report.

## Testing Decisions

- Test observable behavior through the full inspection flow: upload, model response, rule result, reviewer correction, save, reopen, export, and dashboard. Use a controlled model server response for repeatable contract tests. The test checks what the user sees and saves, not the internal prompt or component structure.
- Run a separate benchmark against real package photographs and a human-written answer sheet. Include clear declarations, genuine missing declarations, and incomplete or unreadable photo sets. Keep those photographs out of the runtime sample data.
- Exercise the failure path with LM Studio unavailable or returning invalid output. No inspection report may be created from fabricated fallback text.
- Exercise category auto-detection and manual override, photo coverage confirmation, not-assessed rules, unscaled font checks, reviewer corrections, and retention of original observations.
- Verify that a saved inspection reopens with its photographs after reload, PDF and DOCX contain reviewed values and evidence, and an empty store gives zero dashboard counts and no sample cards.
- Report per-field extraction accuracy, false suspected violations, missed known issues, not-assessed cases, and scan time on the fixed benchmark. There is no numeric accuracy threshold yet because the team has not assembled the labelled set.
- The repository currently has no test files or browser-test setup. The first implementation slice should add the smallest test setup that can exercise the full flow. Focused rule tests are useful for applicability edge cases that are hard to isolate through the UI.

## Out of Scope

- E-commerce listings, mobile capture, and batch marketplace crawling.
- Login, role-based access, a category wizard, account sync, a server database, and deployment to a remote host.
- A legal certification or automatic enforcement decision.
- Automatic verdicts about misleading wording, uncertain placement, or physical font size without a usable scale.
- Sample products, fabricated dashboard counts, or fallback sample reports.
- A fixed online provider or remote model. The configuration field is included, but local LM Studio must work first.

## Further Notes

The current prototype uses browser Tesseract OCR, a single photo, regex checks, simulated font measurements, a weighted overall score, and localStorage reports with short-lived `blob:` image URLs. The scan can substitute sample text after OCR failure. The dashboard and repository merge saved reports with sample data and fixed totals. PDF and JSON export exist; DOCX export does not. There is no working login or model API connection. These are confirmed code observations, not product requirements.

The terms "inspection," "observed declaration," "reviewed declaration," "suspected violation," and "not assessed" follow the project's glossary. The accepted decisions on model observation, reviewer confirmation, and unknown results are recorded in the project's ADRs. A separate official-source note supports the rule catalog; it is research input, not a claim that the app covers every legal exception.

The benchmark needs real photographs and an answer sheet from the team. The online provider, remote model identifier, and any numeric accuracy target may be chosen after local testing. They do not block the first implementation slices. The official source note records why the date declaration needs category-specific treatment: the [2021 Gazette amendment](https://egazette.gov.in/WriteReadData/2021/230946.pdf) removed "or pre-packed or imported" from Rule 6(1)(d).

Implementation tickets: [#2 remove sample fallbacks](https://github.com/kvm404/ocr-sih26/issues/2), [#3 connect LM Studio](https://github.com/kvm404/ocr-sih26/issues/3), [#4 save multiple photos](https://github.com/kvm404/ocr-sih26/issues/4), [#5 extract declarations](https://github.com/kvm404/ocr-sih26/issues/5), [#6 apply cited rules](https://github.com/kvm404/ocr-sih26/issues/6), [#7 review findings](https://github.com/kvm404/ocr-sih26/issues/7), [#8 measure readability](https://github.com/kvm404/ocr-sih26/issues/8), [#9 export reports](https://github.com/kvm404/ocr-sih26/issues/9), [#10 real inspection history](https://github.com/kvm404/ocr-sih26/issues/10), and [#11 benchmark and demo setup](https://github.com/kvm404/ocr-sih26/issues/11). The model connection and photo storage can start independently; extraction uses both; rules, review, and exports follow the resulting inspection data.
