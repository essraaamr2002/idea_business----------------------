import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const startNegotiation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    project_id: string;
    amount: number;
    equity_pct?: number;
    terms?: string;
    expires_days?: number;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: proj, error: pErr } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', data.project_id)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!proj) throw new Error('project_not_found');
    if (proj.owner_id === userId) throw new Error('cannot_negotiate_own_project');

    const expires = new Date(Date.now() + (data.expires_days ?? 7) * 24 * 3600 * 1000).toISOString();

    const { data: neg, error } = await supabase
      .from('negotiations' as any)
      .insert({
        project_id: data.project_id,
        investor_id: userId,
        owner_id: proj.owner_id,
        round_number: 1,
        current_offer_amount: data.amount,
        current_offer_by: userId,
        proposed_equity_pct: data.equity_pct,
        terms_text: data.terms,
        expires_at: expires,
      } as any)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('offer_history' as any).insert({
      negotiation_id: (neg as any).id,
      made_by_id: userId,
      amount: data.amount,
      equity_pct: data.equity_pct,
      terms_text: data.terms,
    } as any);

    return neg;
  });

export const counterOffer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { negotiation_id: string; amount: number; equity_pct?: number; terms?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: neg, error: gErr } = await supabase
      .from('negotiations' as any)
      .select('*')
      .eq('id', data.negotiation_id)
      .maybeSingle();
    if (gErr) throw gErr;
    if (!neg) throw new Error('not_found');
    const n: any = neg;
    if (n.investor_id !== userId && n.owner_id !== userId) throw new Error('forbidden');
    if (n.status !== 'open') throw new Error('not_open');
    if (n.round_number >= 10) throw new Error('max_rounds_reached');

    await supabase.from('offer_history' as any).insert({
      negotiation_id: n.id,
      made_by_id: userId,
      amount: data.amount,
      equity_pct: data.equity_pct,
      terms_text: data.terms,
      response: 'countered',
    } as any);

    const { data: updated, error } = await supabase
      .from('negotiations' as any)
      .update({
        round_number: n.round_number + 1,
        current_offer_amount: data.amount,
        current_offer_by: userId,
        proposed_equity_pct: data.equity_pct,
        terms_text: data.terms,
        last_updated_at: new Date().toISOString(),
      } as any)
      .eq('id', n.id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  });

export const respondToNegotiation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { negotiation_id: string; action: 'accept' | 'reject' }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: neg } = await supabase
      .from('negotiations' as any)
      .select('*')
      .eq('id', data.negotiation_id)
      .maybeSingle();
    const n: any = neg;
    if (!n) throw new Error('not_found');
    if (n.investor_id !== userId && n.owner_id !== userId) throw new Error('forbidden');
    if (n.current_offer_by === userId) throw new Error('cannot_respond_own_offer');

    const newStatus = data.action === 'accept' ? 'accepted' : 'rejected';
    const { data: updated, error } = await supabase
      .from('negotiations' as any)
      .update({ status: newStatus, last_updated_at: new Date().toISOString() } as any)
      .eq('id', n.id)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('offer_history' as any).insert({
      negotiation_id: n.id,
      made_by_id: userId,
      amount: n.current_offer_amount,
      equity_pct: n.proposed_equity_pct,
      response: newStatus,
    } as any);

    return updated;
  });

export const listMyNegotiations = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from('negotiations' as any)
      .select('*, projects(name, cover_image_url)')
      .or(`investor_id.eq.${userId},owner_id.eq.${userId}`)
      .order('last_updated_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
