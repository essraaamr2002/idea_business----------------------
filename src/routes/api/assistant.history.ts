import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/assistant/history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const url = new URL(request.url);
        const agentId = url.searchParams.get("agent") || "commander";

        const supabase = createClient<Database>(SUPABASE_URL, KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claims } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub as string | undefined;
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const { data, error } = await supabase
          .from("assistant_messages")
          .select("id, role, content, parts, created_at")
          .eq("user_id", userId)
          .eq("agent_id", agentId)
          .order("created_at", { ascending: true })
          .limit(200);
        if (error) return new Response(error.message, { status: 500 });

        const messages = (data ?? []).map((row: any) => ({
          id: row.id,
          role: row.role,
          parts: Array.isArray(row.parts) && row.parts.length
            ? row.parts
            : [{ type: "text", text: row.content ?? "" }],
        }));
        return Response.json({ messages });
      },
      DELETE: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });
        const url = new URL(request.url);
        const agentId = url.searchParams.get("agent") || "commander";
        const supabase = createClient<Database>(SUPABASE_URL, KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claims } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub as string | undefined;
        if (!userId) return new Response("Unauthorized", { status: 401 });
        const { error } = await supabase.from("assistant_messages")
          .delete().eq("user_id", userId).eq("agent_id", agentId);
        if (error) return new Response(error.message, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
