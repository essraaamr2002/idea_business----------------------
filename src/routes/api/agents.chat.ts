import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { AGENTS, type AgentId } from "@/lib/agents-team";
import { createClient } from "@supabase/supabase-js";

type ChatBody = { messages?: unknown; agent?: unknown };

export const Route = createFileRoute("/api/agents/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: require valid Supabase JWT
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claimsData, error: claimsErr } = await sb.auth.getClaims(token);
        const userId = claimsData?.claims?.sub;
        if (claimsErr || !userId) return new Response("Unauthorized", { status: 401 });

        // Only admins may use the agents team (avoid LLM cost abuse from members)
        const { data: isAdmin } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
        if (!isAdmin) return new Response("Forbidden", { status: 403 });

        let body: ChatBody;
        try { body = (await request.json()) as ChatBody; }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        const messages = body.messages;
        const agentId = (body.agent as AgentId) || "commander";
        if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });
        const agent = AGENTS[agentId];
        if (!agent) return new Response("Unknown agent", { status: 400 });

        const key = process.env.GEMINI_API_KEY;
        if (!key) return new Response("خدمة المساعد الذكي غير مفعّلة حاليًا. يرجى التواصل مع إدارة المنصة.", { status: 503 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: agent.systemPrompt,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
