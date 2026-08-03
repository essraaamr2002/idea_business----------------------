import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { ADMIN_AGENTS, type AdminAgentId, type AdminToolName } from "@/lib/admin-agents";
import type { Database } from "@/integrations/supabase/types";

type ChatBody = { messages?: unknown; agent?: unknown };

export const Route = createFileRoute("/api/admin/agents/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatBody;
        try { body = (await request.json()) as ChatBody; }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        const messages = body.messages;
        const agentId = (body.agent as AdminAgentId) || "commander";
        const agent = ADMIN_AGENTS[agentId] ?? ADMIN_AGENTS.commander;
        if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });

        const key = process.env.GEMINI_API_KEY;
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return new Response("Missing Supabase env", { status: 500 });

        // ===== Verify caller is admin =====
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const userClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
        if (claimsErr || !claimsData?.claims?.sub) return new Response("Unauthorized", { status: 401 });
        const adminId = claimsData.claims.sub as string;

        const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: adminId, _role: "admin" as never });
        if (!isAdmin) return new Response("Forbidden — admin only", { status: 403 });

        // ===== Load privileged admin client (service role, bypasses RLS) =====
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const tableArg = z.string().min(1).max(80).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "اسم جدول غير صالح");

        const logAudit = async (action: string, details: unknown) => {
          try {
            await (supabaseAdmin as any).from("admin_audit_log").insert({
              actor_id: adminId, action: `agent:${agent.id}:${action}`, details,
            });
            // Mirror into unified agents_runs (admin scope, unlimited)
            await (supabaseAdmin as any).from("agents_runs").insert({
              user_id: adminId, agent_id: agent.id, agent_scope: "admin",
              tool_name: action, input: details as any, success: true,
            });
          } catch { /* non-fatal */ }
        };


        // ===== Admin tools =====
        const ALL_TOOLS = {
          list_tables: tool({
            description: "اعرض قائمة جداول schema=public.",
            inputSchema: z.object({}),
            execute: async () => {
              const { data, error } = await (supabaseAdmin as any).rpc("pg_tables_public");
              if (error) {
                // fallback via information_schema if RPC doesn't exist
                const { data: rows, error: e2 } = await (supabaseAdmin as any)
                  .from("information_schema.tables" as never).select("table_name").eq("table_schema","public");
                if (e2) return { error: e2.message };
                return { tables: rows };
              }
              return { tables: data };
            },
          }),
          describe_table: tool({
            description: "اعرض أعمدة جدول في schema=public.",
            inputSchema: z.object({ table: tableArg }),
            execute: async ({ table }) => {
              const { data, error } = await (supabaseAdmin as any).from(table).select("*").limit(1);
              if (error) return { error: error.message };
              const columns = data && data[0] ? Object.keys(data[0]) : [];
              return { table, columns, sample: data?.[0] ?? null };
            },
          }),
          query_table: tool({
            description: "اقرأ صفوفاً من جدول مع تصفية اختيارية: select=أعمدة مفصولة بفاصلة، filters=قائمة شروط مساواة، limit≤500.",
            inputSchema: z.object({
              table: tableArg,
              select: z.string().max(500).default("*"),
              filters: z.array(z.object({ column: z.string(), op: z.enum(["eq","neq","gt","gte","lt","lte","like","ilike","is"]).default("eq"), value: z.any() })).default([]),
              order: z.object({ column: z.string(), ascending: z.boolean().default(false) }).optional(),
              limit: z.number().int().min(1).max(500).default(50),
            }),
            execute: async ({ table, select, filters, order, limit }) => {
              let q: any = (supabaseAdmin as any).from(table).select(select).limit(limit);
              for (const f of filters) q = q[f.op](f.column, f.value);
              if (order) q = q.order(order.column, { ascending: order.ascending });
              const { data, error, count } = await q;
              if (error) return { error: error.message };
              return { rows: data, count: count ?? data?.length ?? 0 };
            },
          }),
          count_rows: tool({
            description: "عدّ الصفوف في جدول مع شروط اختيارية.",
            inputSchema: z.object({
              table: tableArg,
              filters: z.array(z.object({ column: z.string(), op: z.enum(["eq","neq","gt","gte","lt","lte"]).default("eq"), value: z.any() })).default([]),
            }),
            execute: async ({ table, filters }) => {
              let q: any = (supabaseAdmin as any).from(table).select("*", { count: "exact", head: true });
              for (const f of filters) q = q[f.op](f.column, f.value);
              const { count, error } = await q;
              if (error) return { error: error.message };
              return { table, count };
            },
          }),
          insert_row: tool({
            description: "أدخل صفاً واحداً في جدول. يستخدم لإضافة بيانات جديدة لقاعدة البيانات.",
            inputSchema: z.object({ table: tableArg, values: z.record(z.string(), z.any()) }),
            execute: async ({ table, values }) => {
              const { data, error } = await (supabaseAdmin as any).from(table).insert(values).select();
              if (error) return { ok: false, error: error.message };
              await logAudit("insert_row", { table, values });
              return { ok: true, inserted: data };
            },
          }),
          update_rows: tool({
            description: "حدّث صفوفاً وفق شروط مساواة (where). إلزامياً يجب تمرير شرط واحد على الأقل.",
            inputSchema: z.object({
              table: tableArg,
              where: z.array(z.object({ column: z.string(), value: z.any() })).min(1),
              values: z.record(z.string(), z.any()),
            }),
            execute: async ({ table, where, values }) => {
              let q: any = (supabaseAdmin as any).from(table).update(values);
              for (const w of where) q = q.eq(w.column, w.value);
              const { data, error } = await q.select();
              if (error) return { ok: false, error: error.message };
              await logAudit("update_rows", { table, where, values, affected: data?.length ?? 0 });
              return { ok: true, affected: data?.length ?? 0, rows: data };
            },
          }),
          delete_rows: tool({
            description: "احذف صفوفاً وفق شروط مساواة (where). إلزامياً شرط واحد على الأقل لمنع الحذف الشامل بالخطأ.",
            inputSchema: z.object({
              table: tableArg,
              where: z.array(z.object({ column: z.string(), value: z.any() })).min(1),
            }),
            execute: async ({ table, where }) => {
              let q: any = (supabaseAdmin as any).from(table).delete();
              for (const w of where) q = q.eq(w.column, w.value);
              const { data, error } = await q.select();
              if (error) return { ok: false, error: error.message };
              await logAudit("delete_rows", { table, where, affected: data?.length ?? 0 });
              return { ok: true, affected: data?.length ?? 0 };
            },
          }),

          // ===== High-level operations =====
          list_users: tool({
            description: "قائمة الأعضاء مع البريد والدور والحالة.",
            inputSchema: z.object({ search: z.string().optional(), limit: z.number().int().min(1).max(200).default(50) }),
            execute: async ({ search, limit }) => {
              let q: any = (supabaseAdmin as any).from("profiles")
                .select("id, display_name, username, country, membership, kyc_status, created_at").limit(limit);
              if (search) q = q.ilike("display_name", `%${search}%`);
              const { data, error } = await q;
              if (error) return { error: error.message };
              return { users: data };
            },
          }),
          set_user_role: tool({
            description: "امنح دور (admin/seo/moderator/user) لعضو.",
            inputSchema: z.object({ user_id: z.string().uuid(), role: z.enum(["admin","seo","moderator","user"]) }),
            execute: async ({ user_id, role }) => {
              const { error } = await (supabaseAdmin as any).from("user_roles").insert({ user_id, role });
              if (error) return { ok: false, error: error.message };
              await logAudit("set_user_role", { user_id, role });
              return { ok: true };
            },
          }),
          remove_user_role: tool({
            description: "ألغِ دوراً عن عضو.",
            inputSchema: z.object({ user_id: z.string().uuid(), role: z.enum(["admin","seo","moderator","user"]) }),
            execute: async ({ user_id, role }) => {
              const { error } = await (supabaseAdmin as any).from("user_roles").delete().eq("user_id", user_id).eq("role", role);
              if (error) return { ok: false, error: error.message };
              await logAudit("remove_user_role", { user_id, role });
              return { ok: true };
            },
          }),
          suspend_user: tool({
            description: "علّق حساب عضو.",
            inputSchema: z.object({ user_id: z.string().uuid(), reason: z.string().max(500).optional() }),
            execute: async ({ user_id, reason }) => {
              const { error } = await (supabaseAdmin as any).from("profiles")
                .update({ status: "suspended" }).eq("id", user_id);
              if (error) return { ok: false, error: error.message };
              await logAudit("suspend_user", { user_id, reason });
              return { ok: true };
            },
          }),
          activate_user: tool({
            description: "فعّل حساب عضو معلّق.",
            inputSchema: z.object({ user_id: z.string().uuid() }),
            execute: async ({ user_id }) => {
              const { error } = await (supabaseAdmin as any).from("profiles")
                .update({ status: "active" }).eq("id", user_id);
              if (error) return { ok: false, error: error.message };
              await logAudit("activate_user", { user_id });
              return { ok: true };
            },
          }),
          freeze_wallet: tool({
            description: "جمّد محفظة عضو (يمنع الإيداع/السحب/التحويل).",
            inputSchema: z.object({ user_id: z.string().uuid(), reason: z.string().max(500).optional() }),
            execute: async ({ user_id, reason }) => {
              const { error } = await (supabaseAdmin as any).from("wallets")
                .update({ frozen: true, frozen_reason: reason ?? null }).eq("user_id", user_id);
              if (error) return { ok: false, error: error.message };
              await logAudit("freeze_wallet", { user_id, reason });
              return { ok: true };
            },
          }),
          adjust_wallet: tool({
            description: "عدّل رصيد محفظة عضو يدوياً (موجب إضافة، سالب خصم). يتطلب سبباً.",
            inputSchema: z.object({ user_id: z.string().uuid(), amount: z.number(), reason: z.string().min(3).max(500) }),
            execute: async ({ user_id, amount, reason }) => {
              const { data: w, error: e1 } = await (supabaseAdmin as any).from("wallets")
                .select("balance").eq("user_id", user_id).maybeSingle();
              if (e1) return { ok: false, error: e1.message };
              const newBal = Number(w?.balance ?? 0) + amount;
              const { error: e2 } = await (supabaseAdmin as any).from("wallets")
                .update({ balance: newBal }).eq("user_id", user_id);
              if (e2) return { ok: false, error: e2.message };
              try {
                await (supabaseAdmin as any).from("ledger").insert({
                  user_id, amount, type: amount >= 0 ? "credit" : "debit",
                  description: `admin-agent:${agent.id} — ${reason}`,
                });
              } catch { /* ledger may have different schema */ }
              await logAudit("adjust_wallet", { user_id, amount, reason, new_balance: newBal });
              return { ok: true, new_balance: newBal };
            },
          }),
          approve_kyc: tool({
            description: "اعتمد طلب توثيق هوية عضو.",
            inputSchema: z.object({ user_id: z.string().uuid() }),
            execute: async ({ user_id }) => {
              const { error } = await (supabaseAdmin as any).from("profiles")
                .update({ kyc_status: "verified" }).eq("id", user_id);
              if (error) return { ok: false, error: error.message };
              await logAudit("approve_kyc", { user_id });
              return { ok: true };
            },
          }),
          reject_kyc: tool({
            description: "ارفض طلب توثيق هوية عضو مع سبب.",
            inputSchema: z.object({ user_id: z.string().uuid(), reason: z.string().min(3).max(500) }),
            execute: async ({ user_id, reason }) => {
              const { error } = await (supabaseAdmin as any).from("profiles")
                .update({ kyc_status: "rejected" }).eq("id", user_id);
              if (error) return { ok: false, error: error.message };
              await logAudit("reject_kyc", { user_id, reason });
              return { ok: true };
            },
          }),
          approve_project: tool({
            description: "اعتمد نشر مشروع.",
            inputSchema: z.object({ project_id: z.string().uuid() }),
            execute: async ({ project_id }) => {
              const { error } = await (supabaseAdmin as any).from("projects")
                .update({ status: "published" }).eq("id", project_id);
              if (error) return { ok: false, error: error.message };
              await logAudit("approve_project", { project_id });
              return { ok: true };
            },
          }),
          reject_project: tool({
            description: "ارفض نشر مشروع مع سبب.",
            inputSchema: z.object({ project_id: z.string().uuid(), reason: z.string().min(3).max(500) }),
            execute: async ({ project_id, reason }) => {
              const { error } = await (supabaseAdmin as any).from("projects")
                .update({ status: "rejected", rejection_reason: reason }).eq("id", project_id);
              if (error) return { ok: false, error: error.message };
              await logAudit("reject_project", { project_id, reason });
              return { ok: true };
            },
          }),
          platform_stats: tool({
            description: "إحصاءات سريعة عن المنصة (المستخدمون، المشاريع، المحافظ، KYC، الطلبات).",
            inputSchema: z.object({}),
            execute: async () => {
              const counts: Record<string, number | string> = {};
              for (const t of ["profiles","projects","wallets","kyc_verifications","product_orders","payout_requests","deposit_requests","support_tickets"]) {
                const { count, error } = await (supabaseAdmin as any).from(t).select("*", { count: "exact", head: true });
                counts[t] = error ? `err:${error.message}` : (count ?? 0);
              }
              return counts;
            },
          }),
          audit_log: tool({
            description: "آخر إجراءات سجل تدقيق الإدارة.",
            inputSchema: z.object({ limit: z.number().int().min(1).max(200).default(30) }),
            execute: async ({ limit }) => {
              const { data, error } = await (supabaseAdmin as any).from("admin_audit_log")
                .select("*").order("created_at", { ascending: false }).limit(limit);
              if (error) return { error: error.message };
              return { entries: data };
            },
          }),
        } as const;

        const allowed = new Set<AdminToolName>(agent.allowedTools);
        const tools = Object.fromEntries(
          Object.entries(ALL_TOOLS).filter(([n]) => allowed.has(n as AdminToolName))
        );

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: `${agent.systemPrompt}

أنت تعمل داخل لوحة إدارة منصة "IDEA BUSINESS" بصلاحيات الإدارة الكاملة (service role، يتجاوز RLS).
- معرّف المدير الحالي: ${adminId}
- النطاق: مساعد إداري — منفصل تماماً عن مساعد الأعضاء، ولا تتعامل مع أوامر العضو هنا.
- كل عملية إنشاء/تعديل/حذف تُسجَّل في admin_audit_log تلقائياً.
- لا تُلامس schemas: auth, storage, realtime, vault, supabase_functions.
- عند الشك في طلب واسع التأثير، اطلب تأكيداً صريحاً قبل التنفيذ.`,
          messages: await convertToModelMessages(messages as UIMessage[]),
          tools,
          stopWhen: stepCountIs(40),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
