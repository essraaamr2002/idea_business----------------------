import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const InputSchema = z.object({ transcript: z.string().min(3).max(500) });

export const parseVoiceCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => InputSchema.parse(i))
  .handler(async ({ data, context }) => {
    const gw = createLovableAiGatewayProvider();
    let parsed: any = null;
    try {
      const { text } = await generateText({
        model: gw("google/gemini-3-flash-preview"),
        prompt:
          `حلّل الأمر الصوتي التالي وأخرج JSON خالص فقط (بدون شرح) بالشكل:\n` +
          `{"action":"buy|sell|bid|watch","query":"نص المشروع","quantity":عدد أو null,"price":عدد أو null}\n` +
          `الأمر: "${data.transcript}"`,
      });
      const m = text.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    } catch { /* ignore */ }

    const { data: row } = await context.supabase
      .from("voice_commands_log")
      .insert({
        user_id: context.userId,
        transcript: data.transcript,
        parsed,
        status: parsed ? "confirmed" : "error",
      })
      .select("id, parsed, status")
      .maybeSingle();
    return row;
  });

export const listMyVoiceCommands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("voice_commands_log")
      .select("id, transcript, parsed, status, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    return data ?? [];
  });
