import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/notifications/send")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      POST: async ({ request }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const body = await request.json().catch(() => ({}));
        const { target, user_id, title, message, channel } = body || {};
        if (!title || !message) {
          return adminJson({ error: "title and message are required" }, 400);
        }

        let recipients: string[] = [];
        if (target === "user" && user_id) {
          recipients = [user_id];
        } else {
          let q = ctx.admin.from("profiles").select("id");
          if (target === "investors") q = q.eq("role_hint", "investor");
          else if (target === "idea_owners")
            q = q.eq("role_hint", "idea_owner");
          const { data } = await q.limit(10000);
          recipients = (data || []).map((r: any) => r.id);
        }

        const rows = recipients.map((uid) => ({
          user_id: uid,
          title,
          message,
          channel: channel || "push",
          created_by: ctx.userId,
        }));
        if (rows.length === 0) {
          return adminJson({ ok: true, sent: 0 });
        }
        const { error } = await ctx.admin.from("notifications").insert(rows);
        if (error) return adminJson({ error: error.message }, 500);
        await ctx.audit("send_notification", "notifications", null, {
          target,
          channel,
          count: rows.length,
          title,
        });
        return adminJson({ ok: true, sent: rows.length });
      },
    },
  },
});
