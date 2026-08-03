import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const saveOwnershipSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        certificate_no: z.string().min(4).max(120),
        project_id: z.string().uuid(),
        signature_data_url: z
          .string()
          .startsWith("data:image/")
          .max(500_000), // ~500KB cap
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // upsert by certificate_no (unique)
    const { data: existing } = await (supabase as any)
      .from("ownership_certificate_signatures")
      .select("id, user_id, signature_data_url, signed_at")
      .eq("certificate_no", data.certificate_no)
      .maybeSingle();

    if (existing) {
      if (existing.user_id !== userId) throw new Error("سند يخص مستثمراً آخر");
      return {
        ok: true,
        already_signed: true,
        signed_at: existing.signed_at,
        signature_data_url: existing.signature_data_url,
      };
    }

    const { error } = await (supabase as any)
      .from("ownership_certificate_signatures")
      .insert({
        certificate_no: data.certificate_no,
        project_id: data.project_id,
        user_id: userId,
        signature_data_url: data.signature_data_url,
      });
    if (error) throw new Error(error.message);

    return { ok: true, already_signed: false, signed_at: new Date().toISOString() };
  });

export const getMyOwnershipSignature = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ certificate_no: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await (supabase as any)
      .from("ownership_certificate_signatures")
      .select("signature_data_url, signed_at")
      .eq("certificate_no", data.certificate_no)
      .eq("user_id", userId)
      .maybeSingle();
    return row ?? null;
  });
