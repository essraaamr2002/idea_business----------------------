import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/billing/manage")({
  head: () => ({ meta: [{ title: "إدارة الاشتراك — IDEA BUSINESS" }] }),
  component: ManagePage,
});

const K = "billing_state_v1";
type State = { autoRenew: boolean; paused: boolean; pauseUntil?: string };
const load = (): State => { try { return JSON.parse(localStorage.getItem(K) || "{}") } catch { return {} as any } };
const save = (s: State) => localStorage.setItem(K, JSON.stringify(s));

function ManagePage() {
  const [s, setS] = useState<State>({ autoRenew: true, paused: false });
  useEffect(() => { const d = load(); setS({ autoRenew: d.autoRenew ?? true, paused: d.paused ?? false, pauseUntil: d.pauseUntil }); }, []);
  const update = (p: Partial<State>) => { const ns = { ...s, ...p }; setS(ns); save(ns); };
  const pause = (months: number) => { const d = new Date(); d.setMonth(d.getMonth() + months); update({ paused: true, pauseUntil: d.toISOString() }); toast.success(`تم إيقاف الاشتراك مؤقتاً ${months} شهر`); };
  const refund = () => { update({ paused: false, autoRenew: false }); toast.success("تم تقديم طلب استرداد ذكي، سيتم رد المبلغ النسبي خلال 5 أيام عمل"); };
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 space-y-6">
      <h1 className="text-3xl font-black">إدارة الاشتراك</h1>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5" /> التجديد التلقائي الذكي</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">سنذكرك قبل 7 أيام من التجديد، ونقترح خطة أنسب إذا تغير استخدامك.</div>
          <Switch checked={s.autoRenew} onCheckedChange={(v) => update({ autoRenew: v })} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Pause className="h-5 w-5" /> أوقف بدلاً من الإلغاء</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {s.paused ? (
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div className="text-sm">الاشتراك متوقف حتى <Badge variant="secondary">{new Date(s.pauseUntil!).toLocaleDateString("ar")}</Badge></div>
              <Button size="sm" variant="outline" onClick={() => { update({ paused: false, pauseUntil: undefined }); toast.success("تم استئناف الاشتراك"); }}><Play className="h-4 w-4 me-1" />استئناف</Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => pause(1)}>إيقاف شهر</Button>
              <Button variant="outline" onClick={() => pause(2)}>إيقاف شهرين</Button>
              <Button variant="outline" onClick={() => pause(3)}>إيقاف 3 أشهر</Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> الاسترداد الذكي عند الإلغاء</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">إذا قررت الإلغاء، نسترد لك المبلغ النسبي عن الأيام غير المستخدمة تلقائياً.</p>
          <Button variant="destructive" onClick={refund}>طلب إلغاء + استرداد ذكي</Button>
        </CardContent>
      </Card>
    </div>
  );
}
