import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { z } from 'zod';

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

// ===== Public reads =====
export const getShareInfo = createServerFn({ method: 'GET' })
  .inputValidator((d: { project_id: string }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row } = await sb.from('project_shares' as any).select('*').eq('project_id', data.project_id).maybeSingle();
    return row;
  });

export const getOrderBook = createServerFn({ method: 'GET' })
  .inputValidator((d: { project_id: string; depth?: number }) => ({ project_id: d.project_id, depth: Math.min(d.depth ?? 10, 50) }))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const [bidsRes, asksRes] = await Promise.all([
      sb.from('share_orders_v2' as any).select('price, quantity, filled_quantity').eq('project_id', data.project_id).eq('side', 'buy').in('status', ['pending', 'partial']).order('price', { ascending: false }).limit(data.depth),
      sb.from('share_orders_v2' as any).select('price, quantity, filled_quantity').eq('project_id', data.project_id).eq('side', 'sell').in('status', ['pending', 'partial']).order('price', { ascending: true }).limit(data.depth),
    ]);
    // Aggregate by price
    const agg = (rows: any[]) => {
      const m = new Map<number, number>();
      (rows ?? []).forEach((r) => {
        const remaining = Number(r.quantity) - Number(r.filled_quantity ?? 0);
        if (remaining <= 0 || r.price == null) return;
        m.set(Number(r.price), (m.get(Number(r.price)) ?? 0) + remaining);
      });
      return Array.from(m.entries()).map(([price, qty]) => ({ price, quantity: qty }));
    };
    return { bids: agg(bidsRes.data ?? []), asks: agg(asksRes.data ?? []) };
  });

export const getCandles = createServerFn({ method: 'GET' })
  .inputValidator((d: { project_id: string; limit?: number }) => ({ project_id: d.project_id, limit: Math.min(d.limit ?? 200, 1000) }))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows } = await sb.from('share_price_history' as any)
      .select('ts, open, high, low, close, volume')
      .eq('project_id', data.project_id)
      .order('ts', { ascending: true })
      .limit(data.limit);
    return rows ?? [];
  });

export const getRecentTrades = createServerFn({ method: 'GET' })
  .inputValidator((d: { project_id: string; limit?: number }) => ({ project_id: d.project_id, limit: Math.min(d.limit ?? 30, 100) }))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows } = await sb.from('share_trades' as any)
      .select('price, quantity, executed_at')
      .eq('project_id', data.project_id)
      .order('executed_at', { ascending: false })
      .limit(data.limit);
    return rows ?? [];
  });

export const getMarketOverview = createServerFn({ method: 'GET' })
  .handler(async () => {
    const sb = publicClient();
    const { data: rows } = await sb.from('project_shares' as any)
      .select('project_id, current_price, price_change_24h_pct, volume_24h, market_cap, projects(name, sector, cover_image_url)')
      .order('market_cap', { ascending: false })
      .limit(50);
    return rows ?? [];
  });

// ===== Authenticated actions =====
const orderSchema = z.object({
  project_id: z.string().uuid(),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit']),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
});

export const placeOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => orderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: r, error } = await supabase.rpc('place_share_order' as any, {
      p_project_id: data.project_id,
      p_side: data.side,
      p_type: data.type,
      p_quantity: data.quantity,
      p_price: data.price ?? null,
    } as any);
    if (error) throw new Error(error.message);
    return r;
  });

export const cancelOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('cancel_share_order' as any, { p_order_id: data.order_id } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listShares = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { project_id: string; total_supply: number; initial_price: number; min_purchase?: number; lockup_days?: number }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('list_project_shares' as any, {
      p_project_id: data.project_id,
      p_total_supply: data.total_supply,
      p_initial_price: data.initial_price,
      p_min_purchase: data.min_purchase ?? 1,
      p_lockup_days: data.lockup_days ?? 0,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyPortfolio = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: holdings } = await supabase.from('share_holdings' as any)
      .select('quantity, avg_buy_price, total_invested, project_id, projects(name, cover_image_url)')
      .eq('user_id', userId)
      .gt('quantity', 0);
    const ids = (holdings ?? []).map((h: any) => h.project_id);
    let shares: any[] = [];
    if (ids.length) {
      const { data } = await supabase.from('project_shares' as any).select('project_id, current_price').in('project_id', ids);
      shares = data ?? [];
    }
    const merged = (holdings ?? []).map((h: any) => {
      const s = shares.find((x: any) => x.project_id === h.project_id);
      const cur = Number(s?.current_price ?? h.avg_buy_price);
      const value = Number(h.quantity) * cur;
      const pnl = value - Number(h.total_invested);
      return { ...h, current_price: cur, value, pnl, pnl_pct: h.total_invested > 0 ? (pnl / Number(h.total_invested)) * 100 : 0 };
    });
    const total_value = merged.reduce((a, b) => a + b.value, 0);
    const total_invested = merged.reduce((a, b) => a + Number(b.total_invested), 0);
    return { holdings: merged, total_value, total_invested, total_pnl: total_value - total_invested };
  });

export const getMyOpenOrders = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from('share_orders_v2' as any)
      .select('*, projects(name)')
      .eq('user_id', context.userId)
      .in('status', ['pending', 'partial'])
      .order('created_at', { ascending: false });
    return data ?? [];
  });

// ===== Price alerts =====
export const createPriceAlert = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { project_id: string; condition: 'above' | 'below' | 'change_pct' | 'volume'; target_value: number }) => d)
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase.from('price_alerts' as any).insert({
      user_id: context.userId, project_id: data.project_id, condition: data.condition, target_value: data.target_value,
    } as any).select().single();
    if (error) throw new Error(error.message);
    return r;
  });

export const listMyAlerts = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from('price_alerts' as any)
      .select('*, projects(name)').eq('user_id', context.userId).order('created_at', { ascending: false });
    return data ?? [];
  });
