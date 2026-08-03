import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { listAdCampaigns, setAdStatus } from "@/lib/admin-moderation.functions";

export const Route = createFileRoute("/admin/ads-admin")({
  component: AdsAdmin,
});

const STATUSES = ["draft", "pending_payment", "active", "paused", "completed", "rejected"] as const;

function AdsAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(listAdCampaigns);
  const setSt = useServerFn(setAdStatus);
  const [status, setStatus] = useState<string>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ads", status],
    queryFn: () => list({ data: { status: status === "all" ? undefined : status, limit: 200 } }),
  });
  const m = useMutation({
    mutationFn: (v: { campaignId: string; status: any; rejectionReason?: string | null; reason: string }) =>
      setSt({ data: v }),
    onSuccess: () => { toast.success("تم"); qc.invalidateQueries({ queryKey: ["admin", "ads"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  function act(c: any, target: string) {
    const reason = prompt(`السبب لتحويل الحالة إلى "${target}"`);
    if (!reason || reason.length < 3) return;
    const rej = target === "rejected" ? (prompt("سبب الرفض الظاهر للمعلن") ?? "") : null;
    m.mutate({ campaignId: c.id, status: target as any, rejectionReason: rej, reason });
  }

  return (
    <Card>
      <CardHeader><CardTitle>مراجعة الإعلانات</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>العنوان</TableHead><TableHead>المالك</TableHead>
              <TableHead>الميزانية</TableHead><TableHead>الأداء</TableHead>
              <TableHead>الحالة</TableHead><TableHead className="text-end">إجراءات</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">…</TableCell></TableRow>}
              {(data ?? []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.headline}</div>
                    {c.cta_url && <a href={c.cta_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{c.cta_label}</a>}
                    {c.rejection_reason && <div className="text-xs text-destructive">رفض: {c.rejection_reason}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.owner_id.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs">
                    اليومي {Number(c.daily_budget).toFixed(2)} • الإجمالي {Number(c.total_budget).toFixed(2)} {c.currency}
                    <div className="text-muted-foreground">صُرف {Number(c.spent).toFixed(2)}</div>
                  </TableCell>
                  <TableCell className="text-xs">{c.impressions} ظهور • {c.clicks} نقرة</TableCell>
                  <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                  <TableCell className="text-end space-x-1 space-x-reverse">
                    {(c.status === "draft" || c.status === "pending_payment") && (
                      <>
                        <Button size="sm" onClick={() => act(c, "active")}>اعتماد</Button>
                        <Button size="sm" variant="destructive" onClick={() => act(c, "rejected")}>رفض</Button>
                      </>
                    )}
                    {c.status === "active" && <Button size="sm" variant="secondary" onClick={() => act(c, "paused")}>إيقاف</Button>}
                    {c.status === "paused" && <Button size="sm" onClick={() => act(c, "active")}>استئناف</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
