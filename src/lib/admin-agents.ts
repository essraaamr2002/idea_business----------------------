// Admin-side six agents — FULL admin powers, separate scope from /assistant member agents.
export type AdminAgentId =
  | "commander" | "database" | "operations" | "finance" | "security" | "growth";

export type AdminToolName =
  | "query_table" | "insert_row" | "update_rows" | "delete_rows" | "count_rows"
  | "list_tables" | "describe_table"
  | "list_users" | "set_user_role" | "remove_user_role"
  | "suspend_user" | "activate_user"
  | "freeze_wallet" | "adjust_wallet"
  | "approve_kyc" | "reject_kyc"
  | "approve_project" | "reject_project"
  | "platform_stats" | "audit_log";

export interface AdminAgentDef {
  id: AdminAgentId;
  name: string;
  emoji: string;
  role: string;
  systemPrompt: string;
  allowedTools: AdminToolName[];
}

const ALL_TOOLS: AdminToolName[] = [
  "query_table","insert_row","update_rows","delete_rows","count_rows",
  "list_tables","describe_table",
  "list_users","set_user_role","remove_user_role",
  "suspend_user","activate_user",
  "freeze_wallet","adjust_wallet",
  "approve_kyc","reject_kyc",
  "approve_project","reject_project",
  "platform_stats","audit_log",
];

const READ_ONLY: AdminToolName[] = [
  "query_table","count_rows","list_tables","describe_table","platform_stats","audit_log","list_users",
];

export const ADMIN_AGENTS: Record<AdminAgentId, AdminAgentDef> = {
  commander: {
    id: "commander", name: "القائد الإداري", emoji: "🎯",
    role: "تنسيق أوامر المدير وتنفيذها على كل أجزاء النظام",
    systemPrompt: `أنت القائد الإداري لمنصة IDEA BUSINESS. لديك صلاحيات كاملة على قاعدة البيانات (قراءة، إضافة، تعديل، حذف) وكل عمليات الإدارة.
- نفّذ أوامر المدير مباشرة عند وضوحها.
- لأي عملية حذف أو تعديل واسع، اعرض ملخص ما ستفعله أولاً ثم نفّذه.
- استخدم الأدوات المتاحة لقراءة الجداول قبل التعديل عند الحاجة.
- أجب بالعربية الفصحى، خطوات مرقّمة عند الإرشاد، وكتل كود/JSON للنتائج.`,
    allowedTools: ALL_TOOLS,
  },
  database: {
    id: "database", name: "مهندس قاعدة البيانات", emoji: "🗄️",
    role: "CRUD كامل على جداول public + تشخيص البيانات",
    systemPrompt: `أنت مهندس قاعدة بيانات. مهمتك إدارة جداول schema=public: قراءة، إدراج، تحديث، حذف، عدّ، استكشاف الأعمدة.
- قبل تعديل/حذف صفوف، تحقّق من الشروط بعينات قراءة أولاً.
- اعرض دائماً عدد الصفوف المتأثرة.
- لا تلمس schemas: auth, storage, realtime, vault.`,
    allowedTools: ["query_table","insert_row","update_rows","delete_rows","count_rows","list_tables","describe_table"],
  },
  operations: {
    id: "operations", name: "مدير العمليات", emoji: "🛠️",
    role: "إدارة المستخدمين، المشاريع، KYC والاعتمادات",
    systemPrompt: `أنت مدير عمليات. تستطيع اعتماد/رفض KYC والمشاريع، تفعيل/إيقاف المستخدمين، وإدارة الأدوار.
استخدم أدوات الاعتماد المخصّصة بدلاً من تعديل الجداول يدوياً متى توفّرت.`,
    allowedTools: [
      "list_users","set_user_role","remove_user_role","suspend_user","activate_user",
      "approve_kyc","reject_kyc","approve_project","reject_project",
      "query_table","count_rows","describe_table","audit_log",
    ],
  },
  finance: {
    id: "finance", name: "المدير المالي", emoji: "💰",
    role: "محافظ، عمولات، طلبات سحب، تجميد",
    systemPrompt: `أنت المدير المالي. تدير المحافظ (تجميد/تعديل رصيد)، تراجع الفواتير، السحب، والعمولات.
أي تعديل رصيد يجب أن يُسجَّل بمبرّر واضح في وصف العملية.`,
    allowedTools: [
      "freeze_wallet","adjust_wallet","query_table","update_rows","insert_row","count_rows","platform_stats","audit_log",
    ],
  },
  security: {
    id: "security", name: "ضابط الأمن", emoji: "🛡️",
    role: "تدقيق، حظر، فحص AML، سجلات الأمان",
    systemPrompt: `أنت ضابط أمن. تستعرض سجلات التدقيق وتنفّذ إيقاف الحسابات المشبوهة وتجميد المحافظ عند الخطر.
حلّل قبل التنفيذ واذكر سبب كل إجراء.`,
    allowedTools: [
      "audit_log","query_table","count_rows","suspend_user","activate_user","freeze_wallet","list_users","describe_table",
    ],
  },
  growth: {
    id: "growth", name: "محلل النمو", emoji: "📈",
    role: "تحليل البيانات والأداء — قراءة فقط",
    systemPrompt: `أنت محلل أعمال للمدير. صلاحياتك قراءة فقط — تستخرج الإحصاءات وتقدّم تقارير وتوصيات.`,
    allowedTools: READ_ONLY,
  },
};

export const ADMIN_AGENT_LIST: AdminAgentDef[] = Object.values(ADMIN_AGENTS);

const KEYWORDS: Record<AdminAgentId, string[]> = {
  database: ["جدول","table","sql","حذف","احذف","insert","ادخل","عدّل","update","صف","صفوف","row","قاعدة"],
  operations: ["kyc","توثيق","اعتمد","ارفض","علّق","فعّل","دور","role","مشروع","مستخدم","عضو"],
  finance: ["محفظة","رصيد","سحب","فاتورة","عمولة","payout","wallet","تجميد","ايداع","deposit"],
  security: ["أمن","حظر","aml","تدقيق","audit","مشبوه","اختراق","تجميد"],
  growth: ["تحليل","تقرير","إحصاء","kpi","نمو","عدد","احصائيات","stats"],
  commander: [],
};

export function routeAdminAgent(question: string): AdminAgentId {
  const q = (question || "").toLowerCase();
  let best: AdminAgentId = "commander";
  let bestHits = 0;
  for (const id of Object.keys(KEYWORDS) as AdminAgentId[]) {
    const hits = KEYWORDS[id].reduce((n, kw) => (q.includes(kw) ? n + 1 : n), 0);
    if (hits > bestHits) { bestHits = hits; best = id; }
  }
  return best;
}
