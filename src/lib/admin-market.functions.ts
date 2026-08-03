/**
 * وظائف إدارة السوق الموازي — تعادل admin-api.ts (Fastify) لكن كـ createServerFn.
 * كل الوظائف مقيّدة بدور 'admin' فقط.
 */
import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc('has_role', {
    _user_id: ctx.userId,
    _role: 'admin',
  })
  if (error || !data) throw new Error('forbidden')
}

async function audit(ctx: { supabase: any; userId: string }, action: string, entity_type: string, entity_id: string | null, payload: any) {
  await ctx.supabase.from('sm_audit_log').insert({
    actor_id: ctx.userId,
    action,
    entity_type,
    entity_id,
    payload,
  }).then((r: any) => r).catch(() => null)
}

/** لوحة القياسات العامة */
export const smAdminOverview = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context)
    const { supabase } = context
    const [listings, flags, loans, trades24, accounts] = await Promise.all([
      supabase.from('sm_listings').select('status'),
      supabase.from('sm_compliance_flags').select('severity').eq('resolved', false),
      supabase.from('sm_margin_loans').select('status,outstanding_balance').neq('status', 'closed'),
      supabase.from('sm_trades').select('price,quantity').gte('executed_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
      supabase.from('sm_accounts').select('status,kyc_tier'),
    ])
    const listingsByStatus: Record<string, number> = {}
    for (const r of listings.data ?? []) listingsByStatus[r.status] = (listingsByStatus[r.status] ?? 0) + 1
    const openFlagsBySeverity: Record<string, number> = {}
    for (const r of flags.data ?? []) openFlagsBySeverity[r.severity] = (openFlagsBySeverity[r.severity] ?? 0) + 1
    const loansByStatus: Record<string, { count: number; total: number }> = {}
    for (const r of loans.data ?? []) {
      loansByStatus[r.status] ??= { count: 0, total: 0 }
      loansByStatus[r.status].count += 1
      loansByStatus[r.status].total += Number(r.outstanding_balance ?? 0)
    }
    const volume24h = (trades24.data ?? []).reduce((s: number, t: any) => s + Number(t.price) * Number(t.quantity), 0)
    const accountsByKyc: Record<string, number> = {}
    for (const r of accounts.data ?? []) accountsByKyc[r.kyc_tier] = (accountsByKyc[r.kyc_tier] ?? 0) + 1
    return { listingsByStatus, openFlagsBySeverity, loansByStatus, volume24h, accountsByKyc, totalAccounts: accounts.data?.length ?? 0 }
  })

/** إدراجات بانتظار المراجعة */
export const smAdminPendingListings = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context)
    const { data } = await context.supabase
      .from('sm_listings')
      .select('*, owner:sm_accounts!sm_listings_owner_account_id_fkey(user_id,kyc_tier,country_code)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })
    return data ?? []
  })

/** اعتماد إدراج → تحويل الحالة إلى active + تسجيل حصة المنصة 8% */
export const smAdminApproveListing = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listing_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { supabase } = context
    const { data: listing, error } = await supabase
      .from('sm_listings')
      .update({ status: 'active' })
      .eq('id', data.listing_id)
      .eq('status', 'pending_review')
      .select('*')
      .single()
    if (error || !listing) throw new Error('الإدراج غير موجود أو لم يعد قيد المراجعة')

    // منح حصة المنصة (8%) إن لم توجد
    const { data: platformAcc } = await supabase
      .from('sm_accounts').select('id').eq('user_id', '00000000-0000-0000-0000-000000000000').maybeSingle()
    if (platformAcc && Number(listing.platform_shares) > 0) {
      await supabase.from('sm_cap_table').upsert({
        listing_id: listing.id,
        account_id: platformAcc.id,
        shares_held: listing.platform_shares,
        shares_pledged: 0,
      }, { onConflict: 'listing_id,account_id' })
    }
    await audit(context, 'listing_approved', 'sm_listing', listing.id, { symbol: listing.symbol })
    return { approved: true, listing }
  })

