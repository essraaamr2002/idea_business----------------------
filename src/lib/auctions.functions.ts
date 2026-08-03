import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listLiveAuctions = createServerFn({ method: 'GET' })
  .inputValidator((d: { limit?: number }) => ({ limit: Math.min(d?.limit ?? 20, 50) }))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from('auctions' as any)
      .select('id, project_id, type, currency, start_price, current_price, bids_count, ends_at, status, buy_now_price, reserve_price, projects:projects(name, cover_image_url)')
      .in('status', ['live', 'scheduled'])
      .order('ends_at', { ascending: true })
      .limit(data.limit);
    if (error) throw error;
    return rows ?? [];
  });

export const listAuctionsForProject = createServerFn({ method: 'GET' })
  .inputValidator((d: { project_id: string }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from('auctions' as any)
      .select('id, type, service_key, currency, start_price, current_price, bids_count, ends_at, status, buy_now_price, reserve_price, min_increment')
      .eq('project_id', data.project_id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return rows ?? [];
  });

export const getAuction = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: auction, error } = await sb
      .from('auctions' as any)
      .select('*')
      .eq('id', data.id)
      .maybeSingle();
    if (error) throw error;
    if (!auction) return null;
    const { data: bids } = await sb
      .from('bids' as any)
      .select('id, bidder_id, amount, is_auto_bid, created_at, status, sealed')
      .eq('auction_id', data.id)
      .order('created_at', { ascending: false })
      .limit(50);
    return { auction, bids: bids ?? [] };
  });

export const createAuction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    project_id: string;
    type: 'english' | 'sealed' | 'dutch' | 'reserve' | 'buynow';
    service_key?: 'auction_live' | 'auction_sealed' | 'tender_live' | 'tender_sealed';
    start_price: number;
    reserve_price?: number;
    buy_now_price?: number;
    min_increment?: number;
    deposit_pct?: number;
    ends_at: string;
    auto_extend_minutes?: number;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: proj, error: pErr } = await supabase
      .from('projects')
      .select('owner_id, currency, services_enabled')
      .eq('id', data.project_id)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!proj || proj.owner_id !== userId) throw new Error('forbidden');
    if (data.service_key) {
      const enabled = ((proj as any).services_enabled ?? {}) as Record<string, boolean>;
      if (!enabled[data.service_key]) throw new Error('service_not_enabled');
    }
    const { data: row, error } = await supabase
      .from('auctions' as any)
      .insert({
        project_id: data.project_id,
        owner_id: userId,
        type: data.type,
        service_key: data.service_key ?? null,
        currency: proj.currency ?? 'SAR',
        start_price: data.start_price,
        current_price: data.start_price,
        reserve_price: data.reserve_price,
        buy_now_price: data.buy_now_price,
        min_increment: data.min_increment ?? 1000,
        deposit_required_pct: data.deposit_pct ?? 5,
        ends_at: data.ends_at,
        auto_extend_minutes: data.auto_extend_minutes ?? 5,
        status: 'live',
      } as any)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const placeBid = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { auction_id: string; amount: number; is_auto?: boolean; max_auto?: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { requireSeriousnessDeposit } = await import('./seriousness-deposit.functions');
    await requireSeriousnessDeposit(supabase, context.userId);
    const { data: result, error } = await supabase.rpc('place_bid' as any, {
      p_auction_id: data.auction_id,
      p_amount: data.amount,
      p_is_auto: data.is_auto ?? false,
      p_max_auto: data.max_auto ?? null,
    } as any);
    if (error) throw error;
    return result;
  });

export const listMyBids = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: bids, error } = await supabase
      .from('bids' as any)
      .select('id, auction_id, amount, status, sealed, is_auto_bid, created_at, outbid_at, auctions:auctions(id, type, currency, current_price, start_price, status, ends_at, project_id, projects:projects(name))')
      .eq('bidder_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return bids ?? [];
  });


export const closeExpiredAuctions = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' as any });
    if (!isAdmin) throw new Error('forbidden');
    const { data, error } = await supabase.rpc('close_expired_auctions' as any);
    if (error) throw error;
    return { closed: data };
  });
