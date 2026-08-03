import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")];
    }),
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function check(name, query) {
  const startedAt = Date.now();
  const { data, count, error } = await query;
  const ms = Date.now() - startedAt;
  if (error) {
    console.log(`${name}: ERROR (${ms}ms) ${error.message}`);
    return false;
  }
  const sample = Array.isArray(data) ? data.slice(0, 1) : data;
  console.log(`${name}: OK (${ms}ms) count=${count ?? "n/a"} sample=${JSON.stringify(sample)}`);
  return true;
}

const results = await Promise.all([
  check("profiles", supabase.from("profiles").select("id", { head: true, count: "exact" }).limit(1)),
  check("projects.active", supabase.from("projects").select("id", { head: true, count: "exact" }).eq("status", "active")),
  check(
    "share_orders_v2.open",
    supabase.from("share_orders_v2").select("id", { head: true, count: "exact" }).in("status", ["pending", "partial"]),
  ),
  check("articles.published", supabase.from("articles").select("id, slug, title").eq("published", true).limit(4)),
  check("rpc.list_featured_projects", supabase.rpc("list_featured_projects", { _limit: 6 })),
]);

if (results.some((ok) => !ok)) process.exit(1);
