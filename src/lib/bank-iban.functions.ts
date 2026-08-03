import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type GenerateResult =
  | { ok: true; iban: string; accountId: string | null; method: "self" | "bank" }
  | { ok: false; error: string };

/**
 * Generates a mathematically valid IBAN (MOD-97 / ISO 13616) using the
 * internal `assign_self_iban` RPC. No external bank API required.
 * Idempotent: returns the existing IBAN if one is already assigned.
 */
export const generateBankIban = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GenerateResult> => {
    const { supabase, userId } = context;

    // 1) idempotency — return existing
    const { data: existing, error: readErr } = await supabase
      .from("wallets")
      .select("bank_iban, bank_account_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) {
      console.error("[iban] read wallet failed", readErr);
      return { ok: false, error: "تعذّر قراءة المحفظة. حاول لاحقاً." };
    }
    if (existing?.bank_iban) {
      return { ok: true, iban: existing.bank_iban, accountId: existing.bank_account_id ?? null, method: "self" };
    }

    // 2) get country for IBAN prefix
    const { data: profile } = await supabase
      .from("profiles")
      .select("country")
      .eq("id", userId)
      .maybeSingle();
    const country = (profile?.country || "SA").toUpperCase().slice(0, 2);

    // 3) call privileged RPC via admin client (service role)
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: iban, error } = await supabaseAdmin.rpc("assign_self_iban", {
        p_user_id: userId,
        p_country: country,
      });
      if (error || !iban) {
        console.error("[iban] assign_self_iban failed", error);
        return { ok: false, error: "تعذّر توليد IBAN. حاول لاحقاً." };
      }
      return { ok: true, iban: iban as string, accountId: `SELF-${(iban as string).slice(4)}`, method: "self" };
    } catch (e) {
      console.error("[iban] unexpected", e);
      return { ok: false, error: "حدث خطأ غير متوقع." };
    }
  });

/**
 * Verifies the integrity of the user's ledger (SHA-256 hash chain).
 * Returns { secure: true } if the chain is intact, otherwise the tampered row id.
 */
export const verifyMyLedger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("verify_ledger_integrity", { p_user_id: userId });
    if (error) {
      console.error("[ledger-verify]", error);
      return { secure: false as const, error: "تعذّر التحقق من سلامة السجل." };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return { secure: !!row?.secure, tamperedId: row?.tampered_id ?? null };
  });
