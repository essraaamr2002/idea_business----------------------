import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Box-Muller normal
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const InputSchema = z.object({
  principal: z.number().positive().max(10_000_000),
  monthly_contribution: z.number().min(0).max(1_000_000).default(0),
  years: z.number().int().min(1).max(10),
  expected_return: z.number().min(-0.3).max(0.6).default(0.12), // 12% annual
  volatility: z.number().min(0).max(1).default(0.25), // 25% annual
  leverage: z.number().min(1).max(1.4).default(1),
  simulations: z.number().int().min(500).max(10_000).default(2000),
});

export const runMonteCarlo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => InputSchema.parse(i))
  .handler(async ({ data, context }) => {
    const months = data.years * 12;
    const mu = data.expected_return / 12;
    const sigma = data.volatility / Math.sqrt(12);
    const results: number[] = new Array(data.simulations);
    const percentilePath: number[][] = [];
    const sampleCount = Math.min(30, data.simulations);
    for (let s = 0; s < data.simulations; s++) {
      let v = data.principal * data.leverage;
      const path: number[] = [];
      for (let m = 0; m < months; m++) {
        const shock = mu + sigma * randn();
        v = v * (1 + shock) + data.monthly_contribution;
        if (s < sampleCount) path.push(Math.round(v));
      }
      // subtract leverage cost
      if (data.leverage > 1) v -= data.principal * (data.leverage - 1);
      results[s] = v;
      if (s < sampleCount) percentilePath.push(path);
    }
    results.sort((a, b) => a - b);
    const pct = (p: number) => Math.round(results[Math.floor(p * results.length)]);
    const summary = {
      p10: pct(0.1),
      p50: pct(0.5),
      p90: pct(0.9),
      mean: Math.round(results.reduce((s, x) => s + x, 0) / results.length),
      probability_of_loss: results.filter((x) => x < data.principal).length / results.length,
      inputs: data,
      sample_paths: percentilePath.slice(0, 20),
      months,
    };

    // persist
    const { data: row } = await context.supabase
      .from("sim_runs")
      .insert({ user_id: context.userId, scenario: data, result: summary })
      .select("id")
      .maybeSingle();

    return { id: row?.id, ...summary };
  });

export const listMySimulations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("sim_runs")
      .select("id, scenario, result, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    return data ?? [];
  });
