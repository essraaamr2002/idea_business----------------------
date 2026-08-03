import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getOwnershipCertificateData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("id, name, city, country, owner_id")
      .eq("id", data.project_id)
      .maybeSingle();
    if (pErr || !project) throw new Error("المشروع غير موجود");

    const { data: holding } = await (supabase as any)
      .from("share_holdings")
      .select("quantity, avg_buy_price")
      .eq("project_id", data.project_id)
      .eq("user_id", userId)
      .maybeSingle();

    const { data: parties } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", [project.owner_id, userId]);

    const owner = parties?.find((p: any) => p.id === project.owner_id);
    const investor = parties?.find((p: any) => p.id === userId);

    const qty = Number(holding?.quantity ?? 0);
    const avg = Number(holding?.avg_buy_price ?? 0);
    return {
      certificate_no: `ST-${project.id.slice(0, 8).toUpperCase()}-${userId.slice(0, 6).toUpperCase()}`,
      issued_at: new Date().toISOString(),
      project_id: project.id,
      project_name: project.name ?? "—",
      region: [project.city, project.country].filter(Boolean).join(" - ") || "—",
      owner_name: owner?.display_name || owner?.username || "—",
      investor_name: investor?.display_name || investor?.username || "—",
      shares: qty,
      investment_amount: +(qty * avg).toFixed(2),
      avg_buy_price: avg,
    };
  });
