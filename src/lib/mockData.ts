export type Project = {
  id: string;
  ticker: string;
  name: string;
  nameEn: string;
  sector: string;
  country: string;
  countryFlag: string;
  city: string;
  totalCost: number;
  currency: string;
  totalShares: number;
  sharePrice: number;
  change24h: number;
  guaranteeType: string;
  guaranteeAmount: number;
  riskScore: number; // 1-5 (1 best)
  expectedAnnualReturn: number;
  ownerName: string;
  ownerVerified: boolean;
  ownerKyc: boolean;
  description: string;
  fundedPercent: number;
  investors: number;
  image: string;
  trend: number[];
};

const trend = (start: number, vol: number) =>
  Array.from({ length: 30 }, (_, i) => +(start + Math.sin(i / 3) * vol + (Math.random() - 0.5) * vol * 0.6).toFixed(2));

export const PROJECTS: Project[] = [
  {
    id: "p1", ticker: "SOLAR1", name: "محطة الطاقة الشمسية - تبوك", nameEn: "Tabuk Solar Plant",
    sector: "طاقة متجددة", country: "السعودية", countryFlag: "🇸🇦", city: "تبوك",
    totalCost: 2_400_000, currency: "SAR", totalShares: 2400, sharePrice: 1042.50,
    change24h: 3.42, guaranteeType: "رهن عقاري", guaranteeAmount: 3_000_000,
    riskScore: 2, expectedAnnualReturn: 18, ownerName: "خالد العتيبي", ownerVerified: true, ownerKyc: true,
    description: "محطة طاقة شمسية بقدرة 5 ميجاواط في منطقة تبوك، عقود توريد طويلة الأمد مع شركة الكهرباء.",
    fundedPercent: 68, investors: 142,
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80",
    trend: trend(1000, 60),
  },
  {
    id: "p2", ticker: "FOOD22", name: "سلسلة مطاعم الكبسة الذهبية", nameEn: "Golden Kabsa Chain",
    sector: "أغذية ومشروبات", country: "الإمارات", countryFlag: "🇦🇪", city: "دبي",
    totalCost: 850_000, currency: "AED", totalShares: 1700, sharePrice: 512.30,
    change24h: -1.18, guaranteeType: "سند لأمر", guaranteeAmount: 900_000,
    riskScore: 3, expectedAnnualReturn: 24, ownerName: "منى الزعابي", ownerVerified: true, ownerKyc: true,
    description: "توسعة سلسلة مطاعم تراثية إلى 4 فروع جديدة في الإمارات خلال 18 شهر.",
    fundedPercent: 41, investors: 89,
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
    trend: trend(500, 25),
  },
  {
    id: "p3", ticker: "TECH09", name: "منصة التوصيل الذكية", nameEn: "Smart Delivery App",
    sector: "تقنية", country: "مصر", countryFlag: "🇪🇬", city: "القاهرة",
    totalCost: 5_500_000, currency: "EGP", totalShares: 5500, sharePrice: 1098.75,
    change24h: 7.81, guaranteeType: "ضامن إضافي", guaranteeAmount: 6_000_000,
    riskScore: 3, expectedAnnualReturn: 32, ownerName: "أحمد فؤاد", ownerVerified: true, ownerKyc: false,
    description: "تطبيق توصيل بالذكاء الاصطناعي يربط 500 محل تجاري بـ 50 ألف عميل في القاهرة الكبرى.",
    fundedPercent: 82, investors: 311,
    image: "https://images.unsplash.com/photo-1556742400-b5b7c5121f9c?w=800&q=80",
    trend: trend(1100, 80),
  },
  {
    id: "p4", ticker: "AGRI04", name: "مزرعة النخيل الذكية", nameEn: "Smart Date Farm",
    sector: "زراعة", country: "السعودية", countryFlag: "🇸🇦", city: "الأحساء",
    totalCost: 1_200_000, currency: "SAR", totalShares: 1200, sharePrice: 1025.00,
    change24h: 1.95, guaranteeType: "رهن منقولات", guaranteeAmount: 1_500_000,
    riskScore: 1, expectedAnnualReturn: 14, ownerName: "سلمان القحطاني", ownerVerified: false, ownerKyc: true,
    description: "مزرعة 200 هكتار لإنتاج التمور العضوية مع نظام ري ذكي وتغليف آلي.",
    fundedPercent: 55, investors: 76,
    image: "https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=800&q=80",
    trend: trend(1000, 30),
  },
  {
    id: "p5", ticker: "EDU11", name: "أكاديمية البرمجة العربية", nameEn: "Arab Code Academy",
    sector: "تعليم", country: "الأردن", countryFlag: "🇯🇴", city: "عمّان",
    totalCost: 600_000, currency: "JOD", totalShares: 1500, sharePrice: 405.20,
    change24h: 4.62, guaranteeType: "وصل أمانة", guaranteeAmount: 700_000,
    riskScore: 2, expectedAnnualReturn: 22, ownerName: "ريم الخطيب", ownerVerified: true, ownerKyc: true,
    description: "أكاديمية برمجة بثلاث لغات تخرّج 1000 مطور سنوياً مع ضمان توظيف.",
    fundedPercent: 73, investors: 198,
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
    trend: trend(400, 18),
  },
  {
    id: "p6", ticker: "HEALTH", name: "عيادات الأسنان الذكية", nameEn: "Smart Dental Clinics",
    sector: "صحة", country: "الكويت", countryFlag: "🇰🇼", city: "الكويت",
    totalCost: 1_800_000, currency: "KWD", totalShares: 1800, sharePrice: 1010.40,
    change24h: -2.34, guaranteeType: "سند لأمر", guaranteeAmount: 2_000_000,
    riskScore: 2, expectedAnnualReturn: 19, ownerName: "د. فهد المطيري", ownerVerified: true, ownerKyc: true,
    description: "سلسلة عيادات أسنان متخصصة بأحدث تقنيات الليزر في 5 مواقع.",
    fundedPercent: 35, investors: 54,
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80",
    trend: trend(1000, 50),
  },
  {
    id: "p7", ticker: "REAL07", name: "مجمع سكني تبوك", nameEn: "Tabuk Residential Complex",
    sector: "عقارات", country: "السعودية", countryFlag: "🇸🇦", city: "تبوك",
    totalCost: 8_000_000, currency: "SAR", totalShares: 8000, sharePrice: 1002.10,
    change24h: 0.42, guaranteeType: "رهن عقاري", guaranteeAmount: 10_000_000,
    riskScore: 1, expectedAnnualReturn: 12, ownerName: "شركة العمار", ownerVerified: true, ownerKyc: true,
    description: "مجمع سكني فاخر يضم 80 وحدة في قلب تبوك، ضمن مشروع نيوم.",
    fundedPercent: 48, investors: 220,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
    trend: trend(1000, 15),
  },
  {
    id: "p8", ticker: "FASH08", name: "علامة الأزياء التراثية", nameEn: "Heritage Fashion Brand",
    sector: "أزياء", country: "المغرب", countryFlag: "🇲🇦", city: "الدار البيضاء",
    totalCost: 450_000, currency: "MAD", totalShares: 1500, sharePrice: 305.80,
    change24h: 5.21, guaranteeType: "ضامن إضافي", guaranteeAmount: 500_000,
    riskScore: 4, expectedAnnualReturn: 28, ownerName: "ليلى بنعلي", ownerVerified: false, ownerKyc: true,
    description: "علامة أزياء تمزج الموروث المغربي بالتصاميم العصرية للأسواق العالمية.",
    fundedPercent: 22, investors: 41,
    image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80",
    trend: trend(300, 25),
  },
];

