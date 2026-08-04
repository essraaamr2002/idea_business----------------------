import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mail, Phone, MessageCircle, LifeBuoy, Paperclip, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { PageState } from "@/components/PageState";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "الدعم الفني وتذاكر الشكاوى | IDEA BUSINESS" },
      { name: "description", content: "تواصل مع فريق دعم IDEA BUSINESS عبر التذاكر، البريد، أو واتساب. نرد خلال 24 ساعة على شكاواك واقتراحاتك." },
      { property: "og:title", content: "الدعم الفني — IDEA BUSINESS" },
      { property: "og:description", content: "افتح تذكرة دعم وتابع حالتها مباشرةً." },
      { property: "og:url", content: "https://busniss.org/support" },
    ],
    links: [{ rel: "canonical", href: "https://busniss.org/support" }],
  }),
  component: SupportPage,
});

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  attachment_url: string | null;
  admin_reply: string | null;
  replied_at: string | null;
  resolved_at: string | null;
  created_at: string;
};

function SupportPage() {
  const { user, loading } = useAuth();
  const { lang, dir } = useI18n();
  const isEn = lang === "en";
  const nav = useNavigate();
  const [form, setForm] = useState({ subject: "", message: "" });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      nav({ to: "/auth", search: { redirect: "/support" } as never });
    }
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    loadTickets();
    const ch = supabase
      .channel("my-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const next = payload.new as Ticket;
            setTickets((t) => t.map((x) => (x.id === next.id ? next : x)));
            if (next.status === "resolved" && next.resolved_at) {
              toast.success("✅ تم حل التذكرة من قِبل الإدارة");
            } else if (next.admin_reply) {
              toast.info("📩 وصل رد جديد من الإدارة على تذكرتك");
            }
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;
    setTicketsLoading(true);
    setTicketsError("");
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTicketsLoading(false);
    if (error) {
      setTicketsError(error.message);
      return;
    }
    setTickets((data ?? []) as Ticket[]);
  };

  const uploadAttachment = async (): Promise<string | null> => {
    if (!file || !user) return null;
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("support-attachments").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast.error("فشل رفع الملف: " + error.message);
      return null;
    }
    return path;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (form.subject.trim().length < 3 || form.message.trim().length < 10) {
      toast.error("يرجى تعبئة العنوان والمحتوى بشكل صحيح");
      return;
    }
    setSubmitting(true);

    let attachment_url: string | null = null;
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("حجم الملف يجب ألا يتجاوز 10MB");
        setSubmitting(false);
        return;
      }
      attachment_url = await uploadAttachment();
      if (file && !attachment_url) {
        setSubmitting(false);
        return;
      }
    }

    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      email: user.email ?? null,
      subject: form.subject.trim(),
      message: form.message.trim(),
      attachment_url,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);

    toast.success("✅ تم استلام شكواك — جارٍ العمل عليها وسنتواصل معك قريبًا");
    setForm({ subject: "", message: "" });
    setFile(null);
    loadTickets();
  };

  if (loading || !user) {
    return (
      <WorkspaceShell>
        <div className="p-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <WorkspaceShell>
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-primary" /> الدعم الفني
        </h1>

        <div className="grid gap-3 sm:grid-cols-3">
          <Channel icon={Mail} title="البريد" value="support@idea-business.com" href="mailto:support@idea-business.com" />
          <Channel icon={MessageCircle} title="واتساب" value="تواصل مباشر" href="https://wa.me/966500000000" />
          <Channel icon={Phone} title="هاتف" value="+966 50 000 0000" href="tel:+966500000000" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>رفع شكوى أو اقتراح</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>عنوان الشكوى</Label>
                <Input
                  required
                  maxLength={200}
                  placeholder="مثال: مشكلة في عملية شحن المحفظة"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>
              <div>
                <Label>محتوى الشكوى / الشرح</Label>
                <Textarea
                  required
                  rows={6}
                  maxLength={5000}
                  placeholder="اشرح المشكلة بالتفصيل: ماذا حدث، متى، وما النتيجة المتوقعة…"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Paperclip className="h-4 w-4" /> إرفاق ملف (اختياري — حتى 10MB)
                </Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {file.name} · {(file.size / 1024).toFixed(1)} KB
                  </div>
                )}
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="gradient-primary text-primary-foreground font-bold"
              >
                {submitting ? "جارٍ الإرسال…" : "إرسال التذكرة"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تذاكري ({tickets.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ticketsLoading ? (
              <PageState
                kind="loading"
                title={isEn ? "Loading your tickets" : "جارٍ تحميل تذاكرك"}
                description={isEn ? "We are checking your support history." : "نراجع سجل طلبات الدعم الخاص بك."}
              />
            ) : ticketsError ? (
              <PageState
                kind="error"
                title={isEn ? "Tickets could not load" : "تعذّر تحميل التذاكر"}
                description={ticketsError}
                actionLabel={isEn ? "Reload tickets" : "إعادة تحميل التذاكر"}
                onAction={loadTickets}
              />
            ) : tickets.length === 0 && (
              <PageState
                kind="empty"
                title={isEn ? "No tickets yet" : "لا توجد تذاكر بعد"}
                description={isEn ? "Open your first support ticket from the form above." : "افتح أول تذكرة دعم من النموذج بالأعلى."}
              />
            )}
            {tickets.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
          </CardContent>
        </Card>
      </main>
      </WorkspaceShell>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!ticket.attachment_url) return;
    supabase.storage
      .from("support-attachments")
      .createSignedUrl(ticket.attachment_url, 3600)
      .then(({ data }) => setAttachmentUrl(data?.signedUrl ?? null));
  }, [ticket.attachment_url]);

  const statusBadge = () => {
    if (ticket.status === "resolved" || ticket.resolved_at)
      return (
        <Badge className="bg-success/10 text-success border-success/30">
          <CheckCircle2 className="h-3 w-3 me-1" /> تم الحل
        </Badge>
      );
    if (ticket.admin_reply)
      return (
        <Badge className="bg-primary/10 text-primary border-primary/30">
          <MessageCircle className="h-3 w-3 me-1" /> رد من الإدارة
        </Badge>
      );
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 me-1" /> قيد المراجعة
      </Badge>
    );
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex justify-between items-start gap-2">
        <div className="font-bold">{ticket.subject}</div>
        {statusBadge()}
      </div>
      <p className="text-sm whitespace-pre-wrap text-muted-foreground">{ticket.message}</p>
      <div className="text-[11px] text-muted-foreground">
        {new Date(ticket.created_at).toLocaleString("ar")}
      </div>
      {attachmentUrl && (
        <a
          href={attachmentUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          <Paperclip className="h-3 w-3" /> عرض المرفق
        </a>
      )}
      {ticket.admin_reply && (
        <div className="mt-2 rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
          <div className="text-[11px] font-extrabold text-primary mb-1">رد الإدارة</div>
          <p className="whitespace-pre-wrap">{ticket.admin_reply}</p>
          {ticket.replied_at && (
            <div className="text-[11px] text-muted-foreground mt-1">
              {new Date(ticket.replied_at).toLocaleString("ar")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Channel({
  icon: Icon,
  title,
  value,
  href,
}: {
  icon: any;
  title: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-xl border bg-card p-4 shadow-card transition hover:shadow-elevated"
    >
      <Icon className="h-5 w-5 text-primary mb-2" />
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="font-bold text-sm">{value}</div>
    </a>
  );
}
