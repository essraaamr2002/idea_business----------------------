import { timingSafeEqual } from "node:crypto";

export const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

export function noStoreJson(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": JSON_CONTENT_TYPE,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

export function isSameOriginRequest(request: Request): boolean {
  const expected = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin) return origin === expected;
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === expected;
    } catch {
      return false;
    }
  }
  // Non-browser clients commonly omit both headers and still require bearer auth.
  return true;
}

export function enforceJsonRequest(request: Request, maxBytes = 32_768): Response | null {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return noStoreJson({ error: "Unsupported media type" }, 415);
  }
  const rawLength = request.headers.get("content-length");
  if (rawLength) {
    const length = Number(rawLength);
    if (!Number.isFinite(length) || length < 0 || length > maxBytes) {
      return noStoreJson({ error: "Payload too large" }, 413);
    }
  }
  return null;
}

export async function readTextLimited(
  request: Request,
  maxBytes: number,
): Promise<string | Response> {
  const rawLength = request.headers.get("content-length");
  if (rawLength) {
    const length = Number(rawLength);
    if (!Number.isFinite(length) || length < 0 || length > maxBytes) {
      return noStoreJson({ error: "Payload too large" }, 413);
    }
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return noStoreJson({ error: "Payload too large" }, 413);
  }
  return text;
}

export function constantTimeSecretEqual(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
