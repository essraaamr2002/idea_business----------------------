import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const JOURNEY_STAGES = ["discover", "create", "attract", "operate", "grow"] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

const StageSchema = z.enum(JOURNEY_STAGES);

/** Load the current user's saved journey progress (auto-detected stage + manually marked stages). */
export const getMyJourney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_journey")
      .select("auto_stage, marked_stages, last_detected_at, metadata, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error && error.code !== "PGRST116") throw error;
    return {
      auto_stage: (data?.auto_stage as JourneyStage | null) ?? null,
      marked_stages: (data?.marked_stages as string[] | null) ?? [],
      last_detected_at: data?.last_detected_at ?? null,
      metadata: (data?.metadata as Record<string, any> | null) ?? ({} as Record<string, any>),
      updated_at: data?.updated_at ?? null,
    };
  });

/** Persist auto-detected stage and/or user-marked stages. Upsert by user_id. */
export const saveMyJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        auto_stage: StageSchema.nullable().optional(),
        marked_stages: z.array(StageSchema).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = { user_id: userId };
    if (data.auto_stage !== undefined) {
      patch.auto_stage = data.auto_stage;
      patch.last_detected_at = new Date().toISOString();
    }
    if (data.marked_stages !== undefined) {
      // De-dupe defensively.
      patch.marked_stages = Array.from(new Set(data.marked_stages));
    }
    if (data.metadata !== undefined) patch.metadata = data.metadata;

    const { error } = await (supabase.from("user_journey") as any).upsert(patch, {
      onConflict: "user_id",
    });
    if (error) throw error;
    return { ok: true };
  });
