import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { CreditCard, ExternalLink, Users, Infinity as Inf, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/subscriptions")({
  component: SubsPage,
});

function fmtCap(n: number) { return n < 0 ? "∞" : Number(n).toLocaleString("ar"); }

function SubsPage() {
  const { data: plans = [] } = useQuery({
    queryKey: ["admin-membership-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["admin-membership-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("membership", { count: "exact" });
      if (error) throw error;
      const out: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { out[r.membership] = (out[r.membership] ?? 0) + 1; });
      return out;
    },
  });

  const totalPaid = (plans as any[]).reduce((sum, p) => sum + (p.price_sar > 0 ? (counts[p.tier] ?? 0) * Number(p.price_sar) : 0), 0);
  const totalSubs = Object.values(counts).reduce((a: number, b: any) => a + Number(b), 0);

  return (
    <AdminPageShell
      title="الاشتراكات والباقات"
      description="الباقات الأربع · المشتركون · الإيراد الشهري المتكرر"
      icon={CreditCard}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link to="/membership"><ExternalLink className="h-4 w-4 me-1.5" /> صفحة العضوية</Link>
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="MRR (ر.س)" value={totalPaid.toLocaleString("ar")} hint="Monthly Recurring Revenue" />
        <StatCard label="ARR (ر.س)" value={(totalPaid * 12).toLocaleString("ar")} hint="Annual Recurring Revenue" />
        <StatCard label="إجمالي الأعضاء" value={Number(totalSubs).toLocaleString("ar")} hint="جميع الباقات بما فيها المجانية" />
        <StatCard label="عدد الباقات النشطة" value={(plans as any[]).filter(p => p.active).length} hint="من جدول membership_plans" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {(plans as any[]).map((p) => {
          const subs = counts[p.tier] ?? 0;
          const mrr = subs * Number(p.price_sar || 0);
          return (
            <Card key={p.tier} className={p.tier === "gold" ? "border-primary/40" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{p.name_ar}</span>
                  {p.active ? <Badge variant="default">مفعّلة</Badge> : <Badge variant="secondary">موقوفة</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-bold tabular-nums">
                  {p.price_sar > 0 ? <>{Number(p.price_sar).toLocaleString("ar")} <span className="text-xs text-muted-foreground">ر.س / شهر</span></> : "مجاني"}
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> <span className="tabular-nums">{subs.toLocaleString("ar")}</span> مشترك
                  {mrr > 0 && <span className="ms-auto font-bold text-foreground">{mrr.toLocaleString("ar")} ر.س MRR</span>}
                </div>

                <ul className="space-y-1 text-[11px] text-muted-foreground">
                  <li>مشاريع: <b className="text-foreground tabular-nums">{fmtCap(p.projects_cap)}</b></li>
                  <li>إعجابات: <b className="text-foreground tabular-nums">{fmtCap(p.likes_cap)}</b></li>
                  <li>تعليقات: <b className="text-foreground tabular-nums">{fmtCap(p.comments_cap)}</b></li>
                  <li>أخرى: <b className="text-foreground tabular-nums">{fmtCap(p.other_cap)}</b></li>
                </ul>

                <div className="flex flex-wrap gap-1 text-[10px]">
                  {p.verified_badge   && <Badge variant="outline" className="gap-1"><Check className="h-3 w-3" /> صح أزرق</Badge>}
                  {p.priority_support && <Badge variant="outline" className="gap-1"><Check className="h-3 w-3" /> دعم أولوي</Badge>}
                  {p.ai_advanced      && <Badge variant="outline" className="gap-1"><Check className="h-3 w-3" /> AI متقدّم</Badge>}
                  {p.dedicated_manager&& <Badge variant="outline" className="gap-1"><Check className="h-3 w-3" /> مدير حساب</Badge>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">السقف الصارم للصلاحيات</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>كل باقة لها سقف لا يمكن لأي عضو تجاوزه — يتم التحقق على مستوى قاعدة البيانات عبر <code className="rounded bg-muted px-1">check_and_consume_quota</code>.</p>
          <p>أي محاولة لتجاوز الحد ترفع خطأ <code className="rounded bg-muted px-1">quota_exceeded</code> ويظهر للمستخدم رسالة ترقية تلقائية.</p>
          <p>تعديل الأسعار/السقوف يتم عبر جدول <code className="rounded bg-muted px-1">membership_plans</code> ويأخذ مفعوله فوراً لجميع المستخدمين.</p>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}

function StatCard({ label, value, hint }: { label: string; value: any; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
