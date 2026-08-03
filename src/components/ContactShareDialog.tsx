import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, MessageCircle, Mail, Phone, Ghost, Share2, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { importSharedContacts } from "@/lib/leads.functions";
import { toast } from "sonner";

type Contact = { full_name?: string; phone?: string; email?: string };

function parseContacts(text: string): Contact[] {
  const lines = text.split(/[\n,;]+/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const email = line.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
    const phone = line.replace(email ?? "", "").match(/\+?\d[\d\s-]{6,}/)?.[0]?.replace(/[\s-]/g, "");
    const name = line.replace(email ?? "", "").replace(phone ?? "", "").trim();
    return { full_name: name || undefined, phone: phone || undefined, email: email || undefined };
  }).filter((c) => c.phone || c.email);
}

export function ContactShareDialog({ url, code, message }: { url: string; code: string; message: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState("انضم لIDEA BUSINESS بدعوتي");
  const importFn = useServerFn(importSharedContacts);

  const contacts = parseContacts(text);
  const phones = contacts.filter((c) => c.phone).map((c) => c.phone!);
  const emails = contacts.filter((c) => c.email).map((c) => c.email!);
  const composed = `${message}\n${url}`;

  const pickFromDevice = async () => {
    const nav = navigator as unknown as { contacts?: { select: (p: string[], o?: object) => Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>> } };
    if (!nav.contacts?.select) {
      toast.error("متصفحك لا يدعم الوصول المباشر لجهات الاتصال — الصق الأرقام يدوياً.");
      return;
    }
    try {
      const props = ["name", "tel", "email"];
      const picked = await nav.contacts.select(props, { multiple: true });
      const lines = picked.map((c) => [c.name?.[0] ?? "", c.tel?.[0] ?? "", c.email?.[0] ?? ""].filter(Boolean).join(" | "));
      setText((prev) => (prev ? prev + "\n" : "") + lines.join("\n"));
      toast.success(`تمت إضافة ${picked.length} جهة`);
    } catch {
      toast.error("رُفض الوصول لجهات الاتصال");
    }
  };

  const save = async (channel: "whatsapp" | "sms" | "email" | "snapchat" | "native") => {
    if (!consent) return toast.error("يرجى الموافقة على الشروط أولاً.");
    if (!contacts.length) return toast.error("أضف جهات اتصال أولاً.");
    setBusy(true);
    try {
      const res = await importFn({ data: { channel, referral_code: code, contacts, consent: true } });
      toast.success(`تم حفظ ${res.inserted} جهة في العملاء المحتملين`);
    } catch (e) {
      toast.error("تعذّر الحفظ: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openWhatsApp = async () => {
    await save("whatsapp");
    const msg = encodeURIComponent(composed);
    if (phones.length === 1) {
      window.open(`https://wa.me/${phones[0].replace(/^\+/, "")}?text=${msg}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${msg}`, "_blank");
      if (phones.length > 1) toast.info(`افتح واتساب واختر ${phones.length} جهات لإرسال الرسالة.`);
    }
  };

  const openSMS = async () => {
    await save("sms");
    if (!phones.length) return toast.error("لا توجد أرقام جوال");
    const body = encodeURIComponent(composed);
    window.location.href = `sms:${phones.join(",")}?body=${body}`;
  };

  const openEmail = async () => {
    await save("email");
    if (!emails.length) return toast.error("لا توجد بريد إلكتروني");
    const body = encodeURIComponent(composed);
    const sub = encodeURIComponent(subject);
    window.location.href = `mailto:${emails.join(",")}?subject=${sub}&body=${body}`;
  };

  const openSnap = async () => {
    await save("snapchat");
    const u = encodeURIComponent(url);
    window.open(`https://snapchat.com/scan?attachmentUrl=${u}`, "_blank");
  };

  const openNative = async () => {
    await save("native");
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: subject, text: message, url }); } catch { /* cancel */ }
    } else {
      toast.error("المشاركة الأصلية غير مدعومة");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full font-extrabold" variant="default">
          <Users className="me-2 h-4 w-4" /> دعوة جهات اتصالك (واتساب / SMS / بريد / سناب)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>دعوة جماعية لأصدقائك</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-primary/5 p-3 text-xs">
            <div className="mb-1 font-extrabold text-primary">🎁 اكسب 50 نقطة عن كل صديق يسجّل، وترقية عضوية عن كل 5.</div>
            <div>الأرقام والإيميلات تُحفظ لدينا كعملاء محتملين ولك — بعد موافقتك الصريحة.</div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>جهات الاتصال</Label>
              <Button size="sm" variant="outline" onClick={pickFromDevice}>
                <Phone className="me-1 h-3 w-3" /> استيراد من جهازي
              </Button>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="أحمد | 0555111222&#10;سارة | sara@mail.com&#10;+966501234567, name@x.com"
              className="font-mono text-xs"
            />
            <div className="mt-1 text-[11px] text-muted-foreground">
              {contacts.length} جهة — {phones.length} جوال، {emails.length} بريد
            </div>
          </div>

          <div>
            <Label className="text-xs">عنوان البريد (للإرسال بالإيميل)</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
          </div>

          <label className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
            <span>
              أوافق على حفظ هذه البيانات في نظام العملاء المحتملين للمنصة ولإرسال دعوتي، وأتحمل مسؤولية أن جهات الاتصال هذه توافق على تلقي رسائل مني.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Button onClick={openWhatsApp} disabled={busy || !consent} className="bg-green-600 hover:bg-green-700 text-white">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><MessageCircle className="me-1 h-4 w-4" /> واتساب</>}
            </Button>
            <Button onClick={openSMS} disabled={busy || !consent} variant="secondary">
              <Phone className="me-1 h-4 w-4" /> SMS
            </Button>
            <Button onClick={openEmail} disabled={busy || !consent} variant="secondary">
              <Mail className="me-1 h-4 w-4" /> بريد
            </Button>
            <Button onClick={openSnap} disabled={busy || !consent} className="bg-yellow-400 text-black hover:bg-yellow-500">
              <Ghost className="me-1 h-4 w-4" /> سناب
            </Button>
            <Button onClick={openNative} disabled={busy || !consent} variant="outline" className="col-span-2 sm:col-span-1">
              <Share2 className="me-1 h-4 w-4" /> مشاركة
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
