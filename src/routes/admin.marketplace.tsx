import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Plug, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listMarketplaceProviders,
  saveProviderConfig,
  disconnectProvider,
  testProviderConnection,
} from "@/lib/marketplace.functions";

export const Route = createFileRoute("/admin/marketplace")({
  ssr: false,
  component: MarketplacePage,
  head: () => ({ meta: [{ title: "سوق التكاملات — لوحة الإدارة" }] }),
});

type FieldDef = { key: string; label: string; type: "text" | "password" | "select"; required?: boolean; options?: string[] };
type Provider = { id: string; slug: string; category: string; name: string; description?: string; logo_url?: string; docs_url?: string; config_schema: FieldDef[]; requires_oauth: boolean };
type Config = { id: string; provider_id: string; credentials: Record<string, string>; settings: Record<string, any>; status: "connected" | "disconnected" | "error"; last_verified_at?: string; last_error?: string };

const CATEGORY_LABEL: Record<string, string> = {
  payment: "بوابات الدفع",
  whatsapp: "واتساب",
  sms: "SMS",
  email: "البريد",
  seo: "SEO",
  shipping: "الشحن",
  cms: "المحتوى (CMS)",
  other: "أخرى",
};

function MarketplacePage() {
  const router = useRouter();
  const list = useServerFn(listMarketplaceProviders);
  const save = useServerFn(saveProviderConfig);
  const disconnect = useServerFn(disconnectProvider);
  const test = useServerFn(testProviderConnection);

  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [active, setActive] = useState<Provider | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await list();
      setProviders((res.providers as any) ?? []);
      setConfigs((res.configs as any) ?? []);
    } catch (e: any) { toast.error(e?.message ?? "فشل التحميل"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const byCategory = useMemo(() => {
    const g: Record<string, Provider[]> = {};
    for (const p of providers) (g[p.category] ??= []).push(p);
    return g;
  }, [providers]);

  const configFor = (id: string) => configs.find((c) => c.provider_id === id);

  const openProvider = (p: Provider) => {
    setActive(p);
    const existing = configFor(p.id);
    setForm(existing?.credentials ?? {});
  };

  const submit = async () => {
    if (!active) return;
    for (const f of active.config_schema) {
      if (f.required && !form[f.key]) return toast.error(`الحقل مطلوب: ${f.label}`);
    }
    setBusy(true);
    try {
      await save({ data: { provider_id: active.id, credentials: form } });
      const r = await test({ data: { provider_id: active.id } });
      toast[r.ok ? "success" : "warning"](r.message ?? (r.ok ? "تم الاتصال" : "تعذر التحقق"));
      await load();
      setActive(null);
    } catch (e: any) { toast.error(e?.message ?? "فشل الحفظ"); }
    setBusy(false);
  };

  const doDisconnect = async (cfgId: string) => {
    setBusy(true);
    try { await disconnect({ data: { config_id: cfgId } }); toast.success("تم الفصل"); await load(); }
    catch (e: any) { toast.error(e?.message ?? "فشل الفصل"); }
    setBusy(false);
  };

  const doTest = async (id: string) => {
    setBusy(true);
    try { const r = await test({ data: { provider_id: id } }); toast[r.ok ? "success" : "error"](r.message); await load(); }
    catch (e: any) { toast.error(e?.message); }
    setBusy(false);
  };

  return (
    <div dir="rtl" className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Plug className="h-6 w-6" /> سوق مزودي الخدمات والتكاملات</h1>
          <p className="text-muted-foreground text-sm">فعّل بوابات الدفع، الواتساب، البريد، والمزيد — بدون تعديل الكود.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحديث"}</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">جارٍ التحميل…</div>
      ) : (
        <Tabs defaultValue={Object.keys(byCategory)[0] ?? "payment"}>
          <TabsList className="flex-wrap">
            {Object.keys(byCategory).map((c) => (
              <TabsTrigger key={c} value={c}>{CATEGORY_LABEL[c] ?? c} ({byCategory[c].length})</TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(byCategory).map(([cat, items]) => (
            <TabsContent key={cat} value={cat}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => {
                  const cfg = configFor(p.id);
                  const status = cfg?.status ?? "disconnected";
                  return (
                    <Card key={p.id} className="relative">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg">{p.name}</CardTitle>
                          <Badge variant={status === "connected" ? "default" : status === "error" ? "destructive" : "secondary"}>
                            {status === "connected" ? <><CheckCircle2 className="h-3 w-3 me-1" />متصل</> : status === "error" ? <><XCircle className="h-3 w-3 me-1" />خطأ</> : "غير مفعّل"}
                          </Badge>
                        </div>
                        <CardDescription>{p.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {cfg?.last_error && <p className="text-xs text-destructive">{cfg.last_error}</p>}
                        {cfg?.last_verified_at && <p className="text-xs text-muted-foreground">آخر تحقق: {new Date(cfg.last_verified_at).toLocaleString("ar")}</p>}
                        <div className="flex gap-2 pt-2 flex-wrap">
                          <Button size="sm" onClick={() => openProvider(p)}>{cfg ? "تعديل" : "تفعيل"}</Button>
                          {cfg && <Button size="sm" variant="outline" onClick={() => doTest(p.id)} disabled={busy}>اختبار</Button>}
                          {cfg && cfg.status === "connected" && <Button size="sm" variant="ghost" onClick={() => doDisconnect(cfg.id)} disabled={busy}>فصل</Button>}
                          {p.docs_url && <a href={p.docs_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary self-center underline">التوثيق</a>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>إعداد {active?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {active?.config_schema.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                {f.type === "select" ? (
                  <select className="w-full border rounded p-2 bg-background" value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                    <option value="">—</option>
                    {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <Input type={f.type} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">🔐 البيانات تُخزَّن مشفّرة وتُقرأ فقط من الخادم.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)} disabled={busy}>إلغاء</Button>
            <Button onClick={submit} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ واختبار"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
