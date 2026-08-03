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

// ===== Q&A =====
export const listQuestions = createServerFn({ method: 'GET' })
  .inputValidator((d: { project_id: string }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from('project_questions' as any)
      .select('*')
      .eq('project_id', data.project_id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return rows ?? [];
  });

export const askQuestion = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { project_id: string; question: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from('project_questions' as any)
      .insert({ project_id: data.project_id, asker_id: userId, question: data.question } as any)
      .select().single();
    if (error) throw error;
    return row;
  });

export const answerQuestion = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { question_id: string; answer: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from('project_questions' as any)
      .update({ answer: data.answer, answered_at: new Date().toISOString(), answered_by: userId } as any)
      .eq('id', data.question_id).select().single();
    if (error) throw error;
    return row;
  });

// ===== Reviews =====
export const listReviews = createServerFn({ method: 'GET' })
  .inputValidator((d: { project_id: string }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from('project_reviews' as any)
      .select('*')
      .eq('project_id', data.project_id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return rows ?? [];
  });

export const submitReview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { project_id: string; stars: number; comment?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.stars < 1 || data.stars > 5) throw new Error('invalid_rating');
    const { data: row, error } = await supabase
      .from('project_reviews' as any)
      .upsert({ project_id: data.project_id, reviewer_id: userId, stars: data.stars, comment: data.comment } as any, { onConflict: 'project_id,reviewer_id' })
      .select().single();
    if (error) throw error;
    return row;
  });

// ===== Updates =====
export const listUpdates = createServerFn({ method: 'GET' })
  .inputValidator((d: { project_id: string }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from('project_updates' as any)
      .select('*')
      .eq('project_id', data.project_id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return rows ?? [];
  });

export const postUpdate = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { project_id: string; title: string; body: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from('project_updates' as any)
      .insert({ project_id: data.project_id, author_id: userId, title: data.title, body: data.body } as any)
      .select().single();
    if (error) throw error;
    return row;
  });
