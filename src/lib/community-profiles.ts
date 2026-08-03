import { supabase } from "@/integrations/supabase/client";
import { reportClientEvent } from "@/lib/client-telemetry";

export type PublicProfile = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  alias_name?: string | null;
  use_alias_default?: boolean | null;
  avatar_url?: string | null;
  verified_green?: boolean | null;
  verified_blue?: boolean | null;
  nationality?: string | null;
  country?: string | null;
  bio?: string | null;
  business_bio?: string | null;
  legal_full_name?: string | null;
  reputation_score?: number | null;
};

const FALLBACK_NAME = "مستخدم";

export function makeProfileStub(id: string | null | undefined): PublicProfile {
  return {
    id: id ?? "unknown",
    display_name: FALLBACK_NAME,
    avatar_url: null,
    verified_green: false,
  };
}

export async function fetchPublicProfiles(
  ids: Array<string | null | undefined>,
  surface: string = "community",
): Promise<Map<string, PublicProfile>> {
  const clean = Array.from(new Set(ids.filter(Boolean))) as string[];
  if (!clean.length) return new Map();
  try {
    const { data, error } = await supabase.rpc("get_public_profiles", { _ids: clean });
    if (error) {
      console.error("[fetchPublicProfiles] rpc error", error);
      reportClientEvent({
        source: "community-profiles-rpc",
        action: "rpc_error",
        ok: false,
        error: error.message,
        context: { surface, requested: clean.length, code: (error as any).code },
      });
      return new Map();
    }
    const map = new Map<string, PublicProfile>(
      (data ?? []).map((p: any) => [p.id as string, p as PublicProfile]),
    );
    const missing = clean.length - map.size;
    if (missing > 0 && missing / clean.length >= 0.5) {
      reportClientEvent({
        source: "community-profiles-rpc",
        action: "partial_empty",
        ok: false,
        error: `missing ${missing}/${clean.length} profiles`,
        context: { surface, requested: clean.length, returned: map.size },
      });
    }
    return map;
  } catch (e: any) {
    console.error("[fetchPublicProfiles] threw", e);
    reportClientEvent({
      source: "community-profiles-rpc",
      action: "exception",
      ok: false,
      error: String(e?.message ?? e),
      context: { surface, requested: clean.length },
    });
    return new Map();
  }
}

export async function attachPublicProfiles<T extends Record<string, any>>(
  rows: T[],
  idKey: string,
  outKey: string = "profiles",
  surface: string = "community",
): Promise<T[]> {
  if (!rows.length) return rows;
  const map = await fetchPublicProfiles(
    rows.map((r) => r[idKey]),
    surface,
  );
  return rows.map((r) => ({
    ...r,
    [outKey]: map.get(r[idKey]) ?? makeProfileStub(r[idKey]),
  }));
}
