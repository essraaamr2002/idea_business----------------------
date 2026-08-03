import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/articles")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      POST: async ({ request }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const body = await request.json().catch(() => ({}));
        const { title, content, category, tags, meta_description } = body || {};
        if (!title || !content) {
          return adminJson({ error: "title and content are required" }, 400);
        }
        const slug = String(title)
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80);
        const { data, error } = await ctx.admin
          .from("articles")
          .insert({
            title,
            slug: `${slug}-${Date.now().toString(36)}`,
            content,
            category: category || null,
            tags: tags || [],
            meta_description: meta_description || null,
            status: "published",
            published_at: new Date().toISOString(),
            author_id: ctx.userId,
          })
          .select("id, slug")
          .maybeSingle();
        if (error) return adminJson({ error: error.message }, 500);
        await ctx.audit("publish_article", "articles", data?.id ?? null, {
          title,
        });
        return adminJson({ ok: true, article: data });
      },
    },
  },
});
