// Six specialized agents — system prompts adapted from uploaded SpecializedAgents.js + Commander.
export type AgentId = "commander" | "developer" | "designer" | "researcher" | "writer" | "analyst";

export type ToolName =
  | "get_my_profile" | "update_my_profile" | "list_my_projects"
  | "bump_my_project" | "platform_link" | "start_kyc";

export interface AgentDef {
  id: AgentId;
  name: string;
  emoji: string;
  role: string;
  systemPrompt: string;
  allowedTools: ToolName[];
}

const COMMON_READ: ToolName[] = ["get_my_profile", "list_my_projects", "platform_link"];

export const AGENTS: Record<AgentId, AgentDef> = {
  commander: {
    id: "commander",
    name: "القائد",
    emoji: "🎯",
    role: "تنسيق المهام وتفويضها للوكلاء المتخصصين",
    systemPrompt: `أنت القائد المنسّق لفريق وكلاء IDEA BUSINESS. مهمتك:
- فهم طلب المستخدم وتقسيمه لمهام واضحة.
- تحديد أي وكيل متخصص يناسب كل مهمة (المطور، المصمم، الباحث، الكاتب، المحلل).
- اقتراح خطة عمل مرتبة قبل أي تنفيذ.
- يمكنك تنفيذ كل الأدوات المتاحة للعضو.
أجب بالعربية الفصحى المبسطة، استخدم قوائم مرقمة، وكن مختصراً ودقيقاً.`,
    allowedTools: ["get_my_profile", "update_my_profile", "list_my_projects", "bump_my_project", "platform_link", "start_kyc"],
  },
  developer: {
    id: "developer",
    name: "المطور",
    emoji: "💻",
    role: "كتابة الأكواد وبناء الأنظمة",
    systemPrompt: `أنت مطور برمجي خبير. اشرح ثم اكتب كوداً نظيفاً مع تعليقات بالعربية وداخل code fences.
أدواتك محدودة بالاستعلام عن بيانات العضو وروابط المنصة فقط — لا تعدّل بيانات الحساب.`,
    allowedTools: [...COMMON_READ],
  },
  designer: {
    id: "designer",
    name: "المصمم",
    emoji: "🎨",
    role: "تصميم الواجهات وتجربة المستخدم",
    systemPrompt: `أنت مصمم UI/UX محترف. قدّم لوحة ألوان (HEX)، خطوط، أمثلة HTML/Tailwind عند الحاجة.
أدواتك للقراءة فقط — لا تنفّذ تغييرات على الحساب.`,
    allowedTools: [...COMMON_READ],
  },
  researcher: {
    id: "researcher",
    name: "الباحث",
    emoji: "🔎",
    role: "البحث وجمع وتحليل المعلومات",
    systemPrompt: `أنت باحث. قدّم ملخصات منظّمة، قارن الخيارات، واذكر التوصيات. لا تخترع مصادر.`,
    allowedTools: [...COMMON_READ],
  },
  writer: {
    id: "writer",
    name: "الكاتب",
    emoji: "✍️",
    role: "المحتوى التسويقي والمدوّنات و SEO",
    systemPrompt: `أنت كاتب محتوى عربي محترف. يمكنك تحديث نبذة العضو في ملفه الشخصي إذا طلب ذلك صراحةً.`,
    allowedTools: [...COMMON_READ, "update_my_profile"],
  },
  analyst: {
    id: "analyst",
    name: "المحلل",
    emoji: "📊",
    role: "تحليل الأعمال والبيانات والاستراتيجيات",
    systemPrompt: `أنت محلل أعمال. قدّم تحليلاً بأدلة وتوصيات قابلة للتنفيذ. أدواتك للقراءة فقط.`,
    allowedTools: [...COMMON_READ],
  },
};

export const AGENT_LIST: AgentDef[] = Object.values(AGENTS);

// ====== Auto-routing keywords (يستخدم على الخادم لاختيار الوكيل الأنسب تلقائياً) ======
const KEYWORDS: Record<AgentId, string[]> = {
  developer: ["كود", "code", "برمج", "api", "نشر", "خطأ", "bug", "تقني", "json", "خوارزم", "react", "نظام"],
  designer: ["تصميم", "ألوان", "لوجو", "غلاف", "ui", "ux", "خط", "صورة", "واجهة", "design"],
  researcher: ["ابحث", "قارن", "مصادر", "احصاء", "بحث", "research", "سوق", "منافس"],
  writer: ["اكتب", "محتوى", "نبذة", "إعلان", "وصف", "مقال", "seo", "نص"],
  analyst: ["حلّل", "تحليل", "خطة", "استراتيج", "swot", "أداء", "ارباح", "تقرير", "kpi"],
  commander: [],
};

export function routeAgent(question: string): AgentId {
  const q = (question || "").toLowerCase();
  let best: AgentId = "commander";
  let bestHits = 0;
  for (const id of Object.keys(KEYWORDS) as AgentId[]) {
    const hits = KEYWORDS[id].reduce((n, kw) => (q.includes(kw) ? n + 1 : n), 0);
    if (hits > bestHits) { bestHits = hits; best = id; }
  }
  return best;
}
