# Demo setup (same-laptop local run)

Covers GitHub issue #11: starting the app and LM Studio on one laptop for
SIH evaluation. Local LM Studio is the required path; the optional online
endpoint is not a prerequisite.

## 1. Start the app

```sh
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:3000`).

## 2. Start LM Studio and load Qwen3-VL-4B

1. Open LM Studio on the same laptop.
2. Download/load the **Qwen3-VL-4B** vision model.
3. Enable the local server (Developer / Server tab) so it serves an
   OpenAI-compatible endpoint at `http://localhost:1234/v1`.

## 3. Point the app at the local endpoint

1. Open `/settings` in the app.
2. Set **base URL** to `http://localhost:1234/v1`.
3. Set **model** to the loaded model id (`qwen3-vl-4b` by default).
4. Leave the API key empty for local LM Studio (it is optional and, when
   set, lives in session memory only).
5. Press **Test connection**. Expect a connected message listing the
   server's models. If the configured model is not among them, load it in
   LM Studio and retry.

Settings persist base URL + model locally; the API key is never stored.

## 4. Live-model check

1. Go to the scan flow and upload 2+ photographs of one package.
2. Run analysis. Each proposed declaration should cite its source
   photograph; uncertain readings are marked for review, never invented.
3. Confirm photo coverage, review/correct the observations, accept or
   reject suspected violations, then confirm the report.
4. A stopped LM Studio (or invalid output) must show a clear error and
   create no report — never a substitute analysis.

## Optional online endpoint

The same `/settings` fields accept a compatible OpenAI-style endpoint plus
an optional API key for evaluation with internet access. Local LM Studio
must work first; a model error in either mode produces an error, not a
fallback report.

## Out of scope for this demo

E-commerce capture, login, server database, deployment to a remote host,
and any legal-certification claim. The report is an inspection aid.
