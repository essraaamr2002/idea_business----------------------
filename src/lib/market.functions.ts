import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'

/** يحسب/يزيد عدّاد معدل الطلبات ويرمي خطأً عند تجاوز الحد. */
async function assertMarketRateLimit(
  userId: string,
  action: string,
  opts: { limit: number; windowSec: number }
): Promise<void> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const now = Date.now()
  const bucket = new Date(Math.floor(now / (opts.windowSec * 1000)) * opts.windowSec * 1000).toISOString()
  const key = `${userId}:${action}`
  const { data } = await supabaseAdmin
    .from('market_rate_limits')
    .select('count')
    .eq('key', key)
    .eq('bucket_start', bucket)
    .maybeSingle()
  const current = Number((data as any)?.count ?? 0)
  if (current >= opts.limit) {
    await logMarketAudit({ userId, action, outcome: 'rate_limited', details: { limit: opts.limit, windowSec: opts.windowSec } })
    throw new Error('تم تجاوز الحد المسموح من الطلبات. الرجاء الانتظار قليلاً.')
  }
  await supabaseAdmin.from('market_rate_limits').upsert(
    { key, bucket_start: bucket, count: current + 1 } as any,
    { onConflict: 'key,bucket_start' } as any
  )
}

async function logMarketAudit(row: {
  userId: string
  action: string
  outcome: 'success' | 'denied' | 'error' | 'rate_limited'
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    await supabaseAdmin.from('sm_market_audit_log').insert({
      user_id: row.userId,
      action: row.action,
      outcome: row.outcome,
      details: row.details ?? {},
    } as any)
  } catch { /* best-effort */ }
}


/** فتح حساب سوق موازي (Bootstrap) */
export const smOpenAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context
    const { data: existing } = await supabase.from('sm_accounts').select('*').eq('user_id', userId).maybeSingle()
    if (existing) return existing
    const { data, error } = await supabase.from('sm_accounts').insert({ user_id: userId, country_code: 'SA' }).select('*').single()
    if (error) throw error
    return data
  })

/** ملخص المحفظة + الأرصدة */
export const smGetPortfolio = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context
    const { data: acc } = await supabase.from('sm_accounts').select('*').eq('user_id', userId).maybeSingle()
    if (!acc) return { account: null, wallets: [], holdings: [], loans: [] }
    const [w, h, l] = await Promise.all([
      supabase.from('sm_wallets').select('*').eq('account_id', acc.id),
      supabase.from('sm_cap_table').select('*, listing:sm_listings(symbol,name,reference_price)').eq('account_id', acc.id),
      supabase.from('sm_margin_loans').select('*').eq('account_id', acc.id).neq('status', 'closed'),
    ])
    return { account: acc, wallets: w.data ?? [], holdings: h.data ?? [], loans: l.data ?? [] }
  })

/** إدراج جديد في السوق (طرح مشروع أو فكرة) */
export const smCreateListing = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    project_id: z.string().uuid().optional(),
    name: z.string().min(3).max(200),
    stage: z.enum(['idea', 'project']),
    total_shares: z.number().int().min(1000).max(10_000_000),
    collateral_value: z.number().min(0).default(0),
    annual_revenue: z.number().nullable().optional(),
    solvency_score: z.number().min(0).max(100).default(0),
    initial_price: z.number().min(0.01).default(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    // ensure account
    let { data: acc } = await supabase.from('sm_accounts').select('id').eq('user_id', userId).maybeSingle()
    if (!acc) {
      const { data: created, error } = await supabase.from('sm_accounts').insert({ user_id: userId }).select('id').single()
      if (error) throw error
      acc = created
    }
    const platform_shares = Math.floor((data.total_shares * 8) / 100)
    const total_shares = platform_shares * 100 / 8 === data.total_shares ? data.total_shares : platform_shares * 12 + data.total_shares - platform_shares
    // ensure divisible by 100 for exact 8%
    const adjusted_total = Math.floor(data.total_shares / 100) * 100
    const adjusted_platform = (adjusted_total * 8) / 100

    // احسب التقييم الأقصى
    const { data: valData } = await supabase.rpc('sm_calc_max_valuation', {
      p_stage: data.stage,
      p_annual_revenue: (data.annual_revenue ?? 0) as number,
      p_collateral: data.collateral_value,
      p_solvency: data.solvency_score,
    })
    const max_valuation = Number(valData ?? 1000)

    // سعر مرجعي أولي: min(initial_price, max_valuation/total_shares)
    const cap_price = max_valuation / adjusted_total
    const reference_price = Math.min(data.initial_price, cap_price)

    const symbol = `SM-${Date.now().toString(36).toUpperCase()}`

    const { data: listing, error } = await supabase.from('sm_listings').insert({
      project_id: data.project_id ?? null,
      symbol,
      owner_account_id: acc.id,
      name: data.name,
      stage: data.stage,
      total_shares: adjusted_total,
      platform_shares: adjusted_platform,
      collateral_value: data.collateral_value,
      annual_revenue: data.stage === 'idea' ? null : data.annual_revenue ?? 0,
      solvency_score: data.solvency_score,
      max_valuation,
      reference_price,
      status: 'pending_review',
    }).select('*').single()
    if (error) throw error
    return listing
  })

