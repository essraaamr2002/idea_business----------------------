// Direct Google Gemini provider via OpenAI-compatible endpoint.
// Uses GEMINI_API_KEY (free tier from https://aistudio.google.com/apikey).
// No Lovable AI Gateway billing.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

// Map legacy gateway ids → real Gemini model ids on Google's free tier.
const MODEL_ALIASES: Record<string, string> = {
  "google/gemini-3-flash-preview": "gemini-2.5-flash",
  "google/gemini-3.5-flash": "gemini-2.5-flash",
  "google/gemini-2.5-flash": "gemini-2.5-flash",
  "google/gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
  "google/gemini-2.5-pro": "gemini-2.5-pro",
  "google/gemini-2.0-flash": "gemini-2.0-flash",
};

function normalizeModel(id: string): string {
  if (MODEL_ALIASES[id]) return MODEL_ALIASES[id];
  if (id.startsWith("google/")) return id.slice("google/".length);
  return id;
}

// Backward-compatible signature; ignores Lovable-specific args.
export function createLovableAiGatewayProvider(
  apiKeyOrIgnored?: string,
  _initialRunId?: string,
  _options?: { structuredOutputs?: boolean },
) {
  const apiKey = process.env.GEMINI_API_KEY || apiKeyOrIgnored || "";
  const provider = createOpenAICompatible({
    name: "gemini",
    baseURL: GEMINI_BASE,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const wrapped = (id: string) => provider(normalizeModel(id));
  return Object.assign(wrapped, {
    getRunId: () => undefined as string | undefined,
    waitForRunId: async () => undefined as string | undefined,
  });
}

// Kept for import compatibility.
export function createLovableAiGatewayRunIdFetch() {
  return {
    fetch: (input: any, init?: any) => fetch(input, init),
    getRunId: () => undefined,
    waitForRunId: async () => undefined,
  };
}
