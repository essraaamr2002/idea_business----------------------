import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { listDisputes, updateDispute } from "@/lib/admin-moderation.functions";

export const Route = createFileRoute("/admin/disputes")({
  component: DisputesBoard,
});

const COLUMNS = [
  { key: "open", title: "مفتوحة" },
  { key: "in_review", title: "قيد المراجعة" },
  { key: "lawyer_assigned", title: "بمحامي" },
  { key: "resolved", title: "محلولة" },
  { key: "escalated", title: "مصعّدة" },
  { key: "closed", title: "مغلقة" },
] as const;

function DisputesBoard() {
  const qc = useQueryClient();
  const list = useServerFn(listDisputes);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "disputes"],
    queryFn: () => list(),
  });

  const grouped: Record<string, any[]> = {};
  for (const c of COLUMNS) grouped[c.key] = [];
  for (const d of (data ?? []) as any[]) (grouped[d.status] ||= []).push(d);

  return (
    <Card>
      <CardHeader><CardTitle>النزاعات والقضايا (لوحة كانبان)</CardTitle></CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground">…</p>}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {COLUMNS.map((c) => (
            <div key={c.key} className="rounded-lg border bg-muted/40 p-3 space-y-2 min-h-[200px]">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{c.title}</h3>
                <Badge variant="secondary">{grouped[c.key].length}</Badge>
              </div>
              {grouped[c.key].map((d) => (
                <DisputeCard key={d.id} d={d} onDone={() => qc.invalidateQueries({ queryKey: ["admin", "disputes"] })} />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DisputeCard({ d, onDone }: { d: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(d.status);
  const [lawyerName, setLawyerName] = useState(d.lawyer_name ?? "");
  const [lawyerCountry, setLawyerCountry] = useState(d.lawyer_country ?? "");
  const [resolution, setResolution] = useState(d.resolution ?? "");
  const [feePaid, setFeePaid] = useState<boolean>(!!d.fee_paid);
  const [reason, setReason] = useState("");
  const update = useServerFn(updateDispute);
  const m = useMutation({
    mutationFn: () => update({
      data: {
        disputeId: d.id, status, lawyerName: lawyerName || null,
        lawyerCountry: lawyerCountry || null, resolution: resolution || null,
        feePaid, reason,
      },
    }),
    onSuccess: () => { toast.success("تم التحديث"); setOpen(false); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full rounded border bg-background p-2 text-start text-xs hover:bg-accent">
          <p className="font-medium truncate">{d.reason}</p>
          <p className="text-muted-foreground font-mono text-[10px]">{d.project_id.slice(0, 8)} • {d.fee_amount} {d.fee_currency} {d.fee_paid ? "✓" : ""}</p>
          {d.lawyer_name && <p className="text-muted-foreground">⚖ {d.lawyer_name}</p>}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>إدارة النزاع</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm">{d.reason}</p>
          <div>
            <Label>الحالة</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>اسم المحامي</Label><Input value={lawyerName} onChange={(e) => setLawyerName(e.target.value)} /></div>
            <div><Label>دولة المحامي</Label><Input value={lawyerCountry} onChange={(e) => setLawyerCountry(e.target.value)} /></div>
          </div>
          <div>
            <Label>القرار/الملاحظات</Label>
            <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} maxLength={2000} rows={4} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={feePaid} onChange={(e) => setFeePaid(e.target.checked)} />
            تم دفع رسوم النزاع
          </label>
          <div>
            <Label>سبب التعديل (إلزامي)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={reason.length < 3 || m.isPending} onClick={() => m.mutate()}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