/** وضع أمر بيع/شراء */
export const smPlaceOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    listing_id: z.string().uuid(),
    side: z.enum(['BUY', 'SELL']),
    type: z.enum(['LIMIT', 'MARKET']),
    price: z.number().positive().optional(),
    quantity: z.number().int().positive(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    await assertMarketRateLimit(userId, 'place_order', { limit: 30, windowSec: 60 })

    try {
      const { data: acc } = await supabase.from('sm_accounts').select('id,status,kyc_tier,max_investment_cap').eq('user_id', userId).maybeSingle()
      if (!acc) throw new Error('يجب فتح حساب سوق موازي أولاً')
      if (acc.status !== 'active') throw new Error('الحساب غير نشط')

      // فحص سقف الاستثمار حسب مستوى KYC (قيمة الأمر)
      if (data.price && data.type === 'LIMIT') {
        const orderValue = data.price * data.quantity
        if (orderValue > Number(acc.max_investment_cap)) {
          throw new Error(`قيمة الأمر (${orderValue.toFixed(2)}) تتجاوز سقف الاستثمار (${acc.max_investment_cap}) لمستوى KYC: ${acc.kyc_tier}`)
        }
      }

      // فحص حد التذبذب لأوامر LIMIT
      if (data.type === 'LIMIT' && data.price) {
        const { data: ok } = await supabase.rpc('sm_check_daily_limit', { p_listing_id: data.listing_id, p_price: data.price })
        if (!ok) throw new Error('السعر خارج نطاق التذبذب اليومي (±10%)')
      }

      // فحص الرصيد النقدي للأوامر الشرائية
      if (data.side === 'BUY' && data.type === 'LIMIT' && data.price) {
        const need = data.price * data.quantity
        const { data: wallet } = await supabase.from('sm_wallets').select('balance').eq('account_id', acc.id).eq('wallet_type', 'trading_cash').maybeSingle()
        const bal = Number(wallet?.balance ?? 0)
        if (bal < need) throw new Error(`رصيد غير كافٍ. مطلوب ${need.toFixed(2)} — متوفر ${bal.toFixed(2)}`)
      }

      // فحص الأسهم للأوامر البيعية
      if (data.side === 'SELL') {
        const { data: cap } = await supabase.from('sm_cap_table').select('shares_held,shares_pledged').eq('account_id', acc.id).eq('listing_id', data.listing_id).maybeSingle()
        const avail = Number(cap?.shares_held ?? 0) - Number(cap?.shares_pledged ?? 0)
        if (avail < data.quantity) throw new Error(`أسهم غير كافية. متوفر ${avail}`)
      }

      const { data: order, error } = await supabase.from('sm_orders').insert({
        listing_id: data.listing_id,
        account_id: acc.id,
        side: data.side,
        type: data.type,
        price: data.type === 'LIMIT' ? data.price : null,
        quantity: data.quantity,
        remaining: data.quantity,
      }).select('*').single()
      if (error) throw error

      const { data: matchRes } = await supabase.rpc('sm_match_order', { p_order_id: order.id })
      await triggerLiquidationsIfAny(supabase, acc.id)
      await logMarketAudit({ userId, action: 'place_order', outcome: 'success', details: { order_id: order.id, side: data.side, type: data.type } })
      return { order, match: matchRes }
    } catch (e: any) {
      await logMarketAudit({ userId, action: 'place_order', outcome: 'denied', details: { message: e?.message, listing_id: data.listing_id } })
      throw e
    }
  })


/** إلغاء أمر مفتوح */
export const smCancelOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { data: acc } = await supabase.from('sm_accounts').select('id').eq('user_id', userId).maybeSingle()
    if (!acc) throw new Error('لا يوجد حساب')
    const { data: order } = await supabase.from('sm_orders').select('id,account_id,status').eq('id', data.order_id).maybeSingle()
    if (!order || order.account_id !== acc.id) throw new Error('الأمر غير موجود')
    if (!['OPEN', 'PARTIALLY_FILLED'].includes(order.status)) throw new Error('الأمر منفذ/ملغى مسبقاً')
    const { error } = await supabase.from('sm_orders').update({ status: 'CANCELLED' }).eq('id', data.order_id)
    if (error) throw error
    return { cancelled: true }
  })

