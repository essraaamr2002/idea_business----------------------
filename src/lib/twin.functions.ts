import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StrategySchema = z.object({ strategy: z.enum(["conservative", "balanced", "aggressive"]) });

export const initOrGetTwin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: existing } = await context.supabase
      .from("digital_twins").select("*").eq("user_id", context.userId).maybeSingle();
    if (existing) return existing;
    const { data: created, error } = await context.supabase
      .from("digital_twins")
      .insert({ user_id: context.userId, strategy: "balanced" })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return created;
  });

export const setTwinStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => StrategySchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("digital_twins")
      .update({ strategy: data.strategy, updated_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .select("*").maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// Simulate weekly performance based on strategy (deterministic seed by day)
export const rebalanceTwin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: t } = await context.supabase
      .from("digital_twins").select("*").eq("user_id", context.userId).maybeSingle();
    if (!t) throw new Error("no_twin");
    const params: Record<string, { mu: number; sigma: number }> = {
      conservative: { mu: 0.006, sigma: 0.015 },
      balanced:     { mu: 0.012, sigma: 0.035 },
      aggressive:   { mu: 0.02,  sigma: 0.07 },
    };
    const p = params[t.strategy] ?? params.balanced;
    const shock = p.mu + p.sigma * (Math.random() * 2 - 1);
    const newBal = Number(t.virtual_balance) * (1 + shock);
    const perf = Number(t.performance_pct) + shock * 100;
    const lessons = [
      "توأمك احتفظ بالسيولة لفرصة قادمة.",
      "خفّض توأمك مركزاً خاسراً مبكراً — درس في وقف الخسارة.",
      "ضاعف توأمك مركزاً على مشروع بإشارة undervalued.",
      "امتنع توأمك عن التداول اليوم بسبب ضعف السيولة.",
      "التنويع أنقذ توأمك من موجة هبوط في قطاع واحد.",
    ];
    const lesson = lessons[Math.floor(Math.random() * lessons.length)];
    const { data: updated, error } = await context.supabase
      .from("digital_twins")
      .update({
        virtual_balance: Math.round(newBal * 100) / 100,
        performance_pct: Math.round(perf * 10000) / 10000,
        last_lesson: lesson,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", context.userId).select("*").maybeSingle();
    if (error) throw new Error(error.message);
    return updated;
  });
