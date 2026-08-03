import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listBroadcasts, createBroadcast, sendBroadcast } from "@/lib/admin-pro.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/broadcast")({ component: Page });

function Page() {
  const list = useServerFn(listBroadcasts);
  const create = useServerFn(createBroadcast);
  const send = useServerFn(sendBroadcast);
  const qc = useQueryClient();
  const { data: campaigns = [] } = useQuery({ queryKey: ["broadcasts"], queryFn: () => list() });

  const [form, setForm] = useState<any>({ name: "", channel: "inapp", subject: "", content: "" });

  const createM = useMutation({
    mutationFn: () => create(form),
    onSuccess: () => { toast.success("تم إنشاء الحملة"); qc.invalidateQueries({ queryKey: ["broadcasts"] }); setForm({ name: "", channel: "inapp", subject: "", content: "" }); },
  });
  const sendM = useMutation({
    mutationFn: (id: string) => send({ data: { id } }),
    onSuccess: (r: any) => { toast.success(`تم الإرسال (${r.sent ?? 0})`); qc.invalidateQueries({ queryKey: ["broadcasts"] }); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">مركز البث الجماعي</h1>
          <p className="text-sm text-muted-foreground">حملات SMS / Email / إشعارات داخل التطبيق لجميع المستخدمين أو شريحة محددة.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">حملة جديدة</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>اسم الحملة</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>القناة</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inapp">إشعار داخل التطبيق</SelectItem>
                  <SelectItem value="email">بريد إلكتروني</SelectItem>
                  <SelectItem value="sms">رسالة نصية</SelectItem>
                  <SelectItem value="push">Push Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>الموضوع / العنوان</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><Label>المحتوى</Label><Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
          <Button onClick={() => createM.mutate()} disabled={!form.name || !form.content}>إنشاء حملة</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">الحملات</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {campaigns.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد حملات بعد.</p>}
          {(campaigns as any[]).map((c) => (
            <div key={c.id} className="border rounded-lg p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                  <Badge variant="outline">{c.channel}</Badge>
                  <Badge variant={c.status === "sent" ? "default" : "secondary"}>{c.status}</Badge>
                  {c.stats?.sent != null && <span>أُرسل إلى {c.stats.sent}</span>}
                </div>
              </div>
              {c.status !== "sent" && (
                <Button size="sm" onClick={() => sendM.mutate(c.id)} disabled={sendM.isPending}>
                  <Send className="h-4 w-4 mr-1" /> إرسال الآن
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
