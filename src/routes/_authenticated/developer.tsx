// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Key, Webhook, Bell, Trash2, Plus, Copy, Code2 } from "lucide-react";
import {
  createApiKey, listMyApiKeys, revokeApiKey,
  createWebhook, listMyWebhooks,
  createPriceAlert, listMyPriceAlerts, deletePriceAlert,
} from "@/lib/tech-features.functions";

export const Route = createFileRoute("/_authenticated/developer")({
  component: DeveloperSettings,
});

function DeveloperSettings() {
  return (
    <div dir="rtl" className="container max-w-5xl py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold flex items-center gap-2"><Code2 className="h-7 w-7" /> إعدادات المطوّر</h1>
        <p className="text-muted-foreground">مفاتيح API، Webhooks، وتنبيهات الأسعار اللحظية.</p>
      </header>
      <ApiKeysSection />
      <WebhooksSection />
      <PriceAlertsSection />
    </div>
  );
}

function ApiKeysSection() {
  const create = useServerFn(createApiKey);
  const list = useServerFn(listMyApiKeys);
  const revoke = useServerFn(revokeApiKey);
  const [keys, setKeys] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const refresh = () => list().then(setKeys).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const onCreate = async () => {
    if (!name) return toast.error("أدخل اسم المفتاح");
    try {
      const r = await create({ data: { name } });
      setNewKey(r.key);
      setName("");
      refresh();
    } catch (e: any) { toast.error(e?.message || "فشل"); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> مفاتيح API</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المفتاح (مثل: تطبيق الجوال)" />
          <Button onClick={onCreate}><Plus className="h-4 w-4 me-1" /> إنشاء</Button>
        </div>
        {newKey && (
          <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-3 dark:bg-amber-950/20">
            <div className="text-xs font-bold text-amber-700 mb-1">⚠️ احفظ هذا المفتاح الآن — لن يظهر مرة أخرى:</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs break-all bg-white p-2 rounded">{newKey}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); toast.success("تم النسخ"); }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-bold">{k.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{k.prefix}…</div>
                <div className="flex gap-1 mt-1">{k.scopes?.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
              </div>
              {!k.revoked_at && (
                <Button size="sm" variant="destructive" onClick={async () => { await revoke({ data: { id: k.id } }); refresh(); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
              {k.revoked_at && <Badge variant="outline">ملغى</Badge>}
            </div>
          ))}
          {keys.length === 0 && <p className="text-sm text-muted-foreground">لا توجد مفاتيح بعد.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function WebhooksSection() {
  const create = useServerFn(createWebhook);
  const list = useServerFn(listMyWebhooks);
  const [hooks, setHooks] = useState<any[]>([]);
  const [url, setUrl] = useState("");
  const refresh = () => list().then(setHooks).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const onCreate = async () => {
    if (!/^https?:\/\//.test(url)) return toast.error("URL غير صالح");
    try { await create({ data: { url } }); setUrl(""); refresh(); toast.success("تم إضافة Webhook"); }
    catch (e: any) { toast.error(e?.message); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" /> Webhooks</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhook" />
          <Button onClick={onCreate}><Plus className="h-4 w-4 me-1" /> إضافة</Button>
        </div>
        {hooks.map((h) => (
          <div key={h.id} className="rounded border p-3">
            <div className="font-mono text-xs break-all">{h.url}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Secret: {h.secret.slice(0, 20)}…</div>
          </div>
        ))}
        {hooks.length === 0 && <p className="text-sm text-muted-foreground">لا توجد Webhooks.</p>}
      </CardContent>
    </Card>
  );
}

function PriceAlertsSection() {
  const create = useServerFn(createPriceAlert);
  const list = useServerFn(listMyPriceAlerts);
  const del = useServerFn(deletePriceAlert);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [cond, setCond] = useState<"above" | "below" | "change_pct">("above");
  const [threshold, setThreshold] = useState("");
  const refresh = () => list().then(setAlerts).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const onCreate = async () => {
    const n = Number(threshold);
    if (!n || n <= 0) return toast.error("أدخل عتبة صحيحة");
    try { await create({ data: { condition: cond, threshold: n } }); setThreshold(""); refresh(); toast.success("تم إنشاء التنبيه"); }
    catch (e: any) { toast.error(e?.message); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> تنبيهات الأسعار اللحظية</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <select value={cond} onChange={(e) => setCond(e.target.value as any)} className="rounded border px-3 py-2 bg-background">
            <option value="above">أعلى من</option>
            <option value="below">أقل من</option>
            <option value="change_pct">تغيّر ٪</option>
          </select>
          <Input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="القيمة / النسبة" className="flex-1" />
          <Button onClick={onCreate}><Plus className="h-4 w-4 me-1" /> إنشاء</Button>
        </div>
        {alerts.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <Badge>{a.condition}</Badge> <span className="font-bold">{a.threshold}</span>
              <span className="text-xs text-muted-foreground ms-2">تم التشغيل {a.triggered_count} مرة</span>
            </div>
            <Button size="sm" variant="ghost" onClick={async () => { await del({ data: { id: a.id } }); refresh(); }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {alerts.length === 0 && <p className="text-sm text-muted-foreground">لا توجد تنبيهات.</p>}
      </CardContent>
    </Card>
  );
}