/** رفض إدراج */
export const smAdminRejectListing = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listing_id: z.string().uuid(), reason: z.string().min(3) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { data: r, error } = await context.supabase
      .from('sm_listings')
      .update({ status: 'delisted' })
      .eq('id', data.listing_id)
      .eq('status', 'pending_review')
      .select('id,symbol')
      .single()
    if (error || !r) throw new Error('الإدراج غير موجود أو تم البت فيه')
    await audit(context, 'listing_rejected', 'sm_listing', r.id, { reason: data.reason })
    return { rejected: true }
  })

/** إيقاف تداول (halt) طارئ */
export const smAdminHaltListing = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listing_id: z.string().uuid(), reason: z.string().min(3) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { data: r, error } = await context.supabase
      .from('sm_listings').update({ status: 'halted' }).eq('id', data.listing_id).select('id,symbol').single()
    if (error || !r) throw new Error('غير موجود')
    await audit(context, 'listing_halted', 'sm_listing', r.id, { reason: data.reason })
    return { halted: true, symbol: r.symbol }
  })

/** إعادة تفعيل تداول */
export const smAdminResumeListing = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listing_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { data: r, error } = await context.supabase
      .from('sm_listings').update({ status: 'active' }).eq('id', data.listing_id).eq('status', 'halted').select('id').single()
    if (error || !r) throw new Error('غير موجود أو ليس موقوفاً')
    await audit(context, 'listing_resumed', 'sm_listing', r.id, {})
    return { resumed: true }
  })

/** بلاغات المراقبة */
export const smAdminComplianceFlags = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ resolved: z.boolean().default(false), severity: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    let q = context.supabase
      .from('sm_compliance_flags')
      .select('*, listing:sm_listings(symbol,name), account:sm_accounts(user_id,kyc_tier)')
      .eq('resolved', data.resolved)
      .order('created_at', { ascending: false })
      .limit(200)
    if (data.severity) q = q.eq('severity', data.severity as 'critical' | 'high' | 'medium' | 'low')
    const { data: rows } = await q
    return rows ?? []
  })

export const smAdminResolveFlag = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ flag_id: z.string().uuid(), note: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { error } = await context.supabase
      .from('sm_compliance_flags')
      .update({ resolved: true, resolved_by: context.userId })
      .eq('id', data.flag_id)
    if (error) throw error
    await audit(context, 'flag_resolved', 'sm_compliance_flag', data.flag_id, { note: data.note })
    return { resolved: true }
  })

/** قروض هامش معرّضة للخطر (margin_ratio < 1.40) */
export const smAdminMarginAtRisk = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context)
    const { supabase } = context
    const { data: loans } = await supabase
      .from('sm_margin_loans')
      .select('id,account_id,principal_amount,outstanding_balance,status,annual_interest_rate,maintenance_pct,liquidation_pct,account:sm_accounts(user_id,kyc_tier)')
      .neq('status', 'closed')
    if (!loans?.length) return []
    const results = await Promise.all(loans.map(async (l: any) => {
      const { data: snap } = await supabase
        .from('sm_margin_snapshots')
        .select('account_value,loan_balance,margin_ratio,snapshot_at')
        .eq('loan_id', l.id).order('snapshot_at', { ascending: false }).limit(1).maybeSingle()
      return { ...l, latest_snapshot: snap }
    }))
    return results
      .filter((r: any) => !r.latest_snapshot || Number(r.latest_snapshot.margin_ratio ?? 999) < 1.4)
      .sort((a: any, b: any) => Number(a.latest_snapshot?.margin_ratio ?? 999) - Number(b.latest_snapshot?.margin_ratio ?? 999))
  })

/** آخر الصفقات — مراقبة حية */
export const smAdminRecentTrades = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context)
    const { data } = await context.supabase
      .from('sm_trades')
      .select('id,price,quantity,executed_at,listing:sm_listings(symbol,name),buyer:sm_accounts!sm_trades_buyer_account_id_fkey(user_id),seller:sm_accounts!sm_trades_seller_account_id_fkey(user_id)')
      .order('executed_at', { ascending: false })
      .limit(50)
    return data ?? []
  })
