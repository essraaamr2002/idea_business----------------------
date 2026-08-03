// UTM helper for smart referral / marketing links
export type UtmSource = "wa" | "x" | "tg" | "fb" | "ig" | "linkedin" | "email" | "copy" | "qr";

export function buildUtmUrl(base: string, opts: {
  source: UtmSource;
  medium?: string;
  campaign?: string;
  content?: string;
}) {
  try {
    const u = new URL(base);
    u.searchParams.set("utm_source", opts.source);
    u.searchParams.set("utm_medium", opts.medium ?? "referral");
    u.searchParams.set("utm_campaign", opts.campaign ?? "invite_friends");
    if (opts.content) u.searchParams.set("utm_content", opts.content);
    return u.toString();
  } catch {
    return base;
  }
}

const STORAGE_KEY = "fb_utm_v1";

export function captureUtmFromLocation() {
  if (typeof window === "undefined") return;
  try {
    const sp = new URLSearchParams(window.location.search);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const found: Record<string, string> = {};
    let any = false;
    for (const k of keys) {
      const v = sp.get(k);
      if (v) { found[k] = v; any = true; }
    }
    if (any) {
      found["ts"] = String(Date.now());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    }
  } catch {}
}

export function getStoredUtm(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
