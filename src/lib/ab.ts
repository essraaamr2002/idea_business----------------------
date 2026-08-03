// Simple A/B testing utility (client-side, sticky per user)
const KEY = "fb_ab_v1";

function getBucket(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function setBucket(b: Record<string, string>) {
  try { localStorage.setItem(KEY, JSON.stringify(b)); } catch {}
}

export function useVariant<T extends string>(experiment: string, variants: T[]): T {
  if (typeof window === "undefined") return variants[0];
  const b = getBucket();
  if (b[experiment] && variants.includes(b[experiment] as T)) return b[experiment] as T;
  const pick = variants[Math.floor(Math.random() * variants.length)];
  b[experiment] = pick;
  setBucket(b);
  return pick;
}

export function trackVariant(experiment: string, variant: string, event: string) {
  try {
    // Lightweight beacon — falls back gracefully
    const payload = JSON.stringify({ experiment, variant, event, ts: Date.now() });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/ab", new Blob([payload], { type: "application/json" }));
    }
  } catch {}
}
