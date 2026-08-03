// Rewrites Supabase storage URLs to a same-origin proxy so they load even when
// the underlying bucket is private (workspace policy blocks public buckets).
//
// Accepts: a stored avatar/media URL (possibly null/undefined) or a "bucket/path"
// Returns: a same-origin URL served by /api/public/storage/$ or the original/empty.
const PUBLIC_RE = /\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^?]+)/i;

export function resolveStorageUrl(input?: string | null): string {
  if (!input) return "";
  const s = String(input).trim();
  if (!s) return "";
  // data: and blob: pass through
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;
  // Full remote URLs already include the right Supabase public/signed token.
  // Keep them direct so local dev does not depend on a service-role proxy.
  if (/^https?:\/\//i.test(s)) return s;
  // already a proxied URL
  if (s.includes("/api/public/storage/")) return s;
  // Match Supabase storage object paths
  const m = s.match(PUBLIC_RE);
  if (m && m[1]) return `/api/public/storage/${m[1]}`;
  // Pass through external/foreign URLs (e.g. Google avatars)
  return s;
}
