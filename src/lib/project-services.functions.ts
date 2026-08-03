import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const SERVICE_KEYS = ["auction_live", "auction_sealed", "tender_live", "tender_sealed"] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];

export const SERVICE_META: Record<ServiceKey, { title: string; short: string; description: string; icon: string }> = {
  auction_live: {
    title: "مزايدة حيّة",
    short: "رفع السعر علناً",
    icon: "gavel",
    description:
      "منافسة علنية بين المشترين برفع السعر خلال مدة محددة (مع تمديد تلقائي 5 دقائق عند أي عرض في آخر دقيقة لمنع القنص). تُحجز وديعة جدّية 5٪ من المشتري، وعند الفوز تُفتح غرفة صفقة آلية ويُصدر سند تملّك رقمي.",
  },
  auction_sealed: {
    title: "مزايدة مغلقة",
    short: "عروض سرّية تُكشف دفعة واحدة",
    icon: "lock",
    description:
      "كل مزايد يُقدّم عرضه مشفّراً ولا يراه أحد حتى انتهاء المدة، ثم تُكشف جميع العروض دفعة واحدة ويفوز الأعلى. مناسبة للمشاريع الحساسة لمنع التواطؤ والعروض الوهمية. وديعة جدّية 5٪.",
  },
  tender_live: {
    title: "مناقصة حيّة",
    short: "خفض السعر علناً مقابل كمية",
    icon: "trending-down",
    description:
      "المشتري يطلب كميّة كبيرة (≥ الحد الأدنى للصفقة) بسعر أقل من السوق، والملاك يتنافسون علناً على من يقبل بأدنى سعر. لا وديعة من البائع، ويُطلب ضمان تنفيذ بقيمة الصفقة من المشتري.",
  },
  tender_sealed: {
    title: "مناقصة مغلقة (RFP)",
    short: "كرّاسة شروط وعروض مختومة",
    icon: "file-lock",
    description:
      "ينشر صاحب المشروع كرّاسة شروط (Scope)، ويُرسل المورّدون عروضهم مختومة دون رؤية بعضهم. تُقيَّم العروض وفق (السعر + الجودة + المدة + السمعة)، وليس بالضرورة الأرخص.",
  },
};

const Schema = z.object({
  project_id: z.string().uuid(),
  services: z.object({
    auction_live: z.boolean().optional(),
    auction_sealed: z.boolean().optional(),
    tender_live: z.boolean().optional(),
    tender_sealed: z.boolean().optional(),
  }),
});

export const setProjectServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error: exErr } = await supabase
      .from("projects")
      .select("id, owner_id, services_enabled")
      .eq("id", data.project_id)
      .maybeSingle();
    if (exErr) throw exErr;
    if (!row) throw new Error("not_found");
    if ((row as any).owner_id !== userId) throw new Error("forbidden");

    const current = ((row as any).services_enabled ?? {}) as Record<string, boolean>;
    const merged = {
      auction_live: data.services.auction_live ?? current.auction_live ?? false,
      auction_sealed: data.services.auction_sealed ?? current.auction_sealed ?? false,
      tender_live: data.services.tender_live ?? current.tender_live ?? false,
      tender_sealed: data.services.tender_sealed ?? current.tender_sealed ?? false,
    };

    const { error } = await supabase
      .from("projects")
      .update({ services_enabled: merged, updated_at: new Date().toISOString() })
      .eq("id", data.project_id);
    if (error) throw error;

    return { ok: true, services_enabled: merged };
  });
