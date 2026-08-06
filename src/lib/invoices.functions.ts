import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, amount, currency, purpose, provider, order_id, transaction_id, status, metadata, issued_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: inv, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("not_found");
    const { data: isStaff } = await supabase.rpc("is_admin_staff", { _user_id: userId });
    if (inv.user_id !== userId && !isStaff) throw new Error("forbidden");
    return inv;
  });

export const adminListInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; from?: string; to?: string; limit?: number } | undefined) =>
    z.object({
      search: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isStaff } = await supabase.rpc("is_admin_staff", { _user_id: userId });
    if (!isStaff) throw new Error("forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, user_id, amount, currency, purpose, provider, order_id, transaction_id, status, issued_at, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.search) q = q.or(`invoice_number.ilike.%${data.search}%,order_id.ilike.%${data.search}%,transaction_id.ilike.%${data.search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });
