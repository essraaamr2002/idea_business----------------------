import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Schemas ----------
const CreateOfferInput = z.object({
  project_id: z.string().uuid(),
  amount: z.number().positive().max(1e12),
  shares: z.number().int().positive().max(10_000_000),
  message: z.string().trim().max(2000).optional(),
});

const RespondInput = z.object({
  offer_id: z.string().uuid(),
  action: z.enum(["accept", "reject", "counter", "withdraw"]),
  note: z.string().trim().max(2000).optional(),
  counter_amount: z.number().positive().optional(),
  counter_shares: z.number().int().positive().optional(),
});

const ThreadMsgInput = z.object({
  offer_id: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

// ---------- Create offer (investor -> project owner) ----------
export const createInvestmentOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateOfferInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireSeriousnessDeposit } = await import("./seriousness-deposit.functions");
    await requireSeriousnessDeposit(supabase, userId);

    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("id, owner_id, name, currency, status, share_price, shares_total, shares_sold, description")
      .eq("id", data.project_id)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!project) throw new Error("project_not_found");
    if (project.owner_id === userId) throw new Error("cannot_offer_own_project");
    if (project.status !== "active") throw new Error("project_not_active");

    const remaining = (project.shares_total ?? 0) - (project.shares_sold ?? 0);
    if (data.shares > remaining) throw new Error("not_enough_shares");

    const price_per_share = data.amount / data.shares;

    const { data: inserted, error } = await supabase
      .from("investment_offers")
      .insert({
        project_id: project.id,
        investor_id: userId,
        owner_id: project.owner_id,
        amount: data.amount,
        currency: project.currency || "SAR",
        shares: data.shares,
        price_per_share,
        message: data.message ?? null,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw error;

    // notifications + email (best effort)
    await supabase.from("notifications").insert({
      user_id: project.owner_id,
      type: "investment_offer",
      title: "عرض استثمار جديد",
      body: `عرض ${data.amount} ${project.currency} على ${project.name}`,
      data: { project_id: project.id, offer_id: inserted.id } as any,
    } as any);

    try {
      const { emailNewOfferToOwner } = await import("./email-events.server");
      const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
      await emailNewOfferToOwner(project.owner_id, {
        projectId: project.id,
        projectName: project.name,
        investorName: prof?.display_name || "مستثمر",
        amount: data.amount,
        currency: project.currency || "SAR",
        shares: data.shares,
        message: data.message,
      });
    } catch {}

    return { id: inserted.id };
  });

// ---------- Respond to an offer (owner accepts/rejects/counters, investor withdraws) ----------
export const respondToInvestmentOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RespondInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: offer, error: oErr } = await supabase
      .from("investment_offers")
      .select("*, projects(name)")
      .eq("id", data.offer_id)
      .maybeSingle();
    if (oErr) throw oErr;
    if (!offer) throw new Error("offer_not_found");
    if (offer.status !== "pending") throw new Error("offer_not_pending");

    const isOwner = offer.owner_id === userId;
    const isInvestor = offer.investor_id === userId;
    if (!isOwner && !isInvestor) throw new Error("forbidden");

    let newStatus: "accepted" | "rejected" | "countered" | "withdrawn" = "rejected";
    let counterId: string | null = null;

    if (data.action === "withdraw") {
      if (!isInvestor) throw new Error("only_investor_can_withdraw");
      newStatus = "withdrawn";
    } else {
      if (!isOwner) throw new Error("only_owner_can_respond");
      if (data.action === "accept") newStatus = "accepted";
      else if (data.action === "reject") newStatus = "rejected";
      else if (data.action === "counter") {
        if (!data.counter_amount || !data.counter_shares) throw new Error("counter_requires_amount_and_shares");
        newStatus = "countered";
        // Create a child counter-offer that the investor will respond to next.
        const price_per_share = data.counter_amount / data.counter_shares;
        const { data: child, error: cErr } = await supabase
          .from("investment_offers")
          .insert({
            project_id: offer.project_id,
            investor_id: offer.investor_id,
            owner_id: offer.owner_id,
            amount: data.counter_amount,
            currency: offer.currency,
            shares: data.counter_shares,
            price_per_share,
            message: data.note ?? null,
            status: "pending",
            parent_offer_id: offer.id,
          })
          .select("id")
          .single();
        if (cErr) throw cErr;
        counterId = child.id;
      }
    }

    const { error: uErr } = await supabase
      .from("investment_offers")
      .update({
        status: newStatus,
        responded_at: new Date().toISOString(),
        response_note: data.note ?? null,
      } as any)
      .eq("id", offer.id);
    if (uErr) throw uErr;

    // Notify investor on owner action
    if (isOwner && (newStatus === "accepted" || newStatus === "rejected" || newStatus === "countered")) {
      await supabase.from("notifications").insert({
        user_id: offer.investor_id,
        type: "offer_response",
        title: newStatus === "accepted" ? "تم قبول عرضك" : newStatus === "rejected" ? "تم رفض عرضك" : "عرض مضاد",
        body: (offer as any).projects?.name ?? "",
        data: { project_id: offer.project_id, offer_id: offer.id, counter_id: counterId } as any,
      } as any);

      try {
        const { emailOfferResponseToInvestor } = await import("./email-events.server");
        await emailOfferResponseToInvestor(offer.investor_id, {
          projectId: offer.project_id,
          projectName: (offer as any).projects?.name ?? "مشروع",
          status: newStatus as any,
          note: data.note,
          counterAmount: data.counter_amount,
          counterShares: data.counter_shares,
          currency: offer.currency,
        });
      } catch {}
    }

    return { ok: true, status: newStatus, counter_offer_id: counterId };
  });

