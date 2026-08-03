import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scale, Play } from "lucide-react";
import { toast } from "sonner";
import { adminRunReconciliation, adminReconciliationLog } from "@/lib/wallet-fx.functions";

export const Route = createFileRoute("/admin/fx-reconciliation")({
  component: ReconPage,
});

function ReconPage() {
  const qc = useQueryClient();
  const fnLog = useServerFn(adminReconciliationLog);
  const fnRun = useServerFn(adminRunReconciliation);
  const log = useQuery({ queryKey: ["fx-recon"], queryFn: () => fnLog() });
  const run = useMutation({
    mutationFn: () => fnRun(),
    onSuccess: () => { toast.success("تم تشغيل التسوية"); qc.invalidateQueries({ queryKey: ["fx-recon"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AdminPageShell
      title="تسويات العملات (Reconciliation)"
      description="مطابقة أرصدة المستخدمين بأرصدة شريك EMI لكل عملة"
      icon={Scale}
      actions={<Button onClick={() => run.mutate()} disabled={run.isPending}><Play className="h-4 w-4 me-1" />تشغيل التسوية الآن</Button>}
    >
      <Card>
        <CardHeader><CardTitle className="text-base">السجل ({(log.data ?? []).length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr><th className="p-2 text-start">التاريخ</th><th className="p-2">العملة</th><th className="p-2">مجموع المستخدمين</th><th className="p-2">شريك EMI</th><th className="p-2">فرق</th><th className="p-2">الحالة</th></tr>
              </thead>
              <tbody>
                {(log.data ?? []).map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 text-xs">{new Date(r.run_at).toLocaleString("ar")}</td>
                    <td className="p-2 text-center font-mono">{r.currency}</td>
                    <td className="p-2 text-center font-mono">{Number(r.sum_user_balances_minor).toLocaleString()}</td>
                    <td className="p-2 text-center font-mono">{r.partner_balance_minor != null ? Number(r.partner_balance_minor).toLocaleString() : "—"}</td>
                    <td className="p-2 text-center font-mono">{r.discrepancy_minor ?? "—"}</td>
                    <td className="p-2 text-center"><Badge variant={r.status === "ok" ? "default" : "outline"}>{r.status}</Badge></td>
                  </tr>
                ))}
                {!(log.data ?? []).length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">لا توجد تسويات بعد</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
