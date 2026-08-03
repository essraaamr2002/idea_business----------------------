/**
 * FaceOnLive IDKit integration — server-only.
 * Mirrors the open-source `verification.service.js` (id_recognition,
 * face_liveness, compare_face, id_liveness) using fetch + SSE so it runs
 * inside Cloudflare Workers without axios/Node streams.
 *
 * Configuration (set via add_secret on Lovable Cloud):
 *   FACEONLIVE_SERVER_URL              — main Gradio server (required to enable)
 *   FACEONLIVE_ACCESS_TOKEN            — bearer token (required)
 *   FACEONLIVE_DOCUMENT_LIVENESS_URL   — optional separate doc-liveness server
 */

export type FoLOcr = {
  name?: string;
  dateOfBirth?: string;
  identityCardNumber?: string;
  personalNumber?: string;
  validState?: number;
  [k: string]: unknown;
};

export type FoLRecognition = {
  documentName?: string;
  countryName?: string;
  score?: number;
  ocr?: FoLOcr;
  image?: {
    portrait?: string | null;
    signature?: string | null;
    documentFrontSide?: string | null;
    documentBackSide?: string | null;
  };
  nation?: Record<string, unknown>;
  id?: string;
};

export type FoLLiveness = {
  is_live: boolean;
  liveness_score: number;
  face_rect?: unknown;
  angles?: unknown;
};

export type FoLFaceCompare = {
  result: string; // e.g. "match" | "no match"
  similarity: number; // 0..1
};

export type FoLDocLiveness = {
  is_live: boolean;
  screenreplay_score?: number;
  portraitreplace_score?: number;
  printedcutout_score?: number;
};

const STREAM_TIMEOUT_MS = 30000;

export function isFaceOnLiveConfigured(): boolean {
  return Boolean(process.env.FACEONLIVE_SERVER_URL && process.env.FACEONLIVE_ACCESS_TOKEN);
}

function getMainClient() {
  const baseURL = process.env.FACEONLIVE_SERVER_URL;
  const token = process.env.FACEONLIVE_ACCESS_TOKEN;
  if (!baseURL || !token) throw new Error("FaceOnLive not configured");
  return { baseURL: baseURL.replace(/\/+$/, ""), token };
}

function getDocLivenessClient() {
  const baseURL = process.env.FACEONLIVE_DOCUMENT_LIVENESS_URL;
  const token = process.env.FACEONLIVE_ACCESS_TOKEN;
  if (!baseURL || !token) return null;
  return { baseURL: baseURL.replace(/\/+$/, ""), token };
}

async function postEvent(
  client: { baseURL: string; token: string },
  endpoint: string,
  base64Payload: string[],
): Promise<string> {
  const res = await fetch(`${client.baseURL}/gradio_api/call/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${client.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(base64Payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`FaceOnLive POST ${endpoint} failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { event_id?: string };
  if (!json.event_id) throw new Error(`FaceOnLive: missing event_id from ${endpoint}`);
  return json.event_id;
}

async function readSseComplete(
  client: { baseURL: string; token: string },
  endpoint: string,
  eventId: string,
): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), STREAM_TIMEOUT_MS);
  try {
    const res = await fetch(`${client.baseURL}/gradio_api/call/${endpoint}/${eventId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${client.token}`,
        Accept: "text/event-stream",
      },
      signal: ctrl.signal,
    });
    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => "");
      throw new Error(`FaceOnLive SSE ${endpoint} failed (${res.status}): ${txt.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";
      for (const ev of events) {
        if (!ev.startsWith("event: complete")) continue;
        const dataLine = ev.split("\n").find((l) => l.startsWith("data: "));
        if (!dataLine) continue;
        try {
          const parsed = JSON.parse(dataLine.slice(6));
          if (Array.isArray(parsed) && parsed[0] !== undefined) {
            return parsed[0];
          }
        } catch (err) {
          console.warn("[FaceOnLive] failed to parse SSE chunk", err);
        }
      }
    }
    throw new Error(`FaceOnLive SSE ${endpoint} ended without complete event`);
  } finally {
    clearTimeout(timer);
  }
}

async function callEndpoint<T>(
  endpoint: string,
  base64Payload: string[],
  client = getMainClient(),
): Promise<T> {
  const eventId = await postEvent(client, endpoint, base64Payload);
  // Give the server a moment to start processing (mirrors the reference impl).
  await new Promise((r) => setTimeout(r, 1500));
  const data = await readSseComplete(client, endpoint, eventId);
  return data as T;
}

/* ============= public helpers ============= */

export async function fetchUrlAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buf.byteLength; i++) binary += String.fromCharCode(buf[i]);
  // btoa is available in the Worker runtime.
  // eslint-disable-next-line no-undef
  return btoa(binary);
}

export async function recognizeIdDocument(
  frontBase64: string,
  backBase64?: string | null,
): Promise<FoLRecognition> {
  const endpoint = backBase64 ? "id_recognition_base64" : "id_recognition_oneside_base64";
  const payload = backBase64 ? [frontBase64, backBase64] : [frontBase64];
  const raw = await callEndpoint<{ data?: FoLRecognition } | FoLRecognition>(endpoint, payload);
  const result: FoLRecognition =
    raw && typeof raw === "object" && "data" in raw && raw.data
      ? (raw as { data: FoLRecognition }).data
      : (raw as FoLRecognition);
  if (!result || !result.documentName) {
    throw new Error("FaceOnLive: لم يتم التعرف على نوع الوثيقة");
  }
  return result;
}

export async function checkFaceLiveness(faceBase64: string): Promise<FoLLiveness> {
  const raw = await callEndpoint<{
    status?: string;
    data?: { result?: string; liveness_score?: number; face_rect?: unknown; angles?: unknown };
  }>("face_liveness_base64", [faceBase64]);
  const d = raw?.data ?? {};
  if (d.result === "no face detected!") {
    return { is_live: false, liveness_score: 0, face_rect: d.face_rect, angles: d.angles };
  }
  return {
    is_live: d.result === "genuine",
    liveness_score: Number(d.liveness_score ?? 0),
    face_rect: d.face_rect,
    angles: d.angles,
  };
}

export async function compareFaces(
  faceA_base64: string,
  faceB_base64: string,
): Promise<FoLFaceCompare> {
  const raw = await callEndpoint<{ data?: { result?: string; similarity?: number } }>(
    "compare_face_base64",
    [faceA_base64, faceB_base64],
  );
  return {
    result: String(raw?.data?.result ?? "unknown"),
    similarity: Number(raw?.data?.similarity ?? 0),
  };
}

export async function checkDocumentLiveness(
  documentBase64: string,
): Promise<FoLDocLiveness | null> {
  const client = getDocLivenessClient();
  if (!client) return null;
  const raw = await callEndpoint<{
    data?: {
      result?: string;
      screenreplay_integrity_score?: number;
      portraitreplace_integrity_score?: number;
      printedcutout_integrity_score?: number;
    };
  }>("id_liveness_base64", [documentBase64], client);
  const d = raw?.data ?? {};
  return {
    is_live: d.result === "genuine",
    screenreplay_score: Number(d.screenreplay_integrity_score ?? 0),
    portraitreplace_score: Number(d.portraitreplace_integrity_score ?? 0),
    printedcutout_score: Number(d.printedcutout_integrity_score ?? 0),
  };
}
