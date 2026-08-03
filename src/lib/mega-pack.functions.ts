import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ------- Public: Market Pulse (top movers, recent volume) -------
export const getMarketPulse = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: prices } = await sb
    .from("share_price_history")
    .select("project_id, ts, close, volume")
    .gte("ts", since)
    .order("ts", { ascending: false })
    .limit(1000);
  const byProject = new Map<string, { first: number; last: number; volume: number }>();
  for (const row of prices ?? []) {
    const pid = row.project_id as string;
    const prev = byProject.get(pid);
    if (!prev) byProject.set(pid, { first: Number(row.close), last: Number(row.close), volume: Number(row.volume ?? 0) });
    else {
      prev.first = Number(row.close); // older loops overwrite last because desc order
      prev.volume += Number(row.volume ?? 0);
    }
  }
  const ids = Array.from(byProject.keys()).slice(0, 40);
  const { data: projects } = ids.length
    ? await sb.from("projects").select("id, name, ticker, sector, current_price").in("id", ids)
    : { data: [] as any[] };
  const rows = (projects ?? []).map((p) => {
    const m = byProject.get(p.id as string)!;
    const change = m.first ? ((m.last - m.first) / m.first) * 100 : 0;
    return { id: p.id, name: p.name, ticker: p.ticker, sector: p.sector, price: Number(p.current_price ?? m.last), change_pct: change, volume: m.volume };
  });
  const gainers = [...rows].sort((a, b) => b.change_pct - a.change_pct).slice(0, 8);
  const losers = [...rows].sort((a, b) => a.change_pct - b.change_pct).slice(0, 8);
  const active = [...rows].sort((a, b) => b.volume - a.volume).slice(0, 8);
  return { ok: true as const, gainers, losers, active, generated_at: new Date().toISOString() };
});

// ------- Member: Portfolio Heatmap by sector -------
export const getPortfolioHeatmap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: holdings } = await context.supabase
      .from("share_holdings")
      .select("project_id, quantity, avg_buy_price, total_invested")
      .eq("user_id", context.userId);
    const ids = (holdings ?? []).map((h) => h.project_id as string);
    if (!ids.length) return { ok: true as const, cells: [], sectors: [], total_invested: 0, total_value: 0 };
    const { data: projects } = await context.supabase
      .from("projects")
      .select("id, name, ticker, sector, current_price")
      .in("id", ids);
    const pmap = new Map((projects ?? []).map((p) => [p.id as string, p]));
    const cells = (holdings ?? []).map((h) => {
      const p = pmap.get(h.project_id as string);
      const qty = Number(h.quantity ?? 0);
      const cost = Number(h.total_invested ?? qty * Number(h.avg_buy_price ?? 0));
      const value = qty * Number(p?.current_price ?? h.avg_buy_price ?? 0);
      const pnl_pct = cost ? ((value - cost) / cost) * 100 : 0;
      return {
        project_id: h.project_id,
        name: p?.name ?? "—",
        ticker: p?.ticker ?? "",
        sector: p?.sector ?? "غير مصنّف",
        quantity: qty,
        value,
        cost,
        pnl_pct,
      };
    });
    const sectorAgg = new Map<string, { sector: string; value: number; cost: number }>();
    for (const c of cells) {
      const s = sectorAgg.get(c.sector) ?? { sector: c.sector, value: 0, cost: 0 };
      s.value += c.value;
      s.cost += c.cost;
      sectorAgg.set(c.sector, s);
    }
    const sectors = Array.from(sectorAgg.values()).map((s) => ({
      ...s,
      pnl_pct: s.cost ? ((s.value - s.cost) / s.cost) * 100 : 0,
    })).sort((a, b) => b.value - a.value);
    const total_value = cells.reduce((s, c) => s + c.value, 0);
    const total_invested = cells.reduce((s, c) => s + c.cost, 0);
    return { ok: true as const, cells, sectors, total_invested, total_value };
  });

// ------- Admin: Fraud Radar (aml + security combined) -------
export const getFraudRadar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const [aml, sec] = await Promise.all([
      context.supabase
        .from("aml_flags")
        .select("id, flag_type, severity, status, auto_detected_at, wallet_user_id, details")
        .gte("auto_detected_at", since)
        .order("auto_detected_at", { ascending: false })
        .limit(200),
      context.supabase
        .from("security_events")
        .select("id, event_type, severity, ip, country, blocked, created_at, user_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    const amlRows = (aml.data ?? []).map((r) => ({
      kind: "AML" as const,
      id: r.id,
      type: r.flag_type,
      severity: r.severity,
      status: r.status,
      at: r.auto_detected_at,
      subject: r.wallet_user_id,
      extra: r.details,
    }));
    const secRows = (sec.data ?? []).map((r) => ({
      kind: "SEC" as const,
      id: r.id,
      type: r.event_type,
      severity: r.severity,
      status: r.blocked ? "blocked" : "open",
      at: r.created_at,
      subject: r.user_id ?? r.ip,
      extra: { ip: r.ip, country: r.country },
    }));
    const merged = [...amlRows, ...secRows].sort((a, b) => (a.at! < b.at! ? 1 : -1));
    const sevCount = { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>;
    for (const r of merged) {
      const k = String(r.severity ?? "low").toLowerCase();
      if (k in sevCount) sevCount[k]++;
    }
    return {
      ok: true as const,
      total: merged.length,
      by_severity: sevCount,
      recent: merged.slice(0, 100),
      window_days: 7,
    };
  });
