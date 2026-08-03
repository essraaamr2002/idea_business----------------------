import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const saveSchema = z.object({
  tool: z.enum(['oracle', 'time_machine', 'twin', 'voice_trader', 'trust_chain']),
  title: z.string().min(1).max(200),
  summary: z.string().max(2000).optional().nullable(),
  payload: z.record(z.string(), z.any()).default({}),
});

export const saveFutureLabResult = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from('future_lab_history')
      .insert({
        user_id: context.userId,
        tool: data.tool,
        title: data.title,
        summary: data.summary ?? null,
        payload: data.payload,
      })
      .select('id, created_at')
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const listSchema = z.object({
  tool: z.enum(['oracle', 'time_machine', 'twin', 'voice_trader', 'trust_chain']).optional(),
  q: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listFutureLabHistory = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from('future_lab_history')
      .select('id, tool, title, summary, payload, created_at')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(data.limit);
    if (data.tool) q = q.eq('tool', data.tool);
    if (data.q) q = q.ilike('title', `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const deleteFutureLabResult = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('future_lab_history')
      .delete()
      .eq('id', data.id)
      .eq('user_id', context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