/** OHLCV يومي لآخر 90 يوم لرسم الشموع */
export const smGetOHLC = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => z.object({ listing_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: rows } = await sb
      .from('mv_sm_project_daily_stats')
      .select('trading_day,open,high,low,close,volume,volatility')
      .eq('listing_id', data.listing_id)
      .order('trading_day', { ascending: false })
      .limit(90)
    return rows ?? []
  })

/** حالة الهامش الحالية (أحدث لقطة لكل قرض نشط) */
export const smGetMarginStatus = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context
    const { data: acc } = await supabase.from('sm_accounts').select('id').eq('user_id', userId).maybeSingle()
    if (!acc) return []
    const { data: loans } = await supabase
      .from('sm_margin_loans')
      .select('id,principal_amount,outstanding_balance,status,annual_interest_rate,collateral_required_pct,maintenance_pct,liquidation_pct')
      .eq('account_id', acc.id).neq('status', 'closed')
    if (!loans?.length) return []
    const results = await Promise.all(loans.map(async (l) => {
      const { data: snap } = await supabase
        .from('sm_margin_snapshots')
        .select('account_value,loan_balance,margin_ratio,snapshot_at')
        .eq('loan_id', l.id).order('snapshot_at', { ascending: false }).limit(1).maybeSingle()
      return { ...l, latest_snapshot: snap }
    }))
    return results
  })

/** فحص القروض التي دخلت liquidating وتنفيذ أمر MARKET SELL بحجم التصفية */
async function triggerLiquidationsIfAny(supabase: any, accountId: string) {
  const { data: liq } = await supabase
    .from('sm_margin_loans')
    .select('id,account_id,outstanding_balance')
    .eq('account_id', accountId).eq('status', 'liquidating')
  if (!liq?.length) return
  for (const loan of liq) {
    const { data: evalRes } = await supabase.rpc('sm_evaluate_margin_loan', { p_loan_id: loan.id })
    const row = Array.isArray(evalRes) ? evalRes[0] : evalRes
    const amount = Number(row?.liquidation_amount ?? 0)
    if (amount <= 0) continue
    const { data: pos } = await supabase
      .from('sm_cap_table')
      .select('listing_id,shares_held,shares_pledged,listing:sm_listings(reference_price)')
      .eq('account_id', loan.account_id)
      .order('shares_held', { ascending: false }).limit(1).maybeSingle()
    if (!pos) continue
    const refPrice = Number((pos as any).listing?.reference_price ?? 0)
    if (refPrice <= 0) continue
    const shares = Math.min(
      Math.ceil(amount / refPrice),
      Number(pos.shares_held) - Number(pos.shares_pledged),
    )
    if (shares <= 0) continue
    const { data: order } = await supabase.from('sm_orders').insert({
      listing_id: pos.listing_id, account_id: loan.account_id,
      side: 'SELL', type: 'MARKET', price: null, quantity: shares, remaining: shares,
    }).select('id').single()
    if (order) {
      await supabase.rpc('sm_match_order', { p_order_id: order.id })
      const { data: lastSnap } = await supabase.from('sm_margin_snapshots')
        .select('margin_ratio').eq('loan_id', loan.id).order('snapshot_at', { ascending: false }).limit(1).maybeSingle()
      await supabase.from('sm_liquidation_events').insert({
        loan_id: loan.id,
        trigger_ratio: lastSnap?.margin_ratio ?? null,
        shares_sold: shares,
        proceeds: shares * refPrice,
      })
    }
  }
}

/** طلب قرض هامش (رافعة 140%) */
export const smRequestMarginLoan = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    principal_amount: z.number().positive(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { data: acc } = await supabase.from('sm_accounts').select('id,kyc_tier,max_investment_cap').eq('user_id', userId).maybeSingle()
    if (!acc) throw new Error('يجب فتح حساب سوق موازي أولاً')
    if (acc.kyc_tier === 'unverified') throw new Error('يتطلب توثيق الهوية (KYC)')

    // ضمان 140%: يجب أن يمتلك المستخدم على الأقل 1.4× في رصيده
    const required_collateral = data.principal_amount * 1.4
    const { data: wallet } = await supabase.from('sm_wallets').select('balance').eq('account_id', acc.id).eq('wallet_type', 'trading_cash').maybeSingle()
    const bal = Number(wallet?.balance ?? 0)
    if (bal < required_collateral) {
      throw new Error(`يتطلب ضمان 140%: ${required_collateral.toFixed(2)} ريال في محفظتك (متوفر ${bal.toFixed(2)})`)
    }
    // حد التمويل حسب مستوى KYC
    if (data.principal_amount > Number(acc.max_investment_cap)) {
      throw new Error(`تجاوز الحد المسموح (${acc.max_investment_cap} ريال)`)
    }

    const { data: loan, error } = await supabase.from('sm_margin_loans').insert({
      account_id: acc.id,
      principal_amount: data.principal_amount,
      outstanding_balance: data.principal_amount,
    }).select('*').single()
    if (error) throw error

    // TODO: crédit reserved_margin wallet via ledger insert (post-approval)
    return loan
  })

