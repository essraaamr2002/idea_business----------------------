import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KIND_AR: Record<string, string> = {
  bid_deposit: "وديعة جدية مزايدة",
  auction_bid: "مزايدة فعّالة",
  tender_bid: "تقديم مناقصة",
  payout_pending: "سحب تحت المعالجة",
  escrow: "ضمان صفقة",
  investment_hold: "استثمار قيد التأكيد",
  refund_hold: "استرداد معلّق",
};

export const getMyHoldsBreakdown = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    const userId = context.userId;

    // Strategy: collect known sources of held funds.
    const out: any[] = [];

    // 1) Pending payouts
    const payouts = await sb
      .from("payout_requests")
      .select("id, amount_minor, status, reference, created_at, eta_release_at, support_ticket_id")
      .eq("user_id", userId)
      .in("status", ["pending", "reviewing", "approved", "scheduled"]);
    for (const p of payouts.data ?? []) {
      out.push({
        id: `payout-${p.id}`,
        kind: "payout_pending",
        kind_ar: KIND_AR.payout_pending,
        amount_minor: Number(p.amount_minor),
        note: `طلب سحب ${p.reference ?? p.id.slice(0, 8)}${p.eta_release_at ? ` — متاح ${new Date(p.eta_release_at).toLocaleDateString("ar-SA")}` : ""}`,
        created_at: p.created_at,
        reference: p.reference,
        link: `/wallet`,
      });
    }

    // 2) Active auction/tender bid deposits
    const bids = await sb
      .from("bids")
      .select("id, auction_id, amount_minor, deposit_minor, status, created_at, auctions(project_id, title)")
      .eq("bidder_id", userId)
      .in("status", ["active", "leading", "pending"]);
    for (const b of bids.data ?? []) {
      const dep = Number(b.deposit_minor ?? 0);
      if (dep <= 0) continue;
      out.push({
        id: `bid-${b.id}`,
        kind: "bid_deposit",
        kind_ar: KIND_AR.bid_deposit,
        amount_minor: dep,
        note: b.auctions?.title ?? `مزاد ${b.auction_id?.slice(0, 8)}`,
        created_at: b.created_at,
        link: b.auctions?.project_id ? `/projects/${b.auctions.project_id}` : `/community`,
      });
    }

    // 3) Generic ledger holds (type=hold, status=completed) — fall back gracefully
    try {
      const holds = await sb
        .from("wallet_ledger")
        .select("id, amount, reference, note, created_at, meta")
        .eq("user_id", userId)
        .eq("type", "hold")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(20);
      for (const h of holds.data ?? []) {
        // Skip if already represented above (best-effort by reference)
        if (out.some((x) => x.reference && h.reference && x.reference === h.reference)) continue;
        const kind = (h.meta as any)?.hold_kind ?? "escrow";
        out.push({
          id: `hold-${h.id}`,
          kind,
          kind_ar: KIND_AR[kind] ?? "حجز",
          amount_minor: Math.abs(Number(h.amount)),
          note: h.note ?? h.reference,
          created_at: h.created_at,
          reference: h.reference,
          link: (h.meta as any)?.link ?? "/wallet/history",
        });
      }
    } catch {
      /* table may not exist in some envs */
    }

    return { holds: out };
  });
