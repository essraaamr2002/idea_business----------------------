import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FileCheck2, CheckCircle2, XCircle, Clock, AlertOctagon, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  adminListFinancingRequests,
  adminDecideFinancingRequest,
} from "@/lib/financing-requests.functions";

export const Route = createFileRoute("/admin/financing-requests")({ component: Page });

const TABS = [
  { key: "pending", label: "قيد المراجعة", icon: Clock },
  { key: "approved", label: "موافَق", icon: CheckCircle2 },
  { key: "rejected", label: "مرفوض", icon: XCircle },
  { key: "auto_rejected", label: "رفض تلقائي", icon: AlertOctagon },
  { key: "cancelled", label: "ملغاة", icon: Ban },
] as const;

function Page() {
  const list = useServerFn(adminListFinancingRequests);
  const decide = useServerFn(adminDecideFinancingRequest);
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const q = useQuery({
    queryKey: ["admin-financing", tab],
    queryFn: () => list({ data: { status: tab } }),
  });

  async function act(id: string, decision: "approved" | "rejected") {
    try {
      await decide({ data: { id, decision, notes: notes[id] } });
      toast.success(decision === "approved" ? "تمت الموافقة" : "تم الرفض");
      qc.invalidateQueries({ queryKey: ["admin-financing"] });
    } catch (e: any) { toast.error(e?.message ?? "فشل الإجراء"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FileCheck2 className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">طلبات التمويل بالرافعة</h1>
          <p className="text-sm text-muted-foreground">راجع الطلبات، وافق أو ارفض مع بيان السبب.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <Button key={t.key} size="sm" variant={tab === t.key ? "default" : "outline"} onClick={() => setTab(t.key)}>
              <Icon className="w-3.5 h-3.5 me-1" />{t.label}
            </Button>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">النتائج ({q.data?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {q.isLoading && <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>}
          {q.data?.length === 0 && <p className="text-sm text-muted-foreground">لا توجد طلبات في هذه الحالة.</p>}
          {q.data?.map((r: any) => (
            <div key={r.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="text-xs font-mono text-muted-foreground">{r.id.slice(0, 8)}…</div>
                <Badge variant="outline">{new Date(r.created_at).toLocaleString("ar")}</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <Info k="المستخدم" v={r.user_id.slice(0, 8) + "…"} />
                <Info k="الإيداع" v={`${Number(r.deposit_amount).toFixed(0)} ر.س`} />
                <Info k="القرض" v={`${Number(r.requested_loan).toFixed(0)} ر.س`} />
                <Info k="الرافعة" v={`${(Number(r.leverage_pct) * 100).toFixed(0)}٪`} />
              </div>
              {r.auto_reasons?.length > 0 && (
                <div className="text-xs bg-red-500/5 border border-red-500/30 rounded p-2">
                  <b className="text-red-600">أسباب الرفض التلقائي:</b>
                  <ul className="list-disc pr-5 mt-1 text-muted-foreground">
                    {r.auto_reasons.map((x: string, i: number) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
              )}
              {r.admin_notes && (
                <div className="text-xs bg-muted/40 rounded p-2"><b>ملاحظات الإدارة السابقة:</b> {r.admin_notes}</div>
              )}
              {tab === "pending" && (
                <>
                  <Textarea placeholder="سبب الرفض / ملاحظة الموافقة (اختياري)"
                    value={notes[r.id] ?? ""} onChange={e => setNotes(s => ({ ...s, [r.id]: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => act(r.id, "approved")}>
                      <CheckCircle2 className="w-4 h-4 me-1" /> موافقة
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => act(r.id, "rejected")}>
                      <XCircle className="w-4 h-4 me-1" /> رفض
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded border bg-background p-2">
      <div className="text-[10px] text-muted-foreground">{k}</div>
      <div className="font-mono font-bold truncate">{v}</div>
    </div>
  );
}