/** جلب دفتر الأوامر لسهم */
export const smGetOrderBook = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => z.object({ listing_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
    const [bids, asks, listing, trades] = await Promise.all([
      sb.from('sm_orders').select('price,remaining').eq('listing_id', data.listing_id).eq('side', 'BUY').in('status', ['OPEN', 'PARTIALLY_FILLED']).order('price', { ascending: false }).limit(20),
      sb.from('sm_orders').select('price,remaining').eq('listing_id', data.listing_id).eq('side', 'SELL').in('status', ['OPEN', 'PARTIALLY_FILLED']).order('price', { ascending: true }).limit(20),
      sb.from('sm_listings').select('*').eq('id', data.listing_id).maybeSingle(),
      sb.from('sm_trades').select('price,quantity,executed_at').eq('listing_id', data.listing_id).order('executed_at', { ascending: false }).limit(30),
    ])
    return { bids: bids.data ?? [], asks: asks.data ?? [], listing: listing.data, trades: trades.data ?? [] }
  })

/** قائمة الإدراجات النشطة */
export const smListActive = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data } = await sb.from('sm_listings')
      .select('id,symbol,name,stage,reference_price,total_shares,max_valuation,daily_limit_pct,last_price_update_at,status')
      .in('status', ['active', 'halted'])
      .order('last_price_update_at', { ascending: false })
      .limit(100)
    return data ?? []
  })

/** فتح مركز ممول: يفتح قرض هامش + يضع أمر شراء LIMIT بضمان 140% في معاملة واحدة */
export const smOpenFinancedPosition = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    listing_id: z.string().uuid(),
    collateral_amount: z.number().positive(),
    loan_amount: z.number().positive(),
    order_price: z.number().positive(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context
    await assertMarketRateLimit(userId, 'open_financed', { limit: 10, windowSec: 60 })
    try {
      // Server-side sanity: enforce 140% collateral ratio mathematically
      if (data.collateral_amount < data.loan_amount * 1.4) {
        throw new Error(`ضمان غير كافٍ. المطلوب على الأقل ${(data.loan_amount * 1.4).toFixed(2)} (140% من القرض)`)
      }
      const buyingPower = data.collateral_amount + data.loan_amount
      const quantity = Math.floor(buyingPower / data.order_price)
      if (quantity <= 0) throw new Error('قدرة الشراء لا تكفي لسهم واحد')

      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
      const { data: result, error } = await supabaseAdmin.rpc('sm_open_financed_position', {
        p_user_id: userId,
        p_listing_id: data.listing_id,
        p_loan_amount: data.loan_amount,
        p_limit_price: data.order_price,
        p_shares: quantity,
      })
      if (error) throw new Error(error.message)
      await logMarketAudit({
        userId, action: 'open_financed_position', outcome: 'success',
        details: { listing_id: data.listing_id, loan: data.loan_amount, quantity, price: data.order_price },
      })
      return { ok: true, result, quantity }
    } catch (e: any) {
      await logMarketAudit({ userId, action: 'open_financed_position', outcome: 'error', details: { message: e?.message } })
      throw e
    }
  })

/** جدول زمني للأرباح والخسائر: أحدث لقطات هامش (آخر 30 يوماً) */
export const smGetPnlTimeline = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context
    const { data: acc } = await supabase.from('sm_accounts').select('id').eq('user_id', userId).maybeSingle()
    if (!acc) return []
    const since = new Date(Date.now() - 30 * 86400_000).toISOString()
    const { data } = await supabase
      .from('sm_margin_snapshots')
      .select('snapshot_at,account_value,loan_balance,margin_ratio')
      .gte('snapshot_at', since)
      .order('snapshot_at', { ascending: true })
      .limit(500)
    return data ?? []
  })

/** أحدث أحداث الهامش (Margin Call / Liquidation) لعرض التنبيهات */
export const smGetMarginEvents = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context
    const { data: acc } = await supabase.from('sm_accounts').select('id').eq('user_id', userId).maybeSingle()
    if (!acc) return []
    const { data: loans } = await supabase.from('sm_margin_loans').select('id').eq('account_id', acc.id)
    const ids = (loans ?? []).map((l: any) => l.id)
    if (!ids.length) return []
    const { data } = await supabase
      .from('sm_liquidation_events')
      .select('id,loan_id,trigger_ratio,shares_sold,proceeds,created_at')
      .in('loan_id', ids)
      .order('created_at', { ascending: false })
      .limit(20)
    return data ?? []
  })
