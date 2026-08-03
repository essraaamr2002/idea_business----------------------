import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { adminListAmlFlags, adminResolveAmlFlag } from "@/lib/wallet-real.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/aml")({
  component: AmlPage,
});

const SEV: Record<string, string> = {
  low: "bg-sky-500/15 text-sky-500",
  medium: "bg-amber-500/15 text-amber-500",
  high: "bg-orange-500/15 text-orange-500",
  critical: "bg-rose-500/15 text-rose-500",
};

function AmlPage() {
  const listFn = useServerFn(adminListAmlFlags);
  const resolveFn = useServerFn(adminResolveAmlFlag);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["aml-flags"], queryFn: () => listFn() });
  const mut = useMutation({
    mutationFn: async (v: { id: string; status: "cleared" | "escalated" | "reported"; resolution: string }) =>
      resolveFn({ data: v }),
    onSuccess: () => { toast.success("تم تحديث الحالة"); qc.invalidateQueries({ queryKey: ["aml-flags"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AdminPageShell title="مراقبة مكافحة غسل الأموال (AML)" icon={ShieldAlert} badge="امتثال"
      description="تنبيهات تلقائية: Velocity / Structuring / Round-trip — راجع وقرر الإجراء.">
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto my-10" /> :
        !data?.length ? <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">لا توجد تنبيهات.</CardContent></Card> :
        <div className="space-y-2">
          {data.map((f: any) => <FlagRow key={f.id} flag={f} onResolve={(s: "cleared"|"escalated"|"reported", r: string) => mut.mutate({ id: f.id, status: s, resolution: r })} busy={mut.isPending} />)}
        </div>}
    </AdminPageShell>
  );
}

function FlagRow({ flag, onResolve, busy }: any) {
  const [reason, setReason] = useState("");
  return (
    <Card>
      <CardContent className="p-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={SEV[flag.severity] || ""}>{flag.severity}</Badge>
            <Badge variant="outline">{flag.flag_type}</Badge>
            <Badge variant="secondary">{flag.status}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">المستخدم: <span className="font-mono">{flag.wallet_user_id.slice(0,8)}…</span></div>
          <pre className="text-xs bg-muted/40 rounded p-2 overflow-x-auto">{JSON.stringify(flag.details, null, 2)}</pre>
          <div className="text-xs text-muted-foreground">{new Date(flag.auto_detected_at).toLocaleString("ar-SA")}</div>
          {flag.resolution && <div className="text-xs">القرار: {flag.resolution}</div>}
        </div>
        {flag.status === "open" && (
          <div className="space-y-2 min-w-[260px]">
            <Textarea placeholder="ملاحظات/قرار الفاحص" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={!reason || busy} onClick={() => onResolve("cleared", reason)}>تبرئة</Button>
              <Button size="sm" disabled={!reason || busy} onClick={() => onResolve("escalated", reason)}>تصعيد</Button>
              <Button size="sm" variant="destructive" disabled={!reason || busy} onClick={() => onResolve("reported", reason)}>إبلاغ SAMA</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
