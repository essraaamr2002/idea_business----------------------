import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFxRates } from "@/lib/fx.functions";
import { detectVisitorCurrency } from "@/lib/geo.functions";
import { DEFAULT_CURRENCY, CURRENCY_SYMBOLS } from "@/lib/country-currency";

type CurrencyContextValue = {
  displayCurrency: string;
  setDisplayCurrency: (c: string) => void;
  rates: Record<string, number>; // base = USD
  ready: boolean;
  convert: (amount: number, from: string, to?: string) => number | null;
  format: (amount: number, currency: string) => string;
  formatConverted: (amount: number, from: string) => string | null;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);
const STORAGE_KEY = "ib.display_currency";
const STORAGE_KEY_AUTO = "ib.display_currency.auto";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const detectFn = useServerFn(detectVisitorCurrency);
  const ratesFn = useServerFn(getFxRates);

  const [displayCurrency, setDisplayCurrencyState] = useState<string>(DEFAULT_CURRENCY);

  // Initial pick: manual override > auto cookie > default
  useEffect(() => {
    const manual = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (manual) {
      setDisplayCurrencyState(manual);
      return;
    }
    const cookieCur = readCookie("visitor_currency");
    if (cookieCur && /^[A-Z]{3}$/.test(cookieCur)) {
      setDisplayCurrencyState(cookieCur);
      return;
    }
    // ask the server (uses CF-IPCountry / IP lookup, then sets the cookie)
    detectFn()
      .then((r) => {
        if (r?.currency) {
          setDisplayCurrencyState(r.currency);
          try { localStorage.setItem(STORAGE_KEY_AUTO, r.currency); } catch {}
        }
      })
      .catch(() => {});
  }, [detectFn]);

  const setDisplayCurrency = (c: string) => {
    setDisplayCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch {}
  };

  const { data: ratesData } = useQuery({
    queryKey: ["fx-rates"],
    queryFn: () => ratesFn(),
    staleTime: 60 * 60 * 1000, // 1h on the client
    refetchOnWindowFocus: false,
  });

  const rates = ratesData?.rates ?? { USD: 1 };
  const ready = !!ratesData;

  const value = useMemo<CurrencyContextValue>(() => {
    const convert = (amount: number, from: string, to?: string): number | null => {
      const target = (to ?? displayCurrency).toUpperCase();
      const src = (from ?? "USD").toUpperCase();
      if (!isFinite(amount)) return null;
      if (src === target) return amount;
      const rFrom = rates[src];
      const rTo = rates[target];
      if (!rFrom || !rTo) return null;
      // amount in USD = amount / rFrom (since rates are per-USD)
      const usd = amount / rFrom;
      return usd * rTo;
    };

    const format = (amount: number, currency: string): string => {
      try {
        return new Intl.NumberFormat("ar", {
          style: "currency",
          currency,
          maximumFractionDigits: amount >= 1000 ? 0 : 2,
        }).format(amount);
      } catch {
        const sym = CURRENCY_SYMBOLS[currency] ?? currency;
        return `${amount.toFixed(2)} ${sym}`;
      }
    };

    const formatConverted = (amount: number, from: string): string | null => {
      if ((from ?? "USD").toUpperCase() === displayCurrency.toUpperCase()) return null;
      const v = convert(amount, from);
      if (v == null) return null;
      return `≈ ${format(v, displayCurrency)}`;
    };

    return { displayCurrency, setDisplayCurrency, rates, ready, convert, format, formatConverted };
  }, [displayCurrency, rates, ready]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Safe no-op fallback so components don't crash if provider missing
    return {
      displayCurrency: DEFAULT_CURRENCY,
      setDisplayCurrency: () => {},
      rates: { USD: 1 },
      ready: false,
      convert: () => null,
      format: (a, c) => `${a.toFixed(2)} ${c}`,
      formatConverted: () => null,
    };
  }
  return ctx;
}
