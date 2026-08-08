import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PUBLIC_OR_INTERNAL_URL_RE = /^(https?:\/\/|\/api\/public\/storage\/|\/storage\/v1\/object\/)/i;

const WizardSchema = z.object({
  is_existing: z.boolean(),
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().min(10).max(5000),
  sector: z.string().trim().max(100).default("عام"),
  country: z.string().trim().max(80).default("السعودية"),
  ticker: z.string().trim().max(10).optional(),
  total_cost: z.number().positive(),
  currency: z.string().min(3).max(5),
  funding_mode: z.enum(["marketplace", "single_investor"]),
  publish_in_community: z.boolean().default(true),
  target_investment: z.number().positive(),
  shares_total: z.number().int().min(1000),
  min_share_lot: z.number().int().min(1).max(1_000_000).optional(),
  media_urls: z.array(z.string().min(1).max(3000)).max(20).default([]),
  guarantee: z.object({
    type: z.enum(["sand_lamr", "wasl_amanah", "cheque", "kambiala"]),
    amount: z.number().positive(),
    currency: z.string().min(3).max(5),
    signed_document_url: z.string().min(1).max(3000).optional(),
    guarantor_full_name: z.string().trim().max(200).optional(),
    guarantor_id_number: z.string().trim().max(60).optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
}).superRefine((data, ctx) => {
  data.media_urls.forEach((url, index) => {
    if (!PUBLIC_OR_INTERNAL_URL_RE.test(url)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["media_urls", index], message: "invalid_media_url" });
    }
  });
  if (data.guarantee.signed_document_url && !PUBLIC_OR_INTERNAL_URL_RE.test(data.guarantee.signed_document_url)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["guarantee", "signed_document_url"], message: "invalid_document_url" });
  }
});

export const createProjectFromWizard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => WizardSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Create the project, guarantee document, and quota usage in one database
    // transaction. This avoids the old failure mode where the quota was
    // consumed before project creation completed, and it also generates a
    // unique ticker if another project already uses the same Arabic name.
    const { data: result, error } = await supabase.rpc("create_project_from_wizard" as any, {
      _payload: data as any,
    });

    if (error) {
      console.error("[createProjectFromWizard.rpc]", error);
      throw new Error(error.message || "create_project_failed");
    }

    const projectId = String((result as any)?.project_id || "");
    const status = String((result as any)?.status || (data.publish_in_community ? "pending_review" : "draft"));

    if (!projectId) {
      console.error("[createProjectFromWizard.rpc] empty project id", result);
      throw new Error("create_project_failed");
    }

    // Persist min_share_lot (not part of the RPC payload schema)
    if (data.min_share_lot && data.min_share_lot > 0) {
      try {
        await (context.supabase.from("projects") as any)
          .update({ min_share_lot: data.min_share_lot })
          .eq("id", projectId);
      } catch (e) { console.warn("[min_share_lot persist]", e); }
    }

    if (data.publish_in_community) {
      try {
        const { emailNewProjectToSubscribers } = await import("./email-events.server");
        await emailNewProjectToSubscribers({ id: projectId, name: data.name, description: data.description });
      } catch (e) {
        console.warn("[project email broadcast]", e);
      }
      // Fire-and-forget: AI Journalist (6-agent team) auto-writes & broadcasts
      // a news article about this project. Errors logged only — never block.
      (async () => {
        try {
          const { autoPublishPlatformEvent } = await import("./news-auto.server");
          await autoPublishPlatformEvent({
            event_type: "new_project",
            ref_id: projectId,
            title_hint: data.name,
            payload: {
              name: data.name,
              description: data.description,
              sector: (data as any).sector,
              country: (data as any).country,
              total_cost: (data as any).total_cost,
              currency: (data as any).currency,
              target_investment: (data as any).target_investment,
            },
          });
        } catch (e) {
          console.warn("[auto-journalist]", e);
        }
      })();
    }


    return { id: projectId, status };
  });

