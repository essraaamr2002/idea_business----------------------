import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const contactSchema = z.object({
  full_name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().email().max(255).optional(),
}).refine((c) => c.phone || c.email, { message: "phone_or_email_required" });

export const importSharedContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    channel: string;
    referral_code?: string;
    contacts: Array<{ full_name?: string; phone?: string; email?: string }>;
    consent: boolean;
  }) => {
    const schema = z.object({
      channel: z.enum(["whatsapp", "sms", "email", "snapchat", "native", "contacts_api"]),
      referral_code: z.string().max(32).optional(),
      contacts: z.array(contactSchema).max(500),
      consent: z.boolean(),
    });
    return schema.parse(input);
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.consent) throw new Error("consent_required");

    const rows = data.contacts.map((c) => ({
      owner_id: userId,
      full_name: c.full_name ?? null,
      phone: c.phone ?? null,
      email: c.email ?? null,
      source: "contact_share",
      channel: data.channel,
      referral_code: data.referral_code ?? null,
      consent: true,
      status: "new",
    }));

    let inserted = 0;
    if (rows.length) {
      const { error, count } = await supabase.from("crm_leads").insert(rows as never, { count: "exact" });
      if (error) throw new Error(error.message);
      inserted = count ?? rows.length;
    }

    await supabase.from("share_events").insert({
      user_id: userId,
      channel: data.channel,
      recipients_count: rows.length,
      referral_code: data.referral_code ?? null,
    } as never);

    return { ok: true, inserted };
  });

export const listAdminLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { status?: string; limit?: number }) => ({
    status: i?.status,
    limit: Math.min(i?.limit ?? 200, 500),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" as never });
    if (!isAdmin) throw new Error("forbidden");
    let q = supabase.from("crm_leads").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { leads: rows ?? [] };
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: string; notes?: string }) => z.object({
    id: z.string().uuid(),
    status: z.enum(["new", "contacted", "qualified", "converted", "rejected"]),
    notes: z.string().max(1000).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" as never });
    if (!isAdmin) throw new Error("forbidden");
    const { error } = await supabase.from("crm_leads")
      .update({ status: data.status, notes: data.notes ?? null } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