// ---------- List offers for a project (owner or admin) ----------
export const listProjectOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("investment_offers")
      .select("id, project_id, investor_id, owner_id, amount, currency, shares, price_per_share, message, status, parent_offer_id, response_note, responded_at, created_at")
      .eq("project_id", data.project_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

// ---------- List my offers (as investor) ----------
export const listMyOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("investment_offers")
      .select("*, projects(id, name, cover_image_url, currency)")
      .eq("investor_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

// ---------- Negotiation thread messages ----------
export const postOfferMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ThreadMsgInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("investment_offer_messages").insert({
      offer_id: data.offer_id,
      sender_id: userId,
      body: data.body,
    } as any);
    if (error) throw error;
    return { ok: true };
  });

export const listOfferMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ offer_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("investment_offer_messages")
      .select("id, offer_id, sender_id, body, created_at")
      .eq("offer_id", data.offer_id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

// ---------- Public project getter (for detail page) ----------
export const getProjectPublic = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: row, error } = await sb
      .from("projects")
      .select("id, name, description, cover_image_url, media_urls, currency, total_cost, target_investment, share_price, current_price, shares_total, shares_sold, country, city, sector, status, owner_id, created_at, likes_count, views_count, ai_score, ai_score_summary, target_roi_pct")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

// ---------- Direct purchase request (buyer -> project owner) ----------
export const createProjectPurchaseRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      project_id: z.string().uuid(),
      shares: z.number().int().positive().max(10_000_000),
      message: z.string().trim().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireSeriousnessDeposit } = await import("./seriousness-deposit.functions");
    await requireSeriousnessDeposit(supabase, userId);

    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("id, owner_id, name, currency, status, share_price, current_price, shares_total, shares_sold")
      .eq("id", data.project_id)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!project) throw new Error("project_not_found");
    if (project.owner_id === userId) throw new Error("cannot_buy_own_project");
    if (project.status !== "active") throw new Error("project_not_active");

    const remaining = Number(project.shares_total ?? 0) - Number(project.shares_sold ?? 0);
    if (data.shares > remaining) throw new Error("not_enough_shares");

    const price = Number(project.current_price ?? project.share_price ?? 0);
    if (price <= 0) throw new Error("invalid_project_price");
    const total = price * data.shares;
    const { calculateInvestmentFees } = await import("./transaction-fees");
    const fees = calculateInvestmentFees(total);

    const { data: inserted, error } = await supabase
      .from("project_purchase_requests")
      .insert({
        project_id: project.id,
        buyer_id: userId,
        owner_id: project.owner_id,
        shares: data.shares,
        price_per_share: price,
        total_amount: total,
        subtotal_amount: fees.subtotal,
        platform_commission_rate: 0.07,
        platform_commission_amount: fees.platformCommission,
        vat_rate: 0.15,
        vat_amount: fees.vatOnCommission,
        payable_total: fees.total,
        currency: project.currency || "SAR",
        message: data.message ?? null,
        status: "pending",
      } as any)
      .select("id")
      .single();
    if (error) throw error;

    await supabase.from("notifications").insert({
      user_id: project.owner_id,
      type: "project_purchase_request",
      title: "طلب شراء مباشر جديد",
      body: `طلب شراء ${data.shares} سهم في ${project.name}`,
      data: { project_id: project.id, purchase_request_id: inserted.id } as any,
    } as any);

    return {
      id: inserted.id,
      total_amount: total,
      platform_commission: fees.platformCommission,
      vat_on_commission: fees.vatOnCommission,
      payable_total: fees.total,
      currency: project.currency || "SAR",
    };
  });
