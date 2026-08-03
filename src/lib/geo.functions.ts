import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequestHeader, setCookie } from "@tanstack/react-start/server";
import { currencyForCountry, DEFAULT_CURRENCY } from "./country-currency";

const COOKIE_NAME = "visitor_currency";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function lookupCountry(ip: string): Promise<string | null> {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/country/`, {
      headers: { "User-Agent": "FekraBusiness/1.0" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (!text || text.length !== 2) return null;
    return text.toUpperCase();
  } catch {
    return null;
  }
}

function extractIp(): string | null {
  const cf = getRequestHeader("cf-connecting-ip");
  if (cf) return cf;
  const xff = getRequestHeader("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xreal = getRequestHeader("x-real-ip");
  if (xreal) return xreal;
  return null;
}

export const detectVisitorCurrency = createServerFn({ method: "GET" }).handler(async () => {
  // 1) honor existing cookie
  const cached = getCookie(COOKIE_NAME);
  if (cached && /^[A-Z]{3}$/.test(cached)) {
    return { currency: cached, source: "cookie" as const };
  }

  // 2) Cloudflare gives us the country directly — fastest path
  const cfCountry = getRequestHeader("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX" && cfCountry !== "T1") {
    const currency = currencyForCountry(cfCountry);
    setCookie(COOKIE_NAME, currency, { path: "/", maxAge: COOKIE_MAX_AGE, sameSite: "lax" });
    return { currency, source: "cf" as const };
  }

  // 3) external lookup as fallback
  const ip = extractIp();
  if (!ip) {
    return { currency: DEFAULT_CURRENCY, source: "default" as const };
  }
  const country = await lookupCountry(ip);
  const currency = currencyForCountry(country);
  setCookie(COOKIE_NAME, currency, { path: "/", maxAge: COOKIE_MAX_AGE, sameSite: "lax" });
  return { currency, source: country ? ("ip" as const) : ("default" as const) };
});
