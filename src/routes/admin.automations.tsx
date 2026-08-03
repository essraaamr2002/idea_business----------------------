import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listAutomations, upsertAutomation, deleteAutomation } from "@/lib/admin-pro.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Zap, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/automations")({ component: Page });

const TRIGGERS = [
  { v: "user.created", l: "مستخدم جديد" },
  { v: "project.created", l: "مشروع جديد" },
  { v: "order.created", l: "طلب جديد" },
  { v: "kyc.submitted", l: "طلب توثيق KYC" },
  { v: "payout.requested", l: "طلب سحب" },
  { v: "dispute.opened", l: "نزاع جديد" },
];

const ACTIONS = [
  { v: "send_sms", l: "إرسال SMS" },
  { v: "send_email", l: "إرسال بريد إلكتروني" },
  { v: "crm_create_contact", l: "إنشاء جهة اتصال في CRM" },
  { v: "slack_notify", l: "إشعار في Slack" },
  { v: "inapp_notify", l: "إشعار داخل التطبيق" },
  { v: "webhook", l: "استدعاء Webhook مخصص" },
];

function Page() {
  const list = useServerFn(listAutomations);
  const upsert = useServerFn(upsertAutomation);
  const del = useServerFn(deleteAutomation);
  const qc = useQueryClient();
  const { data: rules = [] } = useQuery({ queryKey: ["automations"], queryFn: () => list() });
  const saveM = useMutation({ mutationFn: (d: any) => upsert(d), onSuccess: () => { toast.success("تم"); qc.invalidateQueries({ queryKey: ["automations"] }); } });
  const delM = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { toast.success("حُذف"); qc.invalidateQueries({ queryKey: ["automations"] }); } });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">منشئ الأتمتة</h1>
            <p className="text-sm text-muted-foreground">قواعد "متى → افعل" تربط أحداث المنصة بالموفّرين الخارجيين.</p>
          </div>
        </div>
        <Button onClick={() => { setEditing({ name: "", trigger_event: "user.created", actions: [{ type: "inapp_notify", config: { message: "" } }], enabled: true }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> قاعدة جديدة
        </Button>
      </div>

      <div className="grid gap-3">
        {rules.length === 0 && <Card><CardContent className="p-12 text-center text-muted-foreground">لا توجد قواعد بعد.</CardContent></Card>}
        {(rules as any[]).map((r) => (
          <Card key={r.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{r.name}</CardTitle>
                <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
                  <Badge variant="outline">عند: {TRIGGERS.find((t) => t.v === r.trigger_event)?.l ?? r.trigger_event}</Badge>
                  <Badge variant="secondary">{r.actions?.length ?? 0} إجراء</Badge>
                  <span>عدد التنفيذ: {r.run_count}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={r.enabled} onCheckedChange={(v) => saveM.mutate({ ...r, enabled: v })} />
                <Button size="icon" variant="ghost" onClick={() => confirm("حذف؟") && delM.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? "تعديل قاعدة" : "قاعدة جديدة"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>اسم القاعدة</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div>
                <Label>المحفّز (متى)</Label>
                <Select value={editing.trigger_event} onValueChange={(v) => setEditing({ ...editing, trigger_event: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>الإجراء (افعل)</Label>
                <Select value={editing.actions?.[0]?.type ?? "inapp_notify"} onValueChange={(v) => setEditing({ ...editing, actions: [{ type: v, config: editing.actions?.[0]?.config ?? {} }] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTIONS.map((a) => <SelectItem key={a.v} value={a.v}>{a.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>نص الرسالة / المحتوى</Label><Input value={editing.actions?.[0]?.config?.message ?? ""} onChange={(e) => setEditing({ ...editing, actions: [{ ...editing.actions[0], config: { ...editing.actions[0].config, message: e.target.value } }] })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => { saveM.mutate(editing); setOpen(false); }}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
