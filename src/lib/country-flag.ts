// Map Arabic/English country names (and ISO2) to an emoji flag.
// Best-effort; falls back to an empty string if unknown.

const ISO2_BY_NAME: Record<string, string> = {
  // Arab world (Arabic + English)
  "السعودية": "SA", "المملكة العربية السعودية": "SA", "saudi arabia": "SA", "ksa": "SA",
  "الإمارات": "AE", "الامارات": "AE", "الإمارات العربية المتحدة": "AE", "uae": "AE", "united arab emirates": "AE",
  "مصر": "EG", "egypt": "EG",
  "الكويت": "KW", "kuwait": "KW",
  "قطر": "QA", "qatar": "QA",
  "البحرين": "BH", "bahrain": "BH",
  "عمان": "OM", "سلطنة عمان": "OM", "oman": "OM",
  "اليمن": "YE", "yemen": "YE",
  "العراق": "IQ", "iraq": "IQ",
  "سوريا": "SY", "syria": "SY",
  "لبنان": "LB", "lebanon": "LB",
  "الأردن": "JO", "الاردن": "JO", "jordan": "JO",
  "فلسطين": "PS", "palestine": "PS",
  "المغرب": "MA", "morocco": "MA",
  "الجزائر": "DZ", "algeria": "DZ",
  "تونس": "TN", "tunisia": "TN",
  "ليبيا": "LY", "libya": "LY",
  "السودان": "SD", "sudan": "SD",
  "موريتانيا": "MR", "mauritania": "MR",
  "الصومال": "SO", "somalia": "SO",
  "جيبوتي": "DJ", "djibouti": "DJ",
  "جزر القمر": "KM", "comoros": "KM",
  // Common others
  "تركيا": "TR", "turkey": "TR",
  "ايران": "IR", "إيران": "IR", "iran": "IR",
  "باكستان": "PK", "pakistan": "PK",
  "الهند": "IN", "india": "IN",
  "اندونيسيا": "ID", "إندونيسيا": "ID", "indonesia": "ID",
  "ماليزيا": "MY", "malaysia": "MY",
  "الولايات المتحدة": "US", "أمريكا": "US", "amerika": "US", "usa": "US", "united states": "US",
  "بريطانيا": "GB", "المملكة المتحدة": "GB", "uk": "GB", "united kingdom": "GB",
  "فرنسا": "FR", "france": "FR",
  "ألمانيا": "DE", "germany": "DE",
  "كندا": "CA", "canada": "CA",
  "استراليا": "AU", "أستراليا": "AU", "australia": "AU",
};

export function countryToIso2(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  // already a 2-letter code?
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  return ISO2_BY_NAME[v] ?? ISO2_BY_NAME[v.toLowerCase()] ?? null;
}

export function flagEmoji(value?: string | null): string {
  const iso = countryToIso2(value);
  if (!iso) return "";
  const cp = [...iso.toUpperCase()].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65));
  try { return String.fromCodePoint(...cp); } catch { return ""; }
}
