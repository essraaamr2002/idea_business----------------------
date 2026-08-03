import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listIntegrations, toggleIntegration, testIntegration, listIntegrationLogs } from "@/lib/admin-pro.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plug, MessageSquare, Mail, Users, Hash, HardDrive, BarChart3, CheckCircle2, XCircle, AlertCircle, FlaskConical } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/integrations")({ component: Page });

const ICONS: Record<string, any> = { sms: MessageSquare, email: Mail, crm: Users, chat: Hash, storage: HardDrive, analytics: BarChart3 };
const CAT_LABEL: Record<string, string> = { sms: "الرسائل النصية و WhatsApp", email: "البريد الإلكتروني", crm: "إدارة علاقات العملاء (CRM)", chat: "المحادثات والإشعارات", storage: "التخزين السحابي", analytics: "التحليلات و SEO" };

function Page() {
  const list = useServerFn(listIntegrations);
  const toggle = useServerFn(toggleIntegration);
  const test = useServerFn(testIntegration);
  const logs = useServerFn(listIntegrationLogs);
  const qc = useQueryClient();
  const [recipient, setRecipient] = useState("");

  const { data: items = [] } = useQuery({ queryKey: ["integrations"], queryFn: () => list() });
  const { data: recentLogs = [] } = useQuery({ queryKey: ["int-logs"], queryFn: () => logs({ data: { limit: 20 } }) });

  const toggleM = useMutation({
    mutationFn: (v: { provider: string; enabled: boolean }) => toggle({ data: v }),
    onSuccess: () => { toast.success("تم التحديث"); qc.invalidateQueries({ queryKey: ["integrations"] }); },
  });
  const testM = useMutation({
    mutationFn: (provider: string) => test({ data: { provider, recipient, message: "رسالة اختبار من لوحة الإدارة" } }),
    onSuccess: (r: any) => { r?.ok ? toast.success("نجح الاختبار") : toast.error(r?.error ?? "فشل الاختبار"); qc.invalidateQueries({ queryKey: ["int-logs"] }); qc.invalidateQueries({ queryKey: ["integrations"] }); },
  });

  const grouped = (items as any[]).reduce<Record<string, any[]>>((acc, it) => { (acc[it.category] ??= []).push(it); return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Plug className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">مركز التكاملات الخارجية</h1>
          <p className="text-sm text-muted-foreground">رسائل SMS، بريد، CRM، Slack، تخزين، تحليلات — كل ذلك من مكان واحد.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">اختبار سريع</CardTitle></CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <Input placeholder="رقم المستلم للاختبار (مثل +9665xxxxxxxx)" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          <span className="text-xs text-muted-foreground self-center">يستخدم عند اختبار موفّر SMS/WhatsApp</span>
        </CardContent>
      </Card>

      {Object.entries(grouped).map(([cat, list]) => {
        const Icon = ICONS[cat] ?? Plug;
        return (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon className="h-5 w-5 text-primary" /> {CAT_LABEL[cat] ?? cat}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((it: any) => (
                <div key={it.provider} className="border rounded-lg p-4 flex flex-col gap-3 bg-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{it.display_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{it.provider}</div>
                    </div>
                    <Switch checked={it.enabled} onCheckedChange={(v) => toggleM.mutate({ provider: it.provider, enabled: v })} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {it.enabled ? <Badge variant="default">مفعّل</Badge> : <Badge variant="secondary">معطّل</Badge>}
                    {it.last_test_status === "success" && <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />آخر اختبار: نجح</Badge>}
                    {it.last_test_status === "error" && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />آخر اختبار: فشل</Badge>}
                    {!it.last_test_status && <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />لم يُختبر بعد</Badge>}
                  </div>
                  {it.last_test_error && <p className="text-xs text-destructive line-clamp-2">{it.last_test_error}</p>}
                  <Button size="sm" variant="outline" disabled={testM.isPending} onClick={() => testM.mutate(it.provider)}>
                    <FlaskConical className="h-3.5 w-3.5 mr-1" /> اختبار الآن
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader><CardTitle className="text-base">آخر 20 عملية تكامل</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(recentLogs as any[]).length === 0 && <p className="text-sm text-muted-foreground">لا توجد عمليات بعد.</p>}
            {(recentLogs as any[]).map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm border-b pb-2">
                <div className="flex items-center gap-2">
                  {l.status === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="font-mono">{l.provider}</span>
                  <span className="text-muted-foreground">{l.action}</span>
                  {l.recipient && <span className="text-xs text-muted-foreground">→ {l.recipient}</span>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("ar")}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
