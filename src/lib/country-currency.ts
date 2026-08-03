// Maps ISO country code (2-letter) → preferred currency code.
// Arabic countries first, then a sane default fallback.

export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  SA: "SAR",
  AE: "AED",
  KW: "KWD",
  QA: "QAR",
  BH: "BHD",
  OM: "OMR",
  EG: "EGP",
  JO: "JOD",
  IQ: "IQD",
  LB: "LBP",
  MA: "MAD",
  TN: "TND",
  DZ: "DZD",
  LY: "LYD",
  SD: "SDG",
  YE: "YER",
  SY: "SYP",
  PS: "JOD",
  MR: "MAD",
  SO: "USD",
  DJ: "USD",
  KM: "USD",
  // Common non-Arabic markets
  US: "USD",
  GB: "USD",
  CA: "USD",
  AU: "USD",
  TR: "USD",
  PK: "USD",
  IN: "USD",
};

export const DEFAULT_CURRENCY = "USD";

export function currencyForCountry(code: string | null | undefined): string {
  if (!code) return DEFAULT_CURRENCY;
  return COUNTRY_TO_CURRENCY[code.toUpperCase()] ?? DEFAULT_CURRENCY;
}

// Display symbols for nicer formatting
export const CURRENCY_SYMBOLS: Record<string, string> = {
  SAR: "ر.س",
  AED: "د.إ",
  KWD: "د.ك",
  QAR: "ر.ق",
  BHD: "د.ب",
  OMR: "ر.ع",
  EGP: "ج.م",
  JOD: "د.أ",
  IQD: "د.ع",
  LBP: "ل.ل",
  MAD: "د.م",
  TND: "د.ت",
  DZD: "د.ج",
  LYD: "د.ل",
  SDG: "ج.س",
  YER: "ر.ي",
  SYP: "ل.س",
  USD: "$",
  EUR: "€",
  GBP: "£",
};
