// Fire-and-forget submission of URLs to search engines.
// Called from server-only paths after publishing an article.
const BASE_URL = "https://busniss.org";

export async function pingSearchEngines(urls: string[]): Promise<void> {
  if (!urls.length) return;
  const jobs: Promise<any>[] = [];

  // 1) IndexNow (Bing / Yandex / Seznam) — free & instant
  const key = process.env.INDEXNOW_KEY;
  if (key) {
    jobs.push(
      fetch("https://api.indexnow.org/IndexNow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: "busniss.org",
          key,
          keyLocation: `${BASE_URL}/api/public/indexnow/${key}.txt`,
          urlList: urls,
        }),
      }).catch(() => null),
    );
  }

  // 2) Google Indexing API (optional token)
  const gToken = process.env.GOOGLE_INDEXING_TOKEN;
  if (gToken) {
    for (const url of urls) {
      jobs.push(
        fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
          method: "POST",
          headers: { Authorization: `Bearer ${gToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url, type: "URL_UPDATED" }),
        }).catch(() => null),
      );
    }
  }

  // 3) Sitemap pings (Google + Bing)
  const sitemap = encodeURIComponent(`${BASE_URL}/sitemap.xml`);
  jobs.push(fetch(`https://www.google.com/ping?sitemap=${sitemap}`).catch(() => null));
  jobs.push(fetch(`https://www.bing.com/ping?sitemap=${sitemap}`).catch(() => null));

  await Promise.allSettled(jobs);
}
