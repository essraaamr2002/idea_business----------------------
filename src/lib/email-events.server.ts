// Server-only helper to enqueue transactional emails for platform events.
// Uses the existing pgmq queue (`transactional_emails`) via the `enqueue_email` RPC.

const SITE_URL = process.env.SITE_URL || "https://busniss.org";

function esc(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function wrap(title: string, bodyHtml: string, ctaText?: string, ctaUrl?: string) {
  return `<div style="font-family:Arial,sans-serif;direction:rtl;text-align:right;max-width:600px;margin:0 auto;padding:24px;background:#fff;color:#111">
    <h2 style="color:#0f172a;margin:0 0 16px">${esc(title)}</h2>
    <div style="color:#334155;font-size:15px;line-height:1.7">${bodyHtml}</div>
    ${ctaUrl && ctaText ? `<p style="margin-top:24px"><a href="${ctaUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">${esc(ctaText)}</a></p>` : ""}
    <hr style="margin-top:28px;border:none;border-top:1px solid #e2e8f0"/>
    <p style="color:#94a3b8;font-size:12px">منصة IDEA BUSINESS — هذا البريد تم إرساله تلقائياً.</p>
  </div>`;
}

async function enqueue(opts: { to: string; subject: string; html: string; template?: string }) {
  if (!opts.to) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = opts.to.toLowerCase();
    const { data: sup } = await supabaseAdmin
      .from("suppressed_emails").select("id").eq("email", email).maybeSingle();
    if (sup) return;
    const messageId = globalThis.crypto?.randomUUID?.() ?? `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const label = opts.template || "platform-event";
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId, template_name: label, recipient_email: email, status: "pending",
    } as any);
    await supabaseAdmin.rpc("enqueue_email" as any, {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: email,
        from: `IDEA BUSINESS <noreply@busniss.org>`,
        sender_domain: "notify.busniss.org",
        subject: opts.subject,
        html: opts.html,
        text: opts.subject,
        purpose: "transactional",
        label,
        idempotency_key: `${label}-${messageId}`,
        queued_at: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.warn("[email-events] enqueue skipped:", (e as any)?.message);
  }
}

async function emailOfUser(userId: string): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

export async function emailKycResult(userId: string, accepted: boolean, reason?: string) {
  const to = await emailOfUser(userId);
  if (!to) return;
  const subject = accepted ? "تم التحقق من حسابك ✅" : "لم يكتمل التحقق من حسابك";
  const body = accepted
    ? `<p>مبروك! تم اعتماد التحقق من هويتك بنجاح ويمكنك الآن استخدام جميع ميزات المنصة.</p>`
    : `<p>عذراً، لم نتمكن من اعتماد طلب التحقق.</p>${reason ? `<p><b>السبب:</b> ${esc(reason)}</p>` : ""}<p>يمكنك إعادة المحاولة من صفحة الحساب.</p>`;
  await enqueue({ to, subject, html: wrap(subject, body, "فتح المنصة", `${SITE_URL}/profile`), template: "kyc-result" });
}

export async function emailNewProjectToSubscribers(project: { id: string; name: string; description?: string | null }) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs } = await supabaseAdmin.from("news_subscribers").select("email").eq("unsubscribed", false);
    const url = `${SITE_URL}/projects/${project.id}`;
    const html = wrap(
      `مشروع جديد: ${project.name}`,
      `<p>تم نشر مشروع جديد على منصة IDEA BUSINESS.</p>${project.description ? `<p>${esc(project.description.slice(0, 280))}${project.description.length > 280 ? "…" : ""}</p>` : ""}`,
      "عرض المشروع",
      url,
    );
    for (const s of subs ?? []) {
      await enqueue({ to: s.email, subject: `🚀 مشروع جديد: ${project.name}`, html, template: "new-project" });
    }
  } catch (e) {
    console.warn("[emailNewProjectToSubscribers]", e);
  }
}

export async function emailNewOfferToOwner(ownerId: string, args: {
  projectId: string; projectName: string; investorName: string; amount: number; currency: string; shares: number; message?: string;
}) {
  const to = await emailOfUser(ownerId);
  if (!to) return;
  const subject = `عرض استثمار جديد على "${args.projectName}"`;
  const body = `<p>قدّم <b>${esc(args.investorName)}</b> عرضاً للاستثمار في مشروعك:</p>
    <ul>
      <li>المبلغ: <b>${args.amount.toLocaleString("ar")} ${esc(args.currency)}</b></li>
      <li>عدد الأسهم: <b>${args.shares.toLocaleString("ar")}</b></li>
    </ul>
    ${args.message ? `<p><b>رسالة المستثمر:</b><br/>${esc(args.message)}</p>` : ""}`;
  await enqueue({ to, subject, html: wrap(subject, body, "مراجعة العرض", `${SITE_URL}/projects/${args.projectId}?tab=offers`), template: "offer-new" });
}

export async function emailOfferResponseToInvestor(investorId: string, args: {
  projectId: string; projectName: string; status: "accepted" | "rejected" | "countered"; note?: string; counterAmount?: number; counterShares?: number; currency?: string;
}) {
  const to = await emailOfUser(investorId);
  if (!to) return;
  const statusAr = args.status === "accepted" ? "تم قبول عرضك ✅" : args.status === "rejected" ? "تم رفض عرضك" : "تم إرسال عرض مضاد";
  const subject = `${statusAr} — ${args.projectName}`;
  let body = `<p>قام صاحب مشروع <b>${esc(args.projectName)}</b> بالرد على عرضك.</p>`;
  if (args.status === "countered" && args.counterAmount && args.counterShares) {
    body += `<p><b>العرض المضاد:</b> ${args.counterAmount.toLocaleString("ar")} ${esc(args.currency || "SAR")} مقابل ${args.counterShares.toLocaleString("ar")} سهم.</p>`;
  }
  if (args.note) body += `<p><b>ملاحظة:</b> ${esc(args.note)}</p>`;
  await enqueue({ to, subject, html: wrap(subject, body, "فتح المشروع", `${SITE_URL}/projects/${args.projectId}?tab=offers`), template: "offer-response" });
}

export async function emailProjectInteraction(ownerId: string, args: {
  projectId: string; projectName: string; actorName: string; kind: "like" | "comment" | "message"; preview?: string;
}) {
  const to = await emailOfUser(ownerId);
  if (!to) return;
  const kindAr = args.kind === "like" ? "إعجاب جديد" : args.kind === "comment" ? "تعليق جديد" : "رسالة جديدة";
  const subject = `${kindAr} على مشروعك "${args.projectName}"`;
  const body = `<p>قام <b>${esc(args.actorName)}</b> بـ ${esc(kindAr)} على مشروعك.</p>${args.preview ? `<blockquote style="border-right:3px solid #0ea5e9;padding:8px 12px;background:#f1f5f9;margin:12px 0">${esc(args.preview)}</blockquote>` : ""}`;
  await enqueue({ to, subject, html: wrap(subject, body, "عرض النشاط", `${SITE_URL}/projects/${args.projectId}`), template: "project-interaction" });
}

export async function emailAdminsKycSubmission(args: {
  userId: string;
  email?: string | null;
  displayName?: string | null;
  status: "approved" | "rejected" | "review";
  score: number;
  reasoning: string;
  documentUrl?: string | null;
  selfieUrl?: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin" as any);
    const ids = (admins ?? []).map((r: any) => r.user_id);
    if (ids.length === 0) return;
    const emails: string[] = [];
    for (const id of ids) {
      const e = await emailOfUser(id);
      if (e) emails.push(e);
    }
    if (emails.length === 0) return;

    let docLink = "";
    let selfieLink = "";
    if (args.documentUrl) {
      const { data } = await supabaseAdmin.storage.from("kyc-documents").createSignedUrl(args.documentUrl, 60 * 60 * 24 * 3);
      docLink = data?.signedUrl ?? "";
    }
    if (args.selfieUrl) {
      const { data } = await supabaseAdmin.storage.from("kyc-documents").createSignedUrl(args.selfieUrl, 60 * 60 * 24 * 3);
      selfieLink = data?.signedUrl ?? "";
    }

    const statusAr = args.status === "approved" ? "✅ مقبول" : args.status === "rejected" ? "❌ مرفوض" : "🟡 يحتاج مراجعة";
    const subject = `طلب توثيق هوية (KYC) — ${statusAr}`;
    const body = `
      <p><b>المستخدم:</b> ${esc(args.displayName || "—")} (${esc(args.email || args.userId)})</p>
      <p><b>قرار الذكاء الاصطناعي:</b> ${statusAr} — درجة الثقة ${Math.round(args.score * 100)}%</p>
      <p><b>التحليل:</b> ${esc(args.reasoning)}</p>
      ${docLink ? `<p><a href="${docLink}">📄 عرض الوثيقة الرسمية</a> (الرابط صالح لـ 3 أيام)</p>` : ""}
      ${selfieLink ? `<p><a href="${selfieLink}">🤳 عرض صورة السيلفي</a></p>` : ""}
    `;
    for (const to of emails) {
      await enqueue({ to, subject, html: wrap(subject, body, "فتح لوحة الإدارة", `${SITE_URL}/dashboard`), template: "kyc-admin-notify" });
    }
  } catch (e) {
    console.warn("[emailAdminsKycSubmission]", e);
  }
}

export async function emailCampaignLaunched(ownerId: string, args: { id: string; headline: string; endAt: string | null }) {
  const to = await emailOfUser(ownerId);
  if (!to) return;
  const subject = `🚀 تم إطلاق حملتك الإعلانية`;
  const ends = args.endAt ? new Date(args.endAt).toLocaleDateString("ar") : "—";
  const body = `<p>تم إطلاق حملتك "<b>${esc(args.headline)}</b>" بنجاح.</p>
    <p><b>تنتهي في:</b> ${esc(ends)}</p>
    <p>يمكنك متابعة الإحصاءات (الظهور، النقرات، الإنفاق) من لوحة الإعلانات.</p>`;
  await enqueue({ to, subject, html: wrap(subject, body, "فتح لوحة الإعلانات", `${SITE_URL}/ads`), template: "ad-campaign-launched" });
}

export async function emailMembershipActivated(userId: string, expiresAt: string | null) {
  const to = await emailOfUser(userId);
  if (!to) return;
  const date = expiresAt ? new Date(expiresAt).toLocaleDateString("ar") : "";
  const subject = "تم تفعيل عضويتك المفتوحة ✅";
  const html = wrap(subject, `<p>تم تفعيل عضويتك المفتوحة بنجاح${date ? ` حتى تاريخ <b>${esc(date)}</b>` : ""}.</p><p>الآن يمكنك نشر عدد غير محدود من المشاريع والتفاعل بحرية.</p>`, "فتح المنصة", `${SITE_URL}/membership`);
  await enqueue({ to, subject, html, template: "membership-activated" });
}

export async function emailMembershipExpired(userId: string) {
  const to = await emailOfUser(userId);
  if (!to) return;
  const subject = "انتهت عضويتك المفتوحة";
  const html = wrap(subject, `<p>انتهت عضويتك ولم نتمكن من تجديدها لعدم كفاية رصيد المحفظة.</p><p>يمكنك إعادة الاشتراك في أي وقت بـ 25 ر.س / شهر.</p>`, "تجديد العضوية", `${SITE_URL}/membership`);
  await enqueue({ to, subject, html, template: "membership-expired" });
}
