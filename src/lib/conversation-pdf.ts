import { supabase } from "@/integrations/supabase/client";

type Msg = {
  id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
  read_at?: string | null;
};

const escHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]!));

/** Resolve a signed URL for an attachment (best-effort, returns null on failure). */
async function signedUrl(path: string): Promise<string | null> {
  try {
    const { data } = await supabase.storage.from("message-attachments").createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  } catch { return null; }
}

/**
 * Build a printable PDF view of a conversation in a new window.
 * Browser print-to-PDF preserves Arabic shaping and images.
 */
export async function exportConversationPdf(opts: {
  title: string;
  meId: string;
  meName: string;
  otherName: string;
  messages: Msg[];
}) {
  const attachmentUrls = new Map<string, string | null>();
  for (const m of opts.messages) {
    if (m.attachment_url && !attachmentUrls.has(m.attachment_url)) {
      attachmentUrls.set(m.attachment_url, await signedUrl(m.attachment_url));
    }
  }

  const rows = opts.messages.map((m) => {
    const mine = m.sender_id === opts.meId;
    const who = mine ? opts.meName : opts.otherName;
    const time = new Date(m.created_at).toLocaleString("ar-SA");
    const url = m.attachment_url ? attachmentUrls.get(m.attachment_url) : null;
    const isImg = (m.attachment_type || "").startsWith("image/");
    const attachmentHtml = m.attachment_url
      ? (url
          ? (isImg
              ? `<div class="att"><img src="${escHtml(url)}" alt="attachment" /></div>`
              : `<div class="att"><a href="${escHtml(url)}">📎 ${escHtml(m.attachment_url.split("/").pop())}</a></div>`)
          : `<div class="att muted">📎 مرفق (${escHtml(m.attachment_type || "")})</div>`)
      : "";
    return `
      <div class="msg ${mine ? "out" : "in"}">
        <div class="meta"><b>${escHtml(who)}</b> · <span>${escHtml(time)}</span></div>
        ${m.content ? `<div class="body">${escHtml(m.content)}</div>` : ""}
        ${attachmentHtml}
      </div>`;
  }).join("");

  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${escHtml(opts.title)}</title>
  <style>
    body{font-family:Cairo,system-ui,Tahoma,sans-serif;padding:24px;color:#111;background:#fff}
    h1{font-size:18px;margin:0 0 4px}
    .head{color:#555;font-size:11px;margin-bottom:18px;border-bottom:1px solid #ddd;padding-bottom:10px}
    .msg{margin:0 0 10px;padding:10px 14px;border-radius:12px;max-width:78%;page-break-inside:avoid}
    .msg.in{background:#f1f5f9;margin-inline-end:auto}
    .msg.out{background:#dbeafe;margin-inline-start:auto}
    .meta{font-size:10px;color:#555;margin-bottom:4px}
    .body{font-size:13px;white-space:pre-wrap;line-height:1.6}
    .att img{max-width:100%;max-height:280px;border-radius:8px;margin-top:6px}
    .att.muted{color:#888;font-size:11px}
    @media print { .no-print{display:none} body{padding:12px} }
  </style></head><body>
  <h1>${escHtml(opts.title)}</h1>
  <div class="head">تم التصدير في ${escHtml(new Date().toLocaleString("ar-SA"))} — ${opts.messages.length} رسالة</div>
  ${rows || `<div class="muted">لا توجد رسائل</div>`}
  <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
