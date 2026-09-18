"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FlaskConical, ImagePlus, Loader2, PlugZap, RotateCcw, Send, Trash2, X, XCircle } from "lucide-react";
import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL_ID,
  ModelClientError,
  chatVisionText,  clearApiKey,
  getModelConfig,
  hasApiKey,
  resetModelConfig,
  setApiKey,
  setModelConfig,
  testConnection,
} from "@/lib/model-client";
import { photoBlobToJpegDataUrl } from "@/lib/image";

type TestState =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type BenchState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; text: string; elapsedMs: number; model?: string }
  | { kind: "error"; message: string };

const BENCH_DEFAULT_PROMPT = "Transcribe all text visible in this image. Reply with the transcription only.";

export default function SettingsPage() {
  const [baseUrl, setBaseUrl] = useState<string>(DEFAULT_BASE_URL);
  const [model, setModel] = useState<string>(DEFAULT_MODEL_ID);
  const [keyInput, setKeyInput] = useState<string>("");
  const [keyInMemory, setKeyInMemory] = useState<boolean>(false);
  const [testState, setTestState] = useState<TestState>({ kind: "idle" });
  const [notice, setNotice] = useState<string | null>(null);
  const benchInputRef = useRef<HTMLInputElement | null>(null);
  const [benchPreview, setBenchPreview] = useState<string | null>(null);
  const [benchName, setBenchName] = useState<string | null>(null);
  const [benchPrompt, setBenchPrompt] = useState<string>(BENCH_DEFAULT_PROMPT);
  const [benchSystem, setBenchSystem] = useState<string>("");
  const [benchState, setBenchState] = useState<BenchState>({ kind: "idle" });

  useEffect(() => {
    const current = getModelConfig();
    setBaseUrl(current.baseUrl);
    setModel(current.model);
    setKeyInMemory(hasApiKey());
  }, []);

  function handleSave() {
    const next = setModelConfig({
      baseUrl: baseUrl.trim() || DEFAULT_BASE_URL,
      model: model.trim() || DEFAULT_MODEL_ID,
    });
    setBaseUrl(next.baseUrl);
    setModel(next.model);
    // Key update (when the field is touched) stays in session memory only.
    if (keyInput.trim()) {
      setApiKey(keyInput);
      setKeyInput("");
      setKeyInMemory(true);
    }
    setNotice("Settings saved. Base URL and model persist locally; the API key stays in session memory only.");
    setTestState({ kind: "idle" });
  }

  function handleClearKey() {
    clearApiKey();
    setKeyInput("");
    setKeyInMemory(false);
    setNotice("In-memory API key cleared.");
  }

  function handleReset() {
    const next = resetModelConfig();
    setBaseUrl(next.baseUrl);
    setModel(next.model);
    setNotice("Reset to local LM Studio defaults.");
    setTestState({ kind: "idle" });
  }

  async function handleBenchFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setBenchState({ kind: "error", message: "That file is not an image — pick a photo of a package label." });
      return;
    }
    setBenchState({ kind: "idle" });
    try {
      // Normalize to JPEG like the scan flow: phone HEIC/WebP fail server-side.
      setBenchPreview(await photoBlobToJpegDataUrl(file));
      setBenchName(file.name);
    } catch (err) {
      setBenchPreview(null);
      setBenchName(null);
      setBenchState({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not read that image file.",
      });
    }
  }

  function handleBenchClear() {
    setBenchPreview(null);
    setBenchName(null);
    setBenchState({ kind: "idle" });
    if (benchInputRef.current) benchInputRef.current.value = "";
  }

  async function handleBenchSend() {
    if (benchState.kind === "sending") return;
    if (!benchPreview) {
      setBenchState({ kind: "error", message: "Upload a test image first." });
      return;
    }
    setBenchState({ kind: "sending" });
    try {
      const result = await chatVisionText(benchPreview, benchPrompt, {
        systemPrompt: benchSystem.trim() ? benchSystem : undefined,
      });
      setBenchState({ kind: "done", text: result.text, elapsedMs: result.elapsedMs, model: result.model });
    } catch (err) {
      const message =
        err instanceof ModelClientError
          ? `[${err.code}] ${err.message}`
          : err instanceof Error
            ? err.message
            : "Test request failed unexpectedly.";
      setBenchState({ kind: "error", message });
    }
  }

  async function handleTest() {
    setTestState({ kind: "testing" });
    setNotice(null);
    try {
      const result = await testConnection();
      if (result.configuredModelFound === false) {
        setTestState({
          kind: "success",
          message: `Connected to ${result.baseUrl}. Server lists ${result.models.length} model(s), but "${model.trim()}" is not among them — load it in LM Studio.`,
        });
      } else if (result.models.length > 0) {
        setTestState({
          kind: "success",
          message: `Connected to ${result.baseUrl}. Found ${result.models.length} model(s): ${result.models.slice(0, 5).join(", ")}${result.models.length > 5 ? "…" : ""}`,
        });
      } else {
        setTestState({
          kind: "success",
          message: `Connected to ${result.baseUrl}. The server answered but listed no models.`,
        });
      }
    } catch (err) {
      const message =
        err instanceof ModelClientError
          ? `[${err.code}] ${err.message}`
          : err instanceof Error
            ? err.message
            : "Connection test failed unexpectedly.";
      setTestState({ kind: "error", message });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Model Settings
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Point the prototype at local LM Studio (default) or a compatible OpenAI-style
        endpoint. Photos are sent to this server by the scan flow.
      </p>

      <div className="mt-5 space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <PlugZap className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Endpoint
          </h2>

          <label htmlFor="model-base-url" className="mt-4 block text-xs font-medium text-slate-700">
            API base URL
          </label>
          <input
            id="model-base-url"
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={DEFAULT_BASE_URL}
            spellCheck={false}
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <label htmlFor="model-id" className="mt-4 block text-xs font-medium text-slate-700">
            Model identifier
          </label>
          <input
            id="model-id"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={DEFAULT_MODEL_ID}
            spellCheck={false}
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <label htmlFor="model-key" className="mt-4 block text-xs font-medium text-slate-700">
            API key <span className="font-normal text-slate-500">(optional, session memory only)</span>
          </label>
          <input
            id="model-key"
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={keyInMemory ? "Key held in memory (enter a new one to replace)" : "Not needed for local LM Studio"}
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Status: {keyInMemory ? "a key is held in session memory." : "no key in memory."} The
            key is never saved to browser storage and never appears in reports or exports.
          </p>

          {notice ? (
            <p className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              {notice}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800"
            >
              Save settings
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testState.kind === "testing"}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {testState.kind === "testing" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <PlugZap className="h-4 w-4" aria-hidden="true" />
              )}
              Test connection
            </button>
            <button
              type="button"
              onClick={handleClearKey}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Clear key
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset defaults
            </button>
          </div>

          {testState.kind === "success" ? (
            <p className="mt-3 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{testState.message}</span>
            </p>
          ) : null}
          {testState.kind === "error" ? (
            <p className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{testState.message}</span>
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FlaskConical className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Model test bench
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Upload any photo and send it to the configured model with your own prompt — a
            quick way to check what the model sees before running the scan flow.
          </p>

          <input
            ref={benchInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Upload a test image"
            onChange={(e) => {
              handleBenchFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          {benchPreview ? (
            <div className="mt-3 flex items-start gap-3">
              <img
                src={benchPreview}
                alt="Test image preview"
                className="h-28 w-28 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{benchName ?? "test image"}</p>
                <button
                  type="button"
                  onClick={handleBenchClear}
                  className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => benchInputRef.current?.click()}
              className="mt-3 flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/50"
            >
              <ImagePlus className="h-7 w-7 text-blue-700" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-900">Upload a test image</span>
              <span className="text-xs text-slate-500">On a phone this opens the camera or gallery</span>
            </button>
          )}

          <label htmlFor="bench-system" className="mt-4 block text-xs font-medium text-slate-700">
            System prompt <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="bench-system"
            type="text"
            value={benchSystem}
            onChange={(e) => setBenchSystem(e.target.value)}
            placeholder="e.g. You answer only in rhymes."
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <label htmlFor="bench-prompt" className="mt-3 block text-xs font-medium text-slate-700">
            Prompt sent with the image
          </label>
          <textarea
            id="bench-prompt"
            value={benchPrompt}
            onChange={(e) => setBenchPrompt(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <button
            type="button"
            onClick={handleBenchSend}
            disabled={benchState.kind === "sending" || !benchPreview}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {benchState.kind === "sending" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            {benchState.kind === "sending" ? "Asking model…" : "Send to model"}
          </button>

          {benchState.kind === "done" ? (
            <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-medium text-green-800">
                Reply{benchState.model ? ` from ${benchState.model}` : ""} · {(benchState.elapsedMs / 1000).toFixed(1)}s
              </p>
              <pre className="mt-1.5 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800">
                {benchState.text}
              </pre>
            </div>
          ) : null}
          {benchState.kind === "error" ? (
            <p className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{benchState.message}</span>
            </p>
          ) : null}
        </section>

        <p className="text-xs text-slate-500">
          Defaults: {DEFAULT_BASE_URL} · {DEFAULT_MODEL_ID}.{" "}
          <Link href="/scan" className="font-medium text-blue-700 hover:text-blue-800">
            Back to scan
          </Link>
        </p>
      </div>
    </div>
  );
}
