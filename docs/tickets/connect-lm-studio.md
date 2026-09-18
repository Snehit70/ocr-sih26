Part of #1. The prototype uses browser Tesseract today. The SIH workflow needs Qwen3-VL-4B served by LM Studio on the same laptop, with a configuration field for a later compatible online endpoint.

## Outcome

The app can test and call the local model server without internet. An operator can configure the API base URL, model identifier, and optional key without editing code.

## Acceptance

- Default to the local LM Studio API, while allowing a compatible base URL and model identifier to be changed in settings.
- Accept an optional API key for a later online endpoint. Keep the key in session memory only; exclude it from browser storage, logs, reports, and exports.
- Send a real photograph through the model connection and return the server's response to the analysis boundary.
- Show a clear connectivity, timeout, or model error. Do not create a substitute report.
- Verify connection success and failure through a controlled model server response.

The exact online provider and remote model are intentionally undecided. Structured field extraction is a separate issue. LM Studio's [OpenAI-compatible image endpoint](https://lmstudio.ai/docs/developer/openai-compat) is a supported starting point.
