/**
 * Persisted model-endpoint preferences for the LM Studio connection.
 *
 * Only `baseUrl` and `model` are ever persisted (localStorage). The optional
 * API key is intentionally absent from this module — it lives in session
 * memory only inside `model-client.ts` and must never be written to browser
 * storage, logs, reports, or exports.
 */

export interface ModelConfig {
  /** OpenAI-compatible base URL, e.g. "http://localhost:1234/v1". */
  baseUrl: string;
  /** Model identifier, e.g. "qwen3-vl-4b". */
  model: string;
}

/** Default local LM Studio OpenAI-compatible endpoint. */
export const DEFAULT_BASE_URL = "http://localhost:1234/v1";

/** Default local vision model served through LM Studio (exact served id). */
export const DEFAULT_MODEL_ID = "qwen/qwen3-vl-4b";

/** localStorage key for the persisted (non-secret) preferences. */
export const MODEL_CONFIG_STORAGE_KEY = "nyayapack.model-config.v1";

/** Remove surrounding whitespace and trailing slashes so URL joining is safe. */
export function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

/** Defaults used before any saved preferences exist. */
export function defaultModelConfig(): ModelConfig {
  return { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL_ID };
}

function isValidPersisted(value: unknown): value is Partial<ModelConfig> {
  if (value === null || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return (
    (rec.baseUrl === undefined || typeof rec.baseUrl === "string") &&
    (rec.model === undefined || typeof rec.model === "string")
  );
}

/**
 * Read persisted preferences. Returns null when nothing valid is stored.
 * Deliberately ignores any `apiKey` field that may exist from older data.
 */
export function loadPersistedModelConfig(): ModelConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MODEL_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPersisted(parsed)) return null;
    const baseUrl =
      typeof parsed.baseUrl === "string" && parsed.baseUrl.trim()
        ? normalizeBaseUrl(parsed.baseUrl)
        : DEFAULT_BASE_URL;
    const model =
      typeof parsed.model === "string" && parsed.model.trim()
        ? parsed.model.trim()
        : DEFAULT_MODEL_ID;
    return { baseUrl, model };
  } catch {
    return null;
  }
}

/** Persist only baseUrl + model. Never pass an API key here. */
export function persistModelConfig(config: ModelConfig): void {
  if (typeof window === "undefined") return;
  const safe: ModelConfig = {
    baseUrl: normalizeBaseUrl(config.baseUrl) || DEFAULT_BASE_URL,
    model: config.model.trim() || DEFAULT_MODEL_ID,
  };
  window.localStorage.setItem(MODEL_CONFIG_STORAGE_KEY, JSON.stringify(safe));
}

/** Remove persisted preferences (key is unaffected — it is never stored). */
export function clearPersistedModelConfig(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MODEL_CONFIG_STORAGE_KEY);
  } catch {
    // Storage may be unavailable (private mode); defaults still apply.
  }
}
