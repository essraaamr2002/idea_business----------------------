import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  listAdminProjects, setProjectStatus, deleteProject,
  listAdminOffers, cancelOffer,
  listAdminShareOrders,
  listGuarantees,
} from "@/lib/admin-projects.functions";

export const Route = createFileRoute("/admin/projects")({
  component: ProjectsAdmin,
});

const PROJECT_STATUSES = ["draft", "pending_review", "active", "halted", "closed"] as const;

function ProjectsAdmin() {
  return (
    <Tabs defaultValue="projects">
      <TabsList>
        <TabsTrigger value="projects">المشاريع</TabsTrigger>
        <TabsTrigger value="offers">عروض الاستثمار</TabsTrigger>
        <TabsTrigger value="orders">أوامر الأسهم</TabsTrigger>
        <TabsTrigger value="guarantees">الضمانات</TabsTrigger>
      </TabsList>
      <TabsContent value="projects" className="pt-4"><ProjectsTab /></TabsContent>
      <TabsContent value="offers" className="pt-4"><OffersTab /></TabsContent>
      <TabsContent value="orders" className="pt-4"><OrdersTab /></TabsContent>
      <TabsContent value="guarantees" className="pt-4"><GuaranteesTab /></TabsContent>
    </Tabs>
  );
}

function ProjectsTab() {
  const qc = useQueryClient();
  const list = useServerFn(listAdminProjects);
  const [status, setStatus] = useState<string>("all");
  const [query, setQuery] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "projects", status, query],
    queryFn: () => list({ data: { status: status === "all" ? undefined : (status as any), query: query || undefined, limit: 100 } }),
  });

  return (
    <Card>
      <CardHeader><CardTitle>المشاريع</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="بحث بالاسم أو الرمز" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الرمز</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الأسهم</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>القطاع</TableHead>
                <TableHead className="text-end">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">…</TableCell></TableRow>}
              {!isLoading && (data?.rows ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">لا توجد نتائج</TableCell></TableRow>}
              {(data?.rows ?? []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs">{p.ticker || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                  <TableCell className="text-xs">{p.shares_sold}/{p.shares_total}</TableCell>
                  <TableCell className="text-xs">{Number(p.current_price).toFixed(2)} {p.currency}</TableCell>
                  <TableCell className="text-xs">{p.sector || "—"}</TableCell>
                  <TableCell className="text-end space-x-1 space-x-reverse">
                    <ProjectActions project={p} onDone={() => qc.invalidateQueries({ queryKey: ["admin", "projects"] })} />
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

function ProjectActions({ project, onDone }: { project: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(project.status);
  const [reason, setReason] = useState("");
  const setSt = useServerFn(setProjectStatus);
  const del = useServerFn(deleteProject);
  const update = useMutation({
    mutationFn: () => setSt({ data: { projectId: project.id, status, reason } }),
    onSuccess: () => { toast.success("تم التحديث"); setOpen(false); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => del({ data: { projectId: project.id, reason } }),
    onSuccess: () => { toast.success("تم الحذف"); setOpen(false); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">إدارة</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{project.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>الحالة</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>السبب (إلزامي)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="destructive" disabled={reason.length < 3 || remove.isPending} onClick={() => remove.mutate()}>حذف</Button>
          <Button disabled={reason.length < 3 || update.isPending} onClick={() => update.mutate()}>حفظ الحالة</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OffersTab() {
  const qc = useQueryClient();
  const list = useServerFn(listAdminOffers);
  const [status, setStatus] = useState<string>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "offers", status],
    queryFn: () => list({ data: { status: status === "all" ? undefined : status, limit: 200 } }),
  });
  const cancel = useServerFn(cancelOffer);
  const m = useMutation({
    mutationFn: (vars: { id: string; reason: string }) => cancel({ data: { offerId: vars.id, reason: vars.reason } }),
    onSuccess: () => { toast.success("ألغي العرض"); qc.invalidateQueries({ queryKey: ["admin", "offers"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle>عروض الاستثمار</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {["pending", "accepted", "rejected", "countered", "withdrawn", "expired"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>المشروع</TableHead><TableHead>المستثمر</TableHead><TableHead>المبلغ</TableHead>
              <TableHead>أسهم</TableHead><TableHead>الحالة</TableHead><TableHead className="text-end">إجراءات</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">…</TableCell></TableRow>}
              {(data ?? []).map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.project_id.slice(0, 8)}</TableCell>
                  <TableCell className="font-mono text-xs">{o.investor_id.slice(0, 8)}</TableCell>
                  <TableCell>{Number(o.amount).toFixed(2)} {o.currency}</TableCell>
                  <TableCell>{o.shares} × {Number(o.price_per_share).toFixed(2)}</TableCell>
                  <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                  <TableCell className="text-end">
                    {["pending", "countered"].includes(o.status) && (
                      <Button size="sm" variant="destructive" onClick={() => {
                        const reason = prompt("سبب الإلغاء");
                        if (reason && reason.length >= 3) m.mutate({ id: o.id, reason });
                      }}>إلغاء</Button>
                    )}
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

function OrdersTab() {
  const list = useServerFn(listAdminShareOrders);
  const [status, setStatus] = useState<string>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "share_orders", status],
    queryFn: () => list({ data: { status: status === "all" ? undefined : status, limit: 200 } }),
  });
  return (
    <Card>
      <CardHeader><CardTitle>أوامر الأسهم</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {["open", "filled", "cancelled", "partial"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>المشروع</TableHead><TableHead>المستخدم</TableHead><TableHead>الجهة</TableHead>
              <TableHead>أسهم</TableHead><TableHead>السعر</TableHead><TableHead>منفذ</TableHead><TableHead>الحالة</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">…</TableCell></TableRow>}
              {(data ?? []).map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.project_id.slice(0, 8)}</TableCell>
                  <TableCell className="font-mono text-xs">{o.user_id.slice(0, 8)}</TableCell>
                  <TableCell><Badge variant={o.side === "buy" ? "default" : "secondary"}>{o.side}</Badge></TableCell>
                  <TableCell>{o.shares}</TableCell>
                  <TableCell>{Number(o.price).toFixed(2)}</TableCell>
                  <TableCell>{o.filled}</TableCell>
                  <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function GuaranteesTab() {
  const list = useServerFn(listGuarantees);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "guarantees"],
    queryFn: () => list({ data: {} }),
  });
  return (
    <Card>
      <CardHeader><CardTitle>ضمانات المشاريع</CardTitle></CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground">…</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {(data ?? []).map((g: any) => (
            <div key={g.id} className="rounded-lg border p-4 space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <strong>{g.guarantee_type}</strong>
                <span className="font-mono text-xs">{g.project_id.slice(0, 8)}</span>
              </div>
              <p>الكفيل: {g.guarantor_name || "—"} ({g.guarantor_phone || "—"})</p>
              <p>المستفيد: {g.signed_to_name || "—"}</p>
              <p>القيمة: {g.amount ? Number(g.amount).toFixed(2) : "—"}</p>
              {g.document_url && <a className="text-primary underline text-xs" href={g.document_url} target="_blank" rel="noreferrer">المستند</a>}
              {g.notes && <p className="text-xs text-muted-foreground">{g.notes}</p>}
            </div>
          ))}
          {!isLoading && (data ?? []).length === 0 && <p className="text-muted-foreground">لا توجد ضمانات.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
