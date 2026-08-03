import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListConversations, adminListMessages } from "@/lib/admin-messages.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Eye, Shield } from "lucide-react";

export const Route = createFileRoute("/admin/messages")({
  ssr: false,
  component: AdminMessages,
});

function AdminMessages() {
  const listConvs = useServerFn(adminListConversations);
  const listMsgs = useServerFn(adminListMessages);
  const [convs, setConvs] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listConvs({ data: { limit: 100 } })
      .then((r: any) => setConvs(r.conversations))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setMsgs([]);
    listMsgs({ data: { conversationId: selected } }).then((r: any) => setMsgs(r.messages));
  }, [selected]);

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-amber-500" />
            <div>
              <CardTitle className="text-lg">مراقبة الرسائل الخاصة</CardTitle>
              <p className="text-xs text-muted-foreground">جميع عمليات الاطلاع مسجّلة في سجل التدقيق.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/messages/reports" className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold text-white">🚩 البلاغات</a>
            <a href="/admin/messages/notifications" className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">🔔 إعدادات الإشعارات</a>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">المحادثات ({convs.length})</CardTitle></CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto p-2">
            {loading && <div className="p-4 text-sm text-muted-foreground">جارٍ التحميل…</div>}
            {!loading && convs.length === 0 && <div className="p-4 text-sm text-muted-foreground">لا توجد محادثات.</div>}
            {convs.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`mb-1 w-full rounded-lg p-3 text-right text-xs transition ${selected === c.id ? "bg-primary/15 ring-1 ring-primary" : "hover:bg-muted"}`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {c.participants.map((p: any) => p?.display_name || "—").join(" ↔ ")}
                </div>
                {c.last_message && (
                  <div className="mt-1 line-clamp-1 text-muted-foreground">{c.last_message.content}</div>
                )}
                <div className="mt-1 text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString("ar")}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">الرسائل</CardTitle>
            {selected && <Badge variant="outline" className="gap-1"><Eye className="h-3 w-3" />وضع المراقبة</Badge>}
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto">
            {!selected && <div className="p-6 text-center text-sm text-muted-foreground">اختر محادثة لعرض رسائلها.</div>}
            {selected && msgs.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">جارٍ التحميل…</div>}
            <div className="space-y-2">
              {msgs.map((m) => (
                <div key={m.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-medium">{m.sender?.display_name || m.sender_id.slice(0, 8)}</span>
                    <span>{new Date(m.created_at).toLocaleString("ar")}</span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
