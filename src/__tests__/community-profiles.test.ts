import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
const beaconMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

beforeEach(() => {
  rpcMock.mockReset();
  beaconMock.mockReset();
  // Make reportClientEvent path observable without hitting the network.
  // sendBeacon is preferred when present; vi.stubGlobal makes navigator
  // available in node env.
  vi.stubGlobal("navigator", { sendBeacon: beaconMock });
  vi.stubGlobal("window", {
    location: { href: "http://localhost/community" },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const SAMPLE_IDS = [
  "00000000-0000-0000-0000-000000000001",
  "00000000-0000-0000-0000-000000000002",
];

const SAMPLE_ROWS: Array<{ id: string; user_id: string; content: string; profiles?: any }> = [
  { id: "post-1", user_id: SAMPLE_IDS[0], content: "hi" },
  { id: "post-2", user_id: SAMPLE_IDS[1], content: "there" },
];

describe("community profiles loader (RLS via get_public_profiles)", () => {
  it("returns profile rows keyed by id when RPC succeeds", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        { id: SAMPLE_IDS[0], display_name: "علي", avatar_url: "a.png", verified_green: true },
        { id: SAMPLE_IDS[1], display_name: "سارة", avatar_url: null },
      ],
      error: null,
    });
    const { fetchPublicProfiles } = await import("../lib/community-profiles");
    const map = await fetchPublicProfiles(SAMPLE_IDS, "test");
    expect(map.size).toBe(2);
    expect(map.get(SAMPLE_IDS[0])?.display_name).toBe("علي");
    expect(map.get(SAMPLE_IDS[1])?.avatar_url).toBeNull();
    expect(beaconMock).not.toHaveBeenCalled();
  });

  it("attaches a non-null fallback stub when RPC returns nothing for an id", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const { attachPublicProfiles } = await import("../lib/community-profiles");
    const rows = await attachPublicProfiles(SAMPLE_ROWS, "user_id", "profiles", "feed");
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.profiles).not.toBeNull();
      expect(row.profiles.id).toBeTruthy();
      expect(row.profiles.display_name).toBe("مستخدم");
    }
    // 100% missing → should report a partial_empty telemetry beacon.
    expect(beaconMock).toHaveBeenCalledTimes(1);
    const [url] = beaconMock.mock.calls[0];
    expect(url).toBe("/api/public/client-log");
  });

  it("reports an rpc_error event and still returns fallback stubs on RPC failure", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "permission denied", code: "42501" },
    });
    const { attachPublicProfiles } = await import("../lib/community-profiles");
    const rows = await attachPublicProfiles(SAMPLE_ROWS, "user_id", "profiles", "auctions");
    for (const row of rows) {
      expect(row.profiles).not.toBeNull();
      expect(row.profiles.display_name).toBe("مستخدم");
    }
    expect(beaconMock).toHaveBeenCalled();
    // The first call is the rpc_error beacon emitted from fetchPublicProfiles.
    const blob = beaconMock.mock.calls[0][1] as Blob;
    const text = await blob.text();
    expect(text).toContain("rpc_error");
    expect(text).toContain("auctions");
  });

  it("reports an exception event when the RPC throws", async () => {
    rpcMock.mockRejectedValueOnce(new Error("network down"));
    const { attachPublicProfiles } = await import("../lib/community-profiles");
    const rows = await attachPublicProfiles(SAMPLE_ROWS, "user_id", "profiles", "tenders");
    expect(rows.every((r) => r.profiles?.display_name === "مستخدم")).toBe(true);
    const blob = beaconMock.mock.calls[0][1] as Blob;
    const text = await blob.text();
    expect(text).toContain("exception");
    expect(text).toContain("network down");
  });

  it("dedupes ids and short-circuits when nothing is requested", async () => {
    const { fetchPublicProfiles } = await import("../lib/community-profiles");
    const map = await fetchPublicProfiles([null, undefined], "feed");
    expect(map.size).toBe(0);
    expect(rpcMock).not.toHaveBeenCalled();

    rpcMock.mockResolvedValueOnce({
      data: [{ id: SAMPLE_IDS[0], display_name: "x" }],
      error: null,
    });
    await fetchPublicProfiles([SAMPLE_IDS[0], SAMPLE_IDS[0], SAMPLE_IDS[0]], "feed");
    expect(rpcMock).toHaveBeenCalledTimes(1);
    const arg = rpcMock.mock.calls[0][1];
    expect(arg._ids).toHaveLength(1);
  });
});
