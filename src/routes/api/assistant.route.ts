import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { routeAgent, AGENTS, type AgentId } from "@/lib/agents-team";

const Body = z.object({ text: z.string().min(1).max(4000) });

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let json: unknown;
        try { json = await request.json(); } catch { return new Response("bad json", { status: 400 }); }
        const parsed = Body.safeParse(json);
        if (!parsed.success) return new Response("bad input", { status: 400 });
        const id: AgentId = routeAgent(parsed.data.text);
        const a = AGENTS[id];
        return Response.json({ agent: id, name: a.name, emoji: a.emoji, role: a.role });
      },
    },
  },
});
