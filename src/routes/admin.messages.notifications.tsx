import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListMessagePrefs, adminSetUserMessagePrefs } from "@/lib/messages-reports.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BellRing, BellOff, Mail, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/messages/notifications")({
  ssr: false,
  component: Page,
});

type Row = {
  user_id: string;
  messages_email: boolean;
  messages_push: boolean;
  messages_silent: boolean;
  hide_read_receipts: boolean;
  profile?: { display_name?: string | null; avatar_url?: string | null };
};

function Page() {
  const list = useServerFn(adminListMessagePrefs);
  const setPref = useServerFn(adminSetUserMessagePrefs);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await list({});
      setRows(r.rows as Row[]);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (uid: string, key: keyof Row, value: boolean) => {
    setBusyId(uid);
    try {
      await setPref({ data: { userId: uid, [key]: value } as any });
      setRows((rs) => rs.map((r) => r.user_id === uid ? { ...r, [key]: value } : r));
      toast.success("تم الحفظ");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إعدادات إشعارات الرسائل الخاصة</CardTitle>
          <p className="text-xs text-muted-foreground">تحكّم بالبريد، التنبيهات الفورية، والصمت لكل مستخدم.</p>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-sm text-muted-foreground">جارٍ التحميل…</div>}
          {!loading && rows.length === 0 && <div className="text-sm text-muted-foreground">لا توجد تفضيلات محفوظة بعد.</div>}
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  {r.profile?.avatar_url
                    ? <img src={r.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    : <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs">U</div>}
                  <div className="truncate">
                    <div className="text-sm font-bold truncate">{r.profile?.display_name || "—"}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{r.user_id.slice(0, 8)}…</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {busyId === r.user_id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  <Toggle on={r.messages_email} onChange={(v) => toggle(r.user_id, "messages_email", v)} icon={<Mail className="h-3.5 w-3.5" />} label="بريد" />
                  <Toggle on={r.messages_push} onChange={(v) => toggle(r.user_id, "messages_push", v)} icon={<BellRing className="h-3.5 w-3.5" />} label="تنبيه" />
                  <Toggle on={r.messages_silent} onChange={(v) => toggle(r.user_id, "messages_silent", v)} icon={<BellOff className="h-3.5 w-3.5" />} label="صمت" danger />
                  <Toggle on={r.hide_read_receipts} onChange={(v) => toggle(r.user_id, "hide_read_receipts", v)} icon={r.hide_read_receipts ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} label="إخفاء القراءة" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Toggle({ on, onChange, icon, label, danger }: { on: boolean; onChange: (v: boolean) => void; icon: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
        on
          ? (danger ? "border-rose-500 bg-rose-500/10 text-rose-600" : "border-emerald-500 bg-emerald-500/10 text-emerald-600")
          : "border-border bg-muted text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
