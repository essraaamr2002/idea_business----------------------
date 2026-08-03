export const ARAB_CURRENCIES: { code: string; name: string; nameEn: string; symbol: string }[] = [
  { code: "SAR", name: "ريال سعودي", nameEn: "Saudi Riyal", symbol: "ر.س" },
  { code: "AED", name: "درهم إماراتي", nameEn: "UAE Dirham", symbol: "د.إ" },
  { code: "KWD", name: "دينار كويتي", nameEn: "Kuwaiti Dinar", symbol: "د.ك" },
  { code: "QAR", name: "ريال قطري", nameEn: "Qatari Riyal", symbol: "ر.ق" },
  { code: "BHD", name: "دينار بحريني", nameEn: "Bahraini Dinar", symbol: "د.ب" },
  { code: "OMR", name: "ريال عماني", nameEn: "Omani Rial", symbol: "ر.ع" },
  { code: "EGP", name: "جنيه مصري", nameEn: "Egyptian Pound", symbol: "ج.م" },
  { code: "JOD", name: "دينار أردني", nameEn: "Jordanian Dinar", symbol: "د.أ" },
  { code: "IQD", name: "دينار عراقي", nameEn: "Iraqi Dinar", symbol: "د.ع" },
  { code: "LBP", name: "ليرة لبنانية", nameEn: "Lebanese Pound", symbol: "ل.ل" },
  { code: "MAD", name: "درهم مغربي", nameEn: "Moroccan Dirham", symbol: "د.م" },
  { code: "TND", name: "دينار تونسي", nameEn: "Tunisian Dinar", symbol: "د.ت" },
  { code: "DZD", name: "دينار جزائري", nameEn: "Algerian Dinar", symbol: "د.ج" },
  { code: "LYD", name: "دينار ليبي", nameEn: "Libyan Dinar", symbol: "د.ل" },
  { code: "SDG", name: "جنيه سوداني", nameEn: "Sudanese Pound", symbol: "ج.س" },
  { code: "YER", name: "ريال يمني", nameEn: "Yemeni Rial", symbol: "ر.ي" },
  { code: "SYP", name: "ليرة سورية", nameEn: "Syrian Pound", symbol: "ل.س" },
  { code: "USD", name: "دولار أمريكي", nameEn: "US Dollar", symbol: "$" },
];

export const GUARANTEE_TYPES = [
  { value: "sand_lamr", label: "سند لأمر", labelEn: "Promissory note", hasTemplate: true },
  { value: "wasl_amanah", label: "وصل أمانة", labelEn: "Trust receipt", hasTemplate: true },
  { value: "cheque", label: "شيك", labelEn: "Cheque", hasTemplate: false },
  { value: "kambiala", label: "كمبيالة", labelEn: "Bill of exchange", hasTemplate: false },
] as const;

export type GuaranteeType = (typeof GUARANTEE_TYPES)[number]["value"];