// ------------------------------------------------------------------
// تحميل بيانات مشروع لتعبئة معالج التعديل
// ------------------------------------------------------------------
export const getMyProjectForEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: p, error } = await supabase
      .from("projects")
      .select("id, owner_id, name, description, sector, country, is_existing, total_cost, currency, funding_mode, target_investment, shares_total, shares_sold, min_share_lot, media_urls, marketplace_listed, status")
      .eq("id", data.project_id)
      .maybeSingle();
    if (error) throw error;
    if (!p) throw new Error("not_found");
    if ((p as any).owner_id !== userId) throw new Error("forbidden");

    // New projects are created in project_guarantee_documents, while some
    // legacy/admin screens still read project_guarantees. Load the new table
    // first and normalize its shape so the edit wizard always receives the
    // same fields.
    const { data: doc } = await supabase
      .from("project_guarantee_documents" as any)
      .select("id, guarantee_type, amount_minor, currency, signed_document_url, guarantor_full_name, guarantor_id_number, notes")
      .eq("project_id", data.project_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (doc) {
      return {
        project: p,
        guarantee: {
          guarantee_type: (doc as any).guarantee_type,
          amount: Number((doc as any).amount_minor ?? 0) / 100,
          currency: (doc as any).currency,
          document_url: (doc as any).signed_document_url,
          guarantor_name: (doc as any).guarantor_full_name,
          guarantor_id: (doc as any).guarantor_id_number,
          notes: (doc as any).notes,
        },
      };
    }

    const { data: g } = await supabase
      .from("project_guarantees")
      .select("guarantee_type, amount, currency, document_url, guarantor_name, guarantor_id, notes")
      .eq("project_id", data.project_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { project: p, guarantee: g ?? null };
  });

// ------------------------------------------------------------------
// تحديث مشروع قائم (بنفس بيانات المعالج)
// ------------------------------------------------------------------
const UpdateSchema = z.object({
  project_id: z.string().uuid(),
  is_existing: z.boolean().optional(),
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  sector: z.string().trim().max(100).optional(),
  country: z.string().trim().max(80).optional(),
  total_cost: z.number().positive().optional(),
  currency: z.string().min(3).max(5).optional(),
  funding_mode: z.enum(["marketplace", "single_investor"]).optional(),
  publish_in_community: z.boolean().optional(),
  target_investment: z.number().positive().optional(),
  shares_total: z.number().int().min(1000).optional(),
  min_share_lot: z.number().int().min(1).max(1_000_000).optional(),
  media_urls: z.array(z.string().min(1).max(3000)).max(20).optional(),
  guarantee: z.object({
    type: z.enum(["sand_lamr", "wasl_amanah", "cheque", "kambiala"]),
    amount: z.number().positive(),
    currency: z.string().min(3).max(5),
    signed_document_url: z.string().min(1).max(3000).optional(),
    guarantor_full_name: z.string().trim().max(200).optional(),
    guarantor_id_number: z.string().trim().max(60).optional(),
    notes: z.string().trim().max(1000).optional(),
  }).optional(),
});

