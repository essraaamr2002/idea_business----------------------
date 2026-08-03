import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/rss")({
  server: {
    handlers: {
      GET: async () => {
        const site = "https://busniss.org";
        const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>IDEA BUSINESS</title>
    <link>${site}</link>
    <description>أحدث الأخبار والفرص الاستثمارية من IDEA BUSINESS.</description>
    <language>ar</language>
    <item>
      <title>تابع كل جديد عبر قسم الأخبار</title>
      <link>${site}/news</link>
      <description>الأخبار، التحليلات، والإعلانات الرسمية.</description>
    </item>
  </channel>
</rss>`;
        return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
      },
    },
  },
});
