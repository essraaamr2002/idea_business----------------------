import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { AGENTS, type AgentId, type ToolName } from "@/lib/agents-team";
import { PLATFORM_KNOWLEDGE, MEMBER_SCOPE_NOTE } from "@/lib/platform-knowledge";
import type { Database } from "@/integrations/supabase/types";

type ChatBody = { messages?: unknown; agent?: unknown };

const SAFE_FALLBACK_TOOLS = [
  "get_my_profile",
  "list_my_projects",
  "platform_link",
  "start_kyc",
] as const;

export const Route = createFileRoute("/api/assistant/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatBody;
        try { body = (await request.json()) as ChatBody; }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        const messages = body.messages;
        const agentId = (body.agent as AgentId) || "commander";
        const agent = AGENTS[agentId] ?? AGENTS.commander;
        if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });

        const key = process.env.GEMINI_API_KEY;
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!key) return new Response("خدمة المساعد الذكي غير مفعّلة حاليًا. يرجى التواصل مع إدارة المنصة.", { status: 503 });
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return new Response("Missing Supabase env", { status: 500 });

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claimsData?.claims?.sub) return new Response("Unauthorized", { status: 401 });
        const userId = claimsData.claims.sub as string;

        // Load membership + per-tier tool whitelist
        const { data: profile } = await supabase
          .from("profiles").select("membership").eq("id", userId).maybeSingle();
        const membership = (profile?.membership ?? "basic") as string;

        const { data: storedPermRow, error: permissionsError } = await supabase
          .from("agents_membership_permissions")
          .select("allowed_tools, daily_quota, enabled")
          .eq("membership", membership as any)
          .eq("agent_id", agentId)
          .maybeSingle();

        // Some existing deployments predate the agent-permissions migration.
        // Keep chat usable with a conservative read-only policy only when the
        // relation itself is missing; never override an explicit disabled row.
        const permissionsTableMissing =
          permissionsError?.code === "PGRST205" || permissionsError?.code === "42P01";
        const permRow = permissionsTableMissing
          ? { allowed_tools: [...SAFE_FALLBACK_TOOLS], daily_quota: 20, enabled: true }
          : storedPermRow;

        if (permissionsError && !permissionsTableMissing) {
          console.error("[assistant/chat] permissions lookup failed", {
            code: permissionsError.code,
            message: permissionsError.message,
            membership,
            agentId,
          });
          return new Response("تعذر التحقق من صلاحيات الوكيل حاليًا", { status: 503 });
        }

        if (!permRow || !permRow.enabled) {
          return new Response("هذا الوكيل غير متاح لعضويتك الحالية", { status: 403 });
        }

        // Daily-quota enforcement
        const { count: usedToday } = await supabase
          .from("agents_runs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId).eq("agent_id", agentId)
          .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
        if ((usedToday ?? 0) >= (permRow.daily_quota ?? 0)) {
          return new Response("تجاوزت الحد اليومي لعضويتك مع هذا الوكيل", { status: 429 });
        }

        // Find or create session for this user+agent
        let sessionId: string | null = null;
        {
          const { data: sess } = await supabase.from("agents_sessions")
            .select("id").eq("user_id", userId).eq("agent_id", agentId)
            .order("updated_at", { ascending: false }).limit(1).maybeSingle();
          if (sess) sessionId = sess.id;
          else {
            const { data: created } = await supabase.from("agents_sessions")
              .insert({ user_id: userId, agent_id: agentId, agent_scope: "member" })
              .select("id").maybeSingle();
            sessionId = created?.id ?? null;
          }
        }

        // Wrap a tool so every invocation is logged
        const wrap = (name: string, def: { description: string; inputSchema: any; execute: (i: any) => Promise<any> }) => {
          const logged = async (input: any) => {
            const t0 = Date.now();
            try {
              const out = await def.execute(input);
              await supabase.from("agents_runs").insert({
                user_id: userId, session_id: sessionId, agent_id: agentId, agent_scope: "member",
                tool_name: name, input: input as any, output: out as any,
                success: true, duration_ms: Date.now() - t0,
                membership_snapshot: membership as any,
              });
              return out;
            } catch (e: any) {
              await supabase.from("agents_runs").insert({
                user_id: userId, session_id: sessionId, agent_id: agentId, agent_scope: "member",
                tool_name: name, input: input as any, success: false,
                error: String(e?.message ?? e), duration_ms: Date.now() - t0,
                membership_snapshot: membership as any,
              });
              throw e;
            }
          };
          return tool({ description: def.description, inputSchema: def.inputSchema, execute: logged } as any);
        };


        // ===== Member-scoped tools (RLS-bound to this user) =====
        const ALL_TOOLS = {
          get_my_profile: wrap("get_my_profile", {
            description: "اقرأ بيانات الملف الشخصي للعضو الحالي.",
            inputSchema: z.object({}),
            execute: async () => {
              const { data, error } = await supabase
                .from("profiles")
                .select("id, display_name, username, bio, business_bio, country, city, occupation, kyc_status, membership, avatar_url")
                .eq("id", userId).maybeSingle();
              if (error) return { error: error.message };
              return data ?? { error: "لا يوجد ملف شخصي بعد" };
            },
          }),
          update_my_profile: wrap("update_my_profile", {
            description: "حدّث حقول الملف الشخصي للعضو الحالي.",
            inputSchema: z.object({
              display_name: z.string().min(2).max(80).optional(),
              bio: z.string().max(600).optional(),
              business_bio: z.string().max(600).optional(),
              country: z.string().max(60).optional(),
              city: z.string().max(60).optional(),
              occupation: z.string().max(120).optional(),
            }),
            execute: async (patch: any) => {
              const cleaned: Record<string, string> = {};
              for (const [k, v] of Object.entries(patch)) {
                if (typeof v === "string" && v.length > 0) cleaned[k] = v;
              }
              if (!Object.keys(cleaned).length) return { ok: false, error: "لا توجد حقول للتحديث" };
              const { error } = await supabase.from("profiles").update(cleaned as never).eq("id", userId);
              if (error) return { ok: false, error: error.message };
              return { ok: true, updated: cleaned };
            },
          }),
          list_my_projects: wrap("list_my_projects", {
            description: "قائمة مشاريع العضو الحالي.",
            inputSchema: z.object({}),
            execute: async () => {
              const { data, error } = await supabase
                .from("projects")
                .select("id, title, status, sector, last_bumped_at, updated_at")
                .eq("owner_id", userId)
                .order("updated_at", { ascending: false }).limit(20);
              if (error) return { error: error.message };
              return { projects: data ?? [] };
            },
          }),
          bump_my_project: wrap("bump_my_project", {
            description: "تحديث ظهور مشروع للعضو (Bump). يُسمح مرة كل 3 أيام.",
            inputSchema: z.object({ project_id: z.string().uuid() }),
            execute: async ({ project_id }: any) => {
              const { data: proj, error: e1 } = await supabase
                .from("projects").select("id, owner_id, last_bumped_at").eq("id", project_id).maybeSingle();
              if (e1) return { ok: false, error: e1.message };
              if (!proj || proj.owner_id !== userId) return { ok: false, error: "هذا المشروع ليس ملكك" };
              const last = proj.last_bumped_at ? new Date(proj.last_bumped_at).getTime() : 0;
              const days = (Date.now() - last) / 86_400_000;
              if (last && days < 3) return { ok: false, error: `يلزم الانتظار ${(3 - days).toFixed(1)} يوم` };
              const { error: e2 } = await supabase.from("projects")
                .update({ last_bumped_at: new Date().toISOString() }).eq("id", project_id);
              if (e2) return { ok: false, error: e2.message };
              return { ok: true, bumped_at: new Date().toISOString() };
            },
          }),
          platform_link: wrap("platform_link", {
            description: "أعد رابطاً داخلياً لصفحة في المنصة لإرشاد العضو.",
            inputSchema: z.object({
              destination: z.enum([
                "wallet", "new_project", "my_projects", "profile",
                "kyc", "auctions", "projects_browse", "support", "settings",
              ]),
            }),
            execute: async ({ destination }: any) => {
              const map: Record<string, { url: string; label: string }> = {
                wallet: { url: "/wallet", label: "محفظتي" },
                new_project: { url: "/projects/new", label: "نشر مشروع جديد" },
                my_projects: { url: "/my-projects", label: "مشاريعي" },
                profile: { url: "/profile", label: "ملفي الشخصي" },
                kyc: { url: "/kyc", label: "توثيق الهوية" },
                auctions: { url: "/community", label: "المزايدات والمناقصات" },
                projects_browse: { url: "/projects", label: "تصفّح المشاريع" },
                support: { url: "/support", label: "الدعم الفني" },
                settings: { url: "/settings", label: "الإعدادات" },
              };
              return map[destination];
            },
          }),
          start_kyc: wrap("start_kyc", {
            description: "أعد حالة توثيق الهوية للعضو ورابط بدء/استكمال التوثيق.",
            inputSchema: z.object({}),
            execute: async () => {
              const { data } = await supabase.from("profiles").select("kyc_status").eq("id", userId).maybeSingle();
              return { kyc_status: data?.kyc_status ?? "unknown", url: "/kyc", label: "ابدأ توثيق الهوية" };
            },
          }),
        } as const;

        // Intersect agent whitelist × membership whitelist — العضو لا يستطيع تجاوز صلاحياته
        const agentAllowed = new Set<string>(agent.allowedTools as readonly string[]);
        const membershipAllowed = new Set<string>(permRow.allowed_tools ?? []);
        const tools = Object.fromEntries(
          Object.entries(ALL_TOOLS).filter(([n]) => agentAllowed.has(n) && membershipAllowed.has(n))
        );


        // Persist the latest user message (RLS-scoped insert as this user).
        try {
          const last = (messages as UIMessage[])[messages.length - 1];
          if (last?.role === "user") {
            const text = last.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("");
            await supabase.from("assistant_messages").insert({
              user_id: userId, agent_id: agentId, role: "user", content: text, parts: last.parts as any,
            });
          }
        } catch { /* non-fatal */ }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: `${agent.systemPrompt}\n\nأنت الوكيل: ${agent.name} (${agent.role}). لا تنفّذ أي طلب خارج صلاحيات هذا العضو، ولا تصل لبيانات أعضاء آخرين.\n\n---\n${PLATFORM_KNOWLEDGE}\n\n${MEMBER_SCOPE_NOTE}\n\nمعرّف العضو الحالي: ${userId}`,
          messages: await convertToModelMessages(messages as UIMessage[]),
          tools,
          stopWhen: stepCountIs(25),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          onFinish: async (args: any) => {
            try {
              const m: any = args?.responseMessage
                ?? (Array.isArray(args?.messages) ? args.messages[args.messages.length - 1] : null);
              if (!m || m.role !== "assistant") return;
              const text = (m.parts ?? []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("");
              await supabase.from("assistant_messages").insert({
                user_id: userId, agent_id: agentId, role: "assistant",
                content: text, parts: (m.parts ?? []) as any,
              });
            } catch { /* non-fatal */ }
          },
        });
      },
    },
  },
});
