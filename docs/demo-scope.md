# SIH demo scope

The first demo assesses physical retail packages from photographs. One inspection can contain several photographs of the same package. A vision-language model proposes declarations and their image locations; rules check the supported declarations; a team member acting as reviewer checks the result before export.

## Agreed behavior

- Accept mixed retail packages, but show "not assessed" where the photographs or supported rules do not justify a result.
- Check the common declaration groups named in the problem statement. Apply the date declaration only where the reviewed rule requires it; do not assume a universal packing or import date check. Keep other category-specific checks outside the first rule set unless the team adds and reviews them.
- Require the reviewer to confirm relevant package sides were photographed before treating an unseen declaration as missing.
- Check physical font height only when a photograph includes a usable known-size reference.
- Show "no issue found in assessed checks," "suspected violation," or "insufficient evidence" as the report headline before reviewer confirmation. Keep the numeric compliance score for internal testing only.
- Let the reviewer correct extracted text and accept or reject suspected violations. Preserve the model's original observation beside the source photograph.
- Store inspections, photographs, and reports in browser-only storage that survives reload, such as IndexedDB. A shared database is outside the current demo scope.
- Record the source and effective date of each supported rule. The team reviews rule wording before the demo.
- Run Qwen3-VL-4B locally through LM Studio for current testing. The prototype may also accept an API key for an online model connection during SIH evaluation if internet is available.
- Run the web app and LM Studio on the same laptop for the local demo.
- Show an error if the model call fails, with no sample fallback. There is no sample data in the upload flow, repository, report view, or dashboard.
- Let the operator choose a broad category or leave it blank for model inference. A manual choice takes precedence.
- Edit the report in the app, then export PDF and DOCX files.
- Use one reviewer workflow without a login screen or wizard in this prototype.
- Show the image region behind each observed declaration. Flag poor photographs for review. Leave claims about misleading wording to the reviewer.

## Still open

- Which labelled package photographs form the benchmark and what accuracy counts as good enough.
- Which online provider would supply the optional API key, if that mode is needed for the demo. Local LM Studio is the required path.
