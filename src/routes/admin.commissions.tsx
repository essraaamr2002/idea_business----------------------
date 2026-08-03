import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Coins } from "lucide-react";
import { listCommissions } from "@/lib/admin-accounting.functions";

export const Route = createFileRoute("/admin/commissions")({
  component: AdminCommissions,
});

function AdminCommissions() {
  const fn = useServerFn(listCommissions);
  const [sourceType, setSourceType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-commissions", sourceType, from, to],
    queryFn: () => fn({ data: { sourceType: sourceType || undefined, from: from || undefined, to: to || undefined } }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Coins className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">سجل العمولات</h1>
          <p className="text-sm text-muted-foreground">كل العمولات المحصّلة على المنصة.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label>نوع المصدر</Label><Input value={sourceType} onChange={(e) => setSourceType(e.target.value)} placeholder="membership / share_trade / ..." /></div>
          <div><Label>من تاريخ</Label><Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>إلى تاريخ</Label><Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="flex flex-col justify-end">
            <div className="rounded-md border bg-muted/50 p-3 text-center">
              <div className="text-xs text-muted-foreground">الإجمالي</div>
              <div className="text-2xl font-bold">{Number(data?.total ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</div>
              <div className="text-xs text-muted-foreground">{data?.count ?? 0} عملية</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>التفاصيل</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">المصدر</TableHead>
                <TableHead className="text-right">دافع العمولة</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">العملة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.rows ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("ar-SA")}</TableCell>
                  <TableCell><Badge variant="outline">{r.source_type}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.payer_id ? String(r.payer_id).slice(0, 8) + "…" : "—"}</TableCell>
                  <TableCell className="font-mono">{Number(r.amount).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{r.currency}</TableCell>
                </TableRow>
              ))}
              {(data?.rows ?? []).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">لا توجد عمولات</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
