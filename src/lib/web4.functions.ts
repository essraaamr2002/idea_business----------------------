import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'

const PermState = z.enum(['granted', 'denied', 'prompt', 'unknown'])
const Outcome = z.enum(['accepted', 'denied', 'error', 'partial', 'verified'])

/** يسجّل / يحدّث تفعيل Web4 للمستخدم الحالي، مع كتابة سجل تدقيق آلي. */
export const recordWeb4Activation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    mic_granted: z.boolean(),
    geo_granted: z.boolean(),
    reality_dim: z.number().int().min(3).max(14).default(14),
    last_lat: z.number().min(-90).max(90).nullable().optional(),
    last_lng: z.number().min(-180).max(180).nullable().optional(),
    last_accuracy_m: z.number().min(0).max(1_000_000).nullable().optional(),
    user_agent: z.string().max(500).nullable().optional(),
    mic_state: PermState.optional(),
    geo_state: PermState.optional(),
    outcome: Outcome.default('accepted'),
    broadcast_agents: z.boolean().default(false),
    error_message: z.string().max(500).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const activated = data.outcome === 'accepted' && data.mic_granted && data.geo_granted

    // Only persist activation row when at least one permission is granted; otherwise just audit.
    if (data.mic_granted || data.geo_granted) {
      const { error: upErr } = await supabase.from('web4_activations').upsert({
        user_id: userId,
        activated,
        mic_granted: data.mic_granted,
        geo_granted: data.geo_granted,
        reality_dim: data.reality_dim,
        last_lat: data.last_lat ?? null,
        last_lng: data.last_lng ?? null,
        last_accuracy_m: data.last_accuracy_m ?? null,
        user_agent: data.user_agent ?? null,
      } as any, { onConflict: 'user_id' } as any)
      if (upErr) throw new Error(upErr.message)
    }

    const { error: logErr } = await supabase.from('web4_audit_log').insert({
      user_id: userId,
      outcome: data.outcome,
      mic_state: data.mic_state ?? (data.mic_granted ? 'granted' : 'denied'),
      geo_state: data.geo_state ?? (data.geo_granted ? 'granted' : 'denied'),
      reality_dim: data.reality_dim,
      broadcast_agents: data.broadcast_agents,
      error_message: data.error_message ?? null,
      user_agent: data.user_agent ?? null,
    } as any)
    if (logErr) throw new Error(logErr.message)

    return { ok: true, activated }
  })

/** جلب حالة تفعيل Web4 للمستخدم الحالي. */
export const getWeb4Activation = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context
    const { data } = await supabase
      .from('web4_activations')
      .select('activated,mic_granted,geo_granted,reality_dim,last_lat,last_lng,last_accuracy_m,updated_at')
      .eq('user_id', userId)
      .maybeSingle()
    return data ?? null
  })

/** تحقق آلي من صحّة الأذونات على مستوى السيرفر بعد التفعيل. */
export const verifyWeb4Activation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    mic_state: PermState,
    geo_state: PermState,
    broadcast_ok: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { data: row } = await supabase
      .from('web4_activations')
      .select('activated,mic_granted,geo_granted,updated_at')
      .eq('user_id', userId)
      .maybeSingle()

    const serverOk = !!row?.activated && !!row?.mic_granted && !!row?.geo_granted
    const clientOk = data.mic_state === 'granted' && data.geo_state === 'granted'
    const verified = serverOk && clientOk && data.broadcast_ok

    await supabase.from('web4_audit_log').insert({
      user_id: userId,
      outcome: verified ? 'verified' : 'partial',
      mic_state: data.mic_state,
      geo_state: data.geo_state,
      broadcast_agents: data.broadcast_ok,
    } as any)

    return {
      verified,
      server: { activated: !!row?.activated, mic: !!row?.mic_granted, geo: !!row?.geo_granted, updated_at: row?.updated_at ?? null },
      client: { mic: data.mic_state, geo: data.geo_state, broadcast: data.broadcast_ok },
    }
  })

/** لوحة إدارية: جميع تفعيلات Web4 مع فلترة العضو والمدة. */
export const adminListWeb4Activations = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    userQuery: z.string().max(200).optional().nullable(),
    days: z.number().int().min(1).max(365).default(30),
    limit: z.number().int().min(1).max(500).default(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' as any })
    if (!isAdmin) throw new Error('Forbidden')

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString()

    let q = supabaseAdmin
      .from('web4_activations')
      .select('user_id,activated,mic_granted,geo_granted,reality_dim,last_lat,last_lng,updated_at,user_agent')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(data.limit)

    const rows = (await q).data ?? []

    // Enrich with profile display data + last audit outcome (agent-broadcast flag).
    const ids = rows.map((r: any) => r.user_id).filter(Boolean)
    const [{ data: profiles }, { data: lastAudits }] = await Promise.all([
      ids.length
        ? supabaseAdmin.from('profiles').select('id,full_name,email').in('id', ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabaseAdmin
            .from('web4_audit_log')
            .select('user_id,outcome,broadcast_agents,created_at')
            .in('user_id', ids)
            .order('created_at', { ascending: false })
            .limit(500)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))
    const aMap = new Map<string, any>()
    for (const a of lastAudits ?? []) if (!aMap.has(a.user_id)) aMap.set(a.user_id, a)

    const enriched = rows.map((r: any) => {
      const p = pMap.get(r.user_id) as any
      const a = aMap.get(r.user_id) as any
      return {
        ...r,
        full_name: p?.full_name ?? null,
        email: p?.email ?? null,
        last_outcome: a?.outcome ?? null,
        broadcast_agents: a?.broadcast_agents ?? false,
      }
    })

    const query = (data.userQuery ?? '').trim().toLowerCase()
    const filtered = query
      ? enriched.filter((r) => (r.full_name ?? '').toLowerCase().includes(query) || (r.email ?? '').toLowerCase().includes(query) || String(r.user_id).includes(query))
      : enriched

    return { rows: filtered }
  })

/** لوحة إدارية: سجل تدقيق Web4. */
export const adminListWeb4Audit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    userId: z.string().uuid().optional().nullable(),
    days: z.number().int().min(1).max(365).default(7),
    limit: z.number().int().min(1).max(1000).default(200),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' as any })
    if (!isAdmin) throw new Error('Forbidden')

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString()
    let q = supabaseAdmin
      .from('web4_audit_log')
      .select('id,user_id,outcome,mic_state,geo_state,broadcast_agents,error_message,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(data.limit)
    if (data.userId) q = q.eq('user_id', data.userId)
    const { data: rows } = await q
    return { rows: rows ?? [] }
  })
