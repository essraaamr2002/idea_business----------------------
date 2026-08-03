import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListMessageReports, adminUpdateReportStatus } from "@/lib/messages-reports.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/messages/reports")({
  ssr: false,
  component: Page,
});

type Report = {
  id: string;
  conversation_id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  notes: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
  resolved_at: string | null;
  reporter?: { display_name?: string | null };
  reported?: { display_name?: string | null };
};

const REASON_AR: Record<string, string> = {
  harassment: "تحرّش", scam: "احتيال", spam: "سبام", inappropriate: "غير لائق", other: "آخر",
};
const STATUS_AR: Record<string, string> = {
  open: "مفتوح", reviewing: "قيد المراجعة", resolved: "تم الحل", dismissed: "مرفوض",
};

function Page() {
  const list = useServerFn(adminListMessageReports);
  const update = useServerFn(adminUpdateReportStatus);
  const [rows, setRows] = useState<Report[]>([]);
  const [filter, setFilter] = useState<"open" | "reviewing" | "resolved" | "dismissed" | "all">("open");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { const r: any = await list({ data: { status: filter } }); setRows(r.reports as Report[]); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter]);

  const setStatus = async (id: string, status: Report["status"]) => {
    setBusy(id);
    try { await update({ data: { id, status } }); toast.success("تم"); load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Flag className="h-5 w-5 text-rose-600" /> بلاغات الرسائل الخاصة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            {(["open", "reviewing", "resolved", "dismissed", "all"] as const).map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {s === "all" ? "الكل" : STATUS_AR[s]}
              </button>
            ))}
          </div>
          {loading && <div className="text-sm text-muted-foreground">جارٍ التحميل…</div>}
          {!loading && rows.length === 0 && <div className="text-sm text-muted-foreground">لا توجد بلاغات.</div>}
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="font-bold">
                    {r.reporter?.display_name || "—"} ضد {r.reported?.display_name || "—"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-600">{REASON_AR[r.reason] || r.reason}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5">{STATUS_AR[r.status]}</span>
                    <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</span>
                  </div>
                </div>
                {r.notes && <div className="rounded-lg bg-muted/40 p-2 text-xs whitespace-pre-wrap">{r.notes}</div>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <a href={`/admin/messages?c=${r.conversation_id}`} className="text-xs underline text-primary">فتح المحادثة</a>
                  <div className="ms-auto flex items-center gap-1">
                    {busy === r.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    {(["reviewing", "resolved", "dismissed"] as const).map((s) => (
                      <button key={s} onClick={() => setStatus(r.id, s)}
                        disabled={r.status === s}
                        className="rounded-full border border-border px-2 py-1 text-[11px] font-bold hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-50">
                        {STATUS_AR[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