export const TICKER_DATA = PROJECTS.map(p => ({
  symbol: p.ticker,
  price: p.sharePrice,
  change: p.change24h,
  currency: p.currency,
}));

export type Post = {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  verified: boolean;
  kyc: boolean;
  time: string;
  body: string;
  ticker?: string;
  likes: number;
  replies: number;
  reposts: number;
};

export const POSTS: Post[] = [
  {
    id: "post1", author: "خالد العتيبي", handle: "@khaled_otb",
    avatar: "https://i.pravatar.cc/100?u=khaled", verified: true, kyc: true,
    time: "منذ 12 د", body: "أسهم $SOLAR1 ارتفعت 3.4% اليوم بعد توقيع عقد توريد جديد مع شركة الكهرباء 🚀 المرحلة الثانية بدأت!",
    ticker: "SOLAR1", likes: 248, replies: 34, reposts: 56,
  },
  {
    id: "post2", author: "ريم الخطيب", handle: "@reem_kh",
    avatar: "https://i.pravatar.cc/100?u=reem", verified: true, kyc: true,
    time: "منذ 45 د", body: "نتائج الدفعة 14 من $EDU11: 89% توظيف خلال 60 يوم من التخرج. شكراً للمستثمرين على الثقة 💚",
    ticker: "EDU11", likes: 412, replies: 67, reposts: 102,
  },
  {
    id: "post3", author: "محمد السهلي", handle: "@m_sahli",
    avatar: "https://i.pravatar.cc/100?u=msahli", verified: false, kyc: true,
    time: "منذ ساعة", body: "تحليل: قطاع التقنية في المنصة سجل ارتفاع متوسط 12% هذا الأسبوع، أعلى من العقارات (+2%) والأغذية (+5%).",
    likes: 156, replies: 28, reposts: 41,
  },
  {
    id: "post4", author: "أحمد فؤاد", handle: "@ahmed_fouad",
    avatar: "https://i.pravatar.cc/100?u=ahmed", verified: true, kyc: false,
    time: "منذ 3 س", body: "$TECH09 تجاوزت 80% من التمويل المستهدف! شكراً لكل من آمن بالمنصة. الإطلاق الرسمي خلال 45 يوم 📲",
    ticker: "TECH09", likes: 689, replies: 124, reposts: 198,
  },
  {
    id: "post5", author: "منصة IDEA BUSINESS", handle: "@idea_business",
    avatar: "https://i.pravatar.cc/100?u=idea", verified: true, kyc: true,
    time: "منذ 5 س", body: "📢 إعلان: إطلاق خاصية التصويت الحوكمي للمشاريع الأسبوع القادم. كل سهم = صوت واحد في القرارات الكبرى.",
    likes: 1240, replies: 189, reposts: 345,
  },
];
