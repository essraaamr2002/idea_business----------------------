import { createServerFn } from "@tanstack/react-start";

const STALE_MS = 12 * 60 * 60 * 1000; // 12h
const FX_QUOTES = [
  "USD", "SAR", "AED", "KWD", "QAR", "BHD", "OMR", "EGP", "JOD", "IQD",
  "LBP", "MAD", "TND", "DZD", "LYD", "SDG", "YER", "SYP", "EUR", "GBP",
];

type FxRow = { base_currency: string; quote_currency: string; rate: number; fetched_at: string };

async function fetchFreshRates(): Promise<Record<string, number> | null> {
  // exchangerate.host (free, no key, base=USD)
  try {
    const url = `https://api.exchangerate.host/latest?base=USD&symbols=${FX_QUOTES.join(",")}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { rates?: Record<string, number> };
    if (!json.rates) return null;
    return { USD: 1, ...json.rates };
  } catch {
    return null;
  }
}

export const getFxRates = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing } = await supabaseAdmin
    .from("fx_rates" as any)
    .select("base_currency, quote_currency, rate, fetched_at")
    .eq("base_currency", "USD");

  const rows = ((existing ?? []) as unknown) as FxRow[];
  const newestAt = rows.reduce((max, r) => Math.max(max, new Date(r.fetched_at).getTime()), 0);
  const stale = !rows.length || Date.now() - newestAt > STALE_MS;

  if (stale) {
    const fresh = await fetchFreshRates();
    if (fresh) {
      const payload = Object.entries(fresh).map(([quote_currency, rate]) => ({
        base_currency: "USD",
        quote_currency,
        rate,
        fetched_at: new Date().toISOString(),
      }));
      await supabaseAdmin.from("fx_rates" as any).upsert(payload, {
        onConflict: "base_currency,quote_currency",
      });
      return { base: "USD", rates: fresh, fetched_at: new Date().toISOString() };
    }
  }

  // serve whatever we have (even if stale, beats nothing)
  const map: Record<string, number> = { USD: 1 };
  for (const r of rows) map[r.quote_currency] = Number(r.rate);
  const fetched_at = newestAt ? new Date(newestAt).toISOString() : null;
  return { base: "USD", rates: map, fetched_at };
});
