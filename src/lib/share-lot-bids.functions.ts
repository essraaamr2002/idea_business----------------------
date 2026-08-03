import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const PlaceSchema = z.object({
  project_id: z.string().uuid(),
  kind: z.enum(['bid', 'tender']),
  shares: z.number().int().positive(),
  price_per_share: z.number().positive(),
  message: z.string().trim().max(1000).optional(),
});

/**
 * Place a bid (مزايدة) or tender (مناقصة) on a project's shares.
 *
 *  - bid    : shares < project.min_share_lot AND price_per_share > base price
 *  - tender : shares >= project.min_share_lot AND price_per_share < base price
 *
 * A 5% seriousness deposit amount is recorded with each offer.
 */
export const placeShareLotBid = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PlaceSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: project, error: pErr } = await supabase
      .from('projects')
      .select('id, owner_id, currency, share_price, current_price, min_share_lot, shares_total, shares_sold, status')
      .eq('id', data.project_id)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!project) throw new Error('project_not_found');
    const p: any = project;
    if (p.owner_id === userId) throw new Error('cannot_bid_on_own_project');
    if (p.status !== 'active' && p.status !== 'open') throw new Error('project_not_active');

    const basePrice = Number(p.current_price ?? p.share_price ?? 0);
    if (basePrice <= 0) throw new Error('project_has_no_share_price');
    const minLot = Number(p.min_share_lot ?? 100);
    const remaining = Number(p.shares_total ?? 0) - Number(p.shares_sold ?? 0);
    if (data.shares > remaining) throw new Error(`الأسهم المتاحة فقط ${remaining}.`);

    if (data.kind === 'bid') {
      if (data.shares >= minLot) {
        throw new Error(`المزايدة لعدد أسهم أقل من الحد الأدنى (${minLot}). للشراء بالحد الأدنى استخدم "مناقصة".`);
      }
      if (data.price_per_share <= basePrice) {
        throw new Error(`في المزايدة يجب أن يكون سعر السهم أعلى من سعر السوق (${basePrice}).`);
      }
    } else {
      if (data.shares < minLot) {
        throw new Error(`في المناقصة يجب أن يكون عدد الأسهم بالحد الأدنى أو أعلى (${minLot}).`);
      }
      if (data.price_per_share >= basePrice) {
        throw new Error(`في المناقصة يجب أن يكون سعر السهم أقل من سعر السوق (${basePrice}).`);
      }
    }

    const total = data.shares * data.price_per_share;
    const deposit = Math.max(1, Math.round(total * 0.05 * 100) / 100);

    const { data: row, error } = await (supabase.from('share_lot_bids') as any)
      .insert({
        project_id: data.project_id,
        bidder_id: userId,
        owner_id: p.owner_id,
        kind: data.kind,
        shares: data.shares,
        price_per_share: data.price_per_share,
        deposit_amount: deposit,
        currency: p.currency || 'SAR',
        message: data.message ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    try {
      await (supabase.from('notifications') as any).insert({
        user_id: p.owner_id,
        title: data.kind === 'bid' ? 'مزايدة جديدة على أسهم مشروعك' : 'مناقصة جديدة على أسهم مشروعك',
        body: `${data.shares} سهم بسعر ${data.price_per_share} لكل سهم (إجمالي ${total.toLocaleString('ar')}).`,
        kind: 'share_lot_bid',
        href: `/projects/${data.project_id}`,
      });
    } catch { /* non-blocking */ }

    return row;
  });

export const listProjectShareLotBids = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from('share_lot_bids' as any)
      .select('*')
      .eq('project_id', data.project_id)
      .or(`bidder_id.eq.${userId},owner_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return rows ?? [];
  });

export const respondToShareLotBid = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    action: z.enum(['accept', 'reject']),
    reply: z.string().trim().max(1000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: bid, error: gErr } = await supabase
      .from('share_lot_bids' as any)
      .select('id, owner_id, status')
      .eq('id', data.id)
      .maybeSingle();
    if (gErr) throw gErr;
    const b: any = bid;
    if (!b) throw new Error('not_found');
    if (b.owner_id !== userId) throw new Error('forbidden');
    if (b.status !== 'pending') throw new Error('already_resolved');

    const { data: updated, error } = await (supabase.from('share_lot_bids') as any)
      .update({
        status: data.action === 'accept' ? 'accepted' : 'rejected',
        reply: data.reply ?? null,
        responded_at: new Date().toISOString(),
      })
      .eq('id', data.id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  });

export const withdrawShareLotBid = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await (supabase.from('share_lot_bids') as any)
      .update({ status: 'withdrawn' })
      .eq('id', data.id)
      .eq('bidder_id', userId)
      .eq('status', 'pending');
    if (error) throw error;
    return { ok: true };
  });