export const updateMyProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing, error: exErr } = await supabase
      .from("projects")
      .select("id, owner_id, shares_sold, status")
      .eq("id", data.project_id)
      .maybeSingle();
    if (exErr) throw exErr;
    if (!existing) throw new Error("not_found");
    if ((existing as any).owner_id !== userId) throw new Error("forbidden");

    const soldShares = Number((existing as any).shares_sold ?? 0);
    if (data.shares_total !== undefined && data.shares_total < soldShares) {
      throw new Error(`لا يمكن أن يقل عدد الأسهم عن المباع (${soldShares}).`);
    }

    // Validate media URLs same as create
    if (data.media_urls) {
      for (const url of data.media_urls) {
        if (!PUBLIC_OR_INTERNAL_URL_RE.test(url)) throw new Error("invalid_media_url");
      }
    }

    const patch: Record<string, unknown> = {};
    const map: Array<[keyof typeof data, string]> = [
      ["name", "name"],
      ["description", "description"],
      ["sector", "sector"],
      ["country", "country"],
      ["is_existing", "is_existing"],
      ["total_cost", "total_cost"],
      ["currency", "currency"],
      ["funding_mode", "funding_mode"],
      ["target_investment", "target_investment"],
      ["shares_total", "shares_total"],
      ["min_share_lot", "min_share_lot"],
      ["media_urls", "media_urls"],
    ];
    for (const [src, dst] of map) {
      const v = (data as any)[src];
      if (v !== undefined) patch[dst] = v;
    }
    if (data.media_urls && data.media_urls.length > 0) {
      patch.cover_image_url = data.media_urls[0];
    }
    if (data.publish_in_community !== undefined) {
      patch.marketplace_listed = data.publish_in_community;
    }
    if (data.shares_total !== undefined && data.target_investment !== undefined && data.shares_total > 0) {
      patch.share_price = Number((data.target_investment / data.shares_total).toFixed(4));
    }
    patch.updated_at = new Date().toISOString();

    const { error: updErr } = await (supabase.from("projects") as any)
      .update(patch)
      .eq("id", data.project_id)
      .eq("owner_id", userId);
    if (updErr) throw updErr;

    // Guarantee upsert. Creation uses project_guarantee_documents, so edit must
    // update the same table instead of the older project_guarantees table.
    if (data.guarantee) {
      const g = data.guarantee;
      const gPatch: Record<string, unknown> = {
        project_id: data.project_id,
        owner_id: userId,
        guarantee_type: g.type,
        amount_minor: Math.round(g.amount * 100),
        currency: g.currency,
        signed_document_url: g.signed_document_url ?? null,
        guarantor_full_name: g.guarantor_full_name ?? null,
        guarantor_id_number: g.guarantor_id_number ?? null,
        notes: g.notes ?? null,
        status: "pending_review",
      };

      const { data: existingDoc, error: docLookupErr } = await supabase
        .from("project_guarantee_documents" as any)
        .select("id")
        .eq("project_id", data.project_id)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (docLookupErr) throw docLookupErr;

      const { error: gErr } = existingDoc
        ? await (supabase.from("project_guarantee_documents" as any) as any).update(gPatch).eq("id", (existingDoc as any).id).eq("owner_id", userId)
        : await (supabase.from("project_guarantee_documents" as any) as any).insert(gPatch);
      if (gErr) throw gErr;

      // Best-effort legacy mirror for older admin pages; do not fail the edit
      // flow if this protected table rejects direct user writes.
      try {
        const legacyPatch: Record<string, unknown> = {
          project_id: data.project_id,
          guarantee_type: g.type,
          amount: g.amount,
          currency: g.currency,
          document_url: g.signed_document_url ?? null,
          guarantor_name: g.guarantor_full_name ?? null,
          guarantor_id: g.guarantor_id_number ?? null,
          notes: g.notes ?? null,
          status: "pending_review",
        };
        const { data: legacy } = await supabase
          .from("project_guarantees" as any)
          .select("id")
          .eq("project_id", data.project_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (legacy) {
          await (supabase.from("project_guarantees" as any) as any).update(legacyPatch).eq("id", (legacy as any).id);
        } else {
          await (supabase.from("project_guarantees" as any) as any).insert(legacyPatch);
        }
      } catch (mirrorErr) {
        console.warn("[updateMyProject.legacyGuaranteeMirror] skipped", mirrorErr);
      }

      const projPatch: Record<string, unknown> = {
        has_guarantee: true,
        guarantee_amount: g.amount,
      };
      await (supabase.from("projects") as any).update(projPatch).eq("id", data.project_id);
    }

    return { id: data.project_id, ok: true };
  });
