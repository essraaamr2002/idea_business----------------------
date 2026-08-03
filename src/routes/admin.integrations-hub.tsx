import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listIntegrationConfigs, saveIntegrationConfig, testIntegrationConfig, generateVapidKeys,
} from "@/lib/integrations-hub.functions";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plug, Mail, MessageSquare, Video, Brain, HardDrive, Hash, Workflow,
  BarChart3, Languages, ImagePlus, FileSignature, Calendar, KeyRound,
  PieChart, Search, Activity, Loader2, CheckCircle2, XCircle, Bell, Zap,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/integrations-hub")({ component: Page });

const ICONS: Record<string, any> = {
  email: Mail, sms: MessageSquare, video: Video, ai: Brain, storage: HardDrive,
  chat: Hash, automation: Workflow, analytics: BarChart3, translation: Languages,
  imagegen: ImagePlus, esign: FileSignature, calendar: Calendar, auth: KeyRound,
  bi: PieChart, search: Search, monitoring: Activity, push: Bell,
};

const CATEGORY_LABEL: Record<string, string> = {
  email: "البريد", sms: "الرسائل النصية", video: "مكالمات فيديو", ai: "ذكاء اصطناعي",
  storage: "تخزين", chat: "دردشة", automation: "أتمتة", analytics: "تحليلات",
  translation: "ترجمة", imagegen: "توليد صور", esign: "توقيع إلكتروني",
  calendar: "تقويم", auth: "مصادقة", bi: "تقارير", search: "بحث", monitoring: "مراقبة",
  push: "إشعارات",
};

function Page() {
  const list = useServerFn(listIntegrationConfigs);
  const save = useServerFn(saveIntegrationConfig);
  const test = useServerFn(testIntegrationConfig);
  const genVapid = useServerFn(generateVapidKeys);
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["integration-configs"],
    queryFn: () => list(),
  });

  const toggleM = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => save({ data: v }),
    onSuccess: () => { toast.success("تم الحفظ"); qc.invalidateQueries({ queryKey: ["integration-configs"] }); },
  });
  const testM = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (r: any) => { r?.ok ? toast.success("الاتصال ناجح") : toast.error(r?.message ?? "فشل الاختبار"); qc.invalidateQueries({ queryKey: ["integration-configs"] }); },
  });
  const vapidM = useMutation({
    mutationFn: () => genVapid(),
    onSuccess: (r: any) => { toast.success("تم توليد مفاتيح VAPID"); qc.invalidateQueries({ queryKey: ["integration-configs"] }); },
  });

  const grouped = (items as any[]).reduce<Record<string, any[]>>((acc, it) => {
    (acc[it.category] ??= []).push(it);
    return acc;
  }, {});

  return (
    <AdminPageShell
      title="مركز الخدمات المدمجة (Self-Hosted Hub)"
      description="إعدادات الخدمات مفتوحة المصدر التي يمكن نشرها على VPS الخاص بك"
      icon={Plug}
      actions={
        <Button size="sm" onClick={() => vapidM.mutate()} disabled={vapidM.isPending}>
          {vapidM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          توليد مفاتيح VAPID للإشعارات
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        Object.entries(grouped).map(([cat, list]) => {
          const Icon = ICONS[cat] || Plug;
          return (
            <div key={cat} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold">{CATEGORY_LABEL[cat] ?? cat}</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {list.map((it: any) => (
                  <IntegrationCard
                    key={it.id}
                    item={it}
                    onToggle={(enabled) => toggleM.mutate({ id: it.id, enabled })}
                    onTest={() => testM.mutate(it.id)}
                    onSave={(config) => save({ data: { id: it.id, config } }).then(() => { toast.success("تم حفظ الإعدادات"); qc.invalidateQueries({ queryKey: ["integration-configs"] }); })}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </AdminPageShell>
  );
}

function IntegrationCard({ item, onToggle, onTest, onSave }: { item: any; onToggle: (v: boolean) => void; onTest: () => void; onSave: (config: any) => void }) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<any>(item.config ?? {});
  return (
    <Card className="relative">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-bold">{item.name_ar}</div>
            <code className="text-[10px] text-muted-foreground">{item.id}</code>
          </div>
          <Switch checked={!!item.enabled} onCheckedChange={onToggle} />
        </div>
        {item.last_tested_at && (
          <div className="flex items-center gap-1 text-xs">
            {item.last_test_ok ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-destructive" />}
            <span className="text-muted-foreground truncate">{item.last_test_message}</span>
          </div>
        )}
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex-1">إعدادات</Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>{item.name_ar}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>عنوان URL / Endpoint</Label>
                  <Input value={config.url ?? ""} onChange={(e) => setConfig({ ...config, url: e.target.value })} placeholder="https://your-server.com" />
                </div>
                <div>
                  <Label>API Key / Token (اختياري)</Label>
                  <Input type="password" value={config.apiKey ?? ""} onChange={(e) => setConfig({ ...config, apiKey: e.target.value })} placeholder="••••••••" />
                </div>
                <div>
                  <Label>إعدادات إضافية (JSON)</Label>
                  <Textarea
                    rows={4}
                    value={JSON.stringify(config.extra ?? {}, null, 2)}
                    onChange={(e) => {
                      try { setConfig({ ...config, extra: JSON.parse(e.target.value || "{}") }); } catch {}
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => { onSave(config); setOpen(false); }} className="flex-1">حفظ</Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="ghost" onClick={onTest}>اختبار</Button>
        </div>
      </CardContent>
    </Card>
  );
}
