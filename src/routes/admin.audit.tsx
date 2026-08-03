import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { listAuditLog } from "@/lib/admin-audit.functions";

export const Route = createFileRoute("/admin/audit")({
  component: AuditPage,
});

function AuditPage() {
  const list = useServerFn(listAuditLog);
  const [action, setAction] = useState("");
  const [table, setTable] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit", action, table],
    queryFn: () => list({ data: { action: action || undefined, table: table || undefined, limit: 200 } }),
  });

  return (
    <Card>
      <CardHeader><CardTitle>سجل التدقيق</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="نوع الإجراء (مثال: payout.complete)" value={action} onChange={(e) => setAction(e.target.value)} className="max-w-sm" />
          <Input placeholder="الجدول (مثال: profiles)" value={table} onChange={(e) => setTable(e.target.value)} className="max-w-xs" />
        </div>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>الوقت</TableHead><TableHead>المنفّذ</TableHead>
              <TableHead>الإجراء</TableHead><TableHead>الجدول</TableHead>
              <TableHead>الهدف</TableHead><TableHead>التغيير</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">…</TableCell></TableRow>}
              {!isLoading && (data?.rows ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">لا توجد سجلات.</TableCell></TableRow>}
              {(data?.rows ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("ar")}</TableCell>
                  <TableCell className="font-mono text-xs">{r.actor_id?.slice(0, 8) ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                  <TableCell className="text-xs">{r.target_table ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.target_id?.toString().slice(0, 12) ?? "—"}</TableCell>
                  <TableCell>
                    <pre className="max-w-md whitespace-pre-wrap break-all text-[10px] text-muted-foreground">
                      {r.diff ? JSON.stringify(r.diff, null, 2) : "—"}
                    </pre>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">المجموع: {data?.count ?? 0}</p>
      </CardContent>
    </Card>
  );
}
