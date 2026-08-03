import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminStats } from "@/lib/admin-stats.functions";
import { listAuditLog } from "@/lib/admin-audit.functions";
import { getSecurityOverview } from "@/lib/security-admin.functions";
import {
  Users, FolderKanban, Wallet, BadgeCheck, ArrowDownToLine, Scale,
  MessagesSquare, Megaphone, TrendingUp, Sparkles, Coins, Activity,
  ShieldAlert, Plug, Zap, FileText, Search, Settings as SettingsIcon,
  Package, ShoppingCart, ScrollText, Target, BookOpen, KeyRound, Handshake,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});


function StatCard({
  icon: Icon, label, value, hint, accent, to,
}: { icon: any; label: string; value: string | number; hint?: string; accent?: string; to?: string }) {
  const inner = (
    <Card className={`group relative overflow-hidden transition hover:shadow-md ${accent ?? ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function AdminOverview() {
  const fetchStats = useServerFn(getAdminStats);
  const fetchAudit = useServerFn(listAuditLog);
  const fetchSecurity = useServerFn(getSecurityOverview);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchStats(),
    refetchInterval: 30000,
  });
  const { data: audit } = useQuery({
    queryKey: ["admin-overview", "audit"],
    queryFn: () => fetchAudit({ data: { limit: 50 } }),
    refetchInterval: 60000,
  });
  const { data: sec } = useQuery({
    queryKey: ["admin-overview", "security"],
    queryFn: () => fetchSecurity(),
    refetchInterval: 60000,
  });

  const s = data;
  const maxBar = Math.max(1, ...(s?.series ?? []).map((d) => Math.max(d.users, d.projects)));

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">نظرة عامة</h1>
          <p className="text-sm text-muted-foreground">
            إحصائيات حية للمنصة — يتم التحديث كل ٣٠ ثانية.
          </p>
        </div>
        <Link to="/admin/ai-assistant">
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10">
            <Sparkles className="h-4 w-4" />
            المساعد الإداري الذكي
          </div>
        </Link>
      </div>

      {/* الصف الأول — المستخدمون والمشاريع */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">المستخدمون والمشاريع</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="إجمالي المستخدمين"
            value={isLoading ? "…" : (s?.users.total ?? 0).toLocaleString("ar")}
            hint={s ? `+${s.users.last24h} خلال 24 ساعة · +${s.users.last7d} خلال 7 أيام` : ""}
            to="/admin/members"
          />
          <StatCard
            icon={FolderKanban}
            label="إجمالي المشاريع"
            value={isLoading ? "…" : (s?.projects.total ?? 0).toLocaleString("ar")}
            hint={s ? `${s.projects.active} نشط · ${s.projects.pending} بانتظار المراجعة` : ""}
            to="/admin/projects"
          />
          <StatCard
            icon={MessagesSquare}
            label="منشورات المجتمع"
            value={isLoading ? "…" : (s?.community.posts ?? 0).toLocaleString("ar")}
            hint={s ? `+${s.community.posts24h} منشور خلال 24 ساعة` : ""}
            to="/admin/content"
          />
          <StatCard
            icon={Activity}
            label="رسائل آخر 24 ساعة"
            value={isLoading ? "…" : (s?.community.messages24h ?? 0).toLocaleString("ar")}
            hint="نشاط التواصل الفعلي"
          />
        </div>
      </div>

      {/* الصف الثاني — المالية */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">المالية والمحاسبة</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Wallet}
            label="مجموع أرصدة المحافظ"
            value={isLoading ? "…" : `${(s?.finance.walletsBalance ?? 0).toLocaleString("ar")} ر.س`}
            hint="رصيد مجمّع لكل مستخدمي المنصة"
            to="/admin/wallets"
            accent="border-emerald-500/20"
          />
          <StatCard
            icon={Coins}
            label="عمولات آخر 30 يوم"
            value={isLoading ? "…" : `${(s?.finance.commissions30d ?? 0).toLocaleString("ar")} ر.س`}
            hint="إيرادات المنصة"
            to="/admin/commissions"
            accent="border-emerald-500/20"
          />
          <StatCard
            icon={ArrowDownToLine}
            label="طلبات السحب المعلقة"
            value={isLoading ? "…" : (s?.ops.payoutsPending ?? 0)}
            hint="تتطلب موافقتك"
            to="/admin/payouts"
            accent={s && s.ops.payoutsPending > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}
          />
          <StatCard
            icon={Megaphone}
            label="حملات إعلانية نشطة"
            value={isLoading ? "…" : (s?.ops.adsActive ?? 0)}
            to="/admin/ads-admin"
          />
        </div>
      </div>

      {/* الصف الثالث — الإجراءات */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">إجراءات تتطلب الانتباه</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={BadgeCheck}
            label="طلبات توثيق KYC"
            value={isLoading ? "…" : (s?.ops.kycPending ?? 0)}
            hint="بانتظار المراجعة"
            to="/admin/kyc"
            accent={s && s.ops.kycPending > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}
          />
          <StatCard
            icon={FolderKanban}
            label="مشاريع للمراجعة"
            value={isLoading ? "…" : (s?.projects.pending ?? 0)}
            hint="موافقة أو رفض"
            to="/admin/projects"
            accent={s && s.projects.pending > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}
          />
          <StatCard
            icon={Scale}
            label="نزاعات مفتوحة"
            value={isLoading ? "…" : (s?.ops.disputesOpen ?? 0)}
            hint="تتطلب فصلاً"
            to="/admin/disputes"
            accent={s && s.ops.disputesOpen > 0 ? "border-rose-500/40 bg-rose-500/5" : ""}
          />
        </div>
      </div>

      {/* رسم بياني للنمو */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            نمو آخر 7 أيام
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !s ? (
            <div className="h-32 animate-pulse rounded bg-muted" />
          ) : (
            <>
              <div className="flex items-end gap-2 h-40">
                {s.series.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-col-reverse items-stretch gap-0.5">
                      <div
                        className="rounded-t bg-primary"
                        style={{ height: `${(d.users / maxBar) * 130}px` }}
                        title={`${d.users} مستخدم`}
                      />
                      <div
                        className="rounded-t bg-emerald-500/70"
                        style={{ height: `${(d.projects / maxBar) * 130}px` }}
                        title={`${d.projects} مشروع`}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground">{d.date.slice(5)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-primary" /> مستخدمون جدد</div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-emerald-500/70" /> مشاريع جديدة</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* تذكير المساعد الذكي */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold">المساعد الإداري الذكي</div>
              <div className="text-xs text-muted-foreground">
                نفّذ أوامر مثل: "احظر المستخدم X"، "اعتمد المشروع Y"، "أعطني التقرير اليومي"
              </div>
            </div>
          </div>
          <Link
            to="/admin/ai-assistant"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            افتح المساعد
          </Link>
        </CardContent>
      </Card>

      {/* رابط دليل الهوية البصرية */}
      <Link
        to="/admin/brand-kit"
        className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 shadow-sm transition hover:border-primary hover:bg-primary/5"
      >
        <div>
          <div className="text-sm font-extrabold text-card-foreground">دليل الهوية البصرية — IDEA BUSINESS</div>
          <div className="text-xs text-muted-foreground">الشعار، الألوان، الأيقونات، وروابط الأصول الرسمية.</div>
        </div>
        <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">فتح</span>
      </Link>

      {/* رابط إعدادات الشعار الثابت */}
      <Link
        to="/admin/watermark"
        className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 shadow-sm transition hover:border-primary hover:bg-primary/5"
      >
        <div>
          <div className="text-sm font-extrabold text-card-foreground">إعدادات الشعار الثابت (Watermark)</div>
          <div className="text-xs text-muted-foreground">تحكّم بظهور وعتامة وموضع شارة الشعار على كل الصفحات.</div>
        </div>
        <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">فتح</span>
      </Link>

      {/* لوحة التنبيهات الحية */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-rose-500/30 bg-rose-500/5 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              تنبيهات الأمن
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <AlertRow
              label="أحداث أمنية محظورة (24س)"
              value={(sec as any)?.blocked_24h ?? 0}
              to="/admin/security"
              tone={(sec as any)?.blocked_24h > 0 ? "danger" : "ok"}
            />
            <AlertRow
              label="IPs محظورة فعلياً"
              value={(sec as any)?.ips_blocked ?? 0}
              to="/admin/firewall"
              tone="warn"
            />
            <AlertRow
              label="محافظ في وضع Lockdown"
              value={(sec as any)?.wallets_lockdown ?? 0}
              to="/admin/wallets"
              tone={(sec as any)?.wallets_lockdown > 0 ? "warn" : "ok"}
            />
            <AlertRow
              label="نزاعات مفتوحة"
              value={s?.ops.disputesOpen ?? 0}
              to="/admin/disputes"
              tone={(s?.ops.disputesOpen ?? 0) > 0 ? "danger" : "ok"}
            />
          </CardContent>
        </Card>

        {/* تدفق آخر إجراءات الإدارة */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="h-4 w-4 text-primary" />
              آخر إجراءات الإدارة
              <Badge variant="secondary" className="ms-2">
                {(audit?.rows?.length ?? 0)} حدث
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto divide-y divide-border text-sm">
              {(audit?.rows ?? []).slice(0, 50).map((r: any) => (
                <div key={r.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.action}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.target_table ?? "—"} {r.target_id ? `· ${String(r.target_id).slice(0, 8)}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("ar")}
                  </div>
                </div>
              ))}
              {(!audit || audit.rows.length === 0) && (
                <p className="text-muted-foreground text-center py-6 text-xs">لا توجد إجراءات بعد.</p>
              )}
            </div>
            <Link to="/admin/audit" className="mt-3 inline-block text-xs text-primary hover:underline">
              عرض سجل التدقيق الكامل ←
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* وصول سريع لكل الأقسام */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">وصول سريع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <QuickTile icon={Users} label="الأعضاء" to="/admin/members" />
            <QuickTile icon={BadgeCheck} label="KYC" to="/admin/kyc" />
            <QuickTile icon={FolderKanban} label="المشاريع" to="/admin/projects" />
            <QuickTile icon={Handshake} label="عروض الشراء" to="/admin/purchases" />
            <QuickTile icon={Wallet} label="المحافظ" to="/admin/wallets" />
            <QuickTile icon={Coins} label="العمولات" to="/admin/commissions" />
            <QuickTile icon={ArrowDownToLine} label="السحوبات" to="/admin/payouts" />
            <QuickTile icon={Scale} label="النزاعات" to="/admin/disputes" />
            <QuickTile icon={Package} label="الكتالوج" to="/admin/catalog" />
            <QuickTile icon={ShoppingCart} label="الطلبات" to="/admin/orders" />
            <QuickTile icon={MessagesSquare} label="المحتوى" to="/admin/content" />
            <QuickTile icon={MessagesSquare} label="الرسائل" to="/admin/messages" />
            <QuickTile icon={Megaphone} label="البث" to="/admin/broadcast" />
            <QuickTile icon={Megaphone} label="الإعلانات" to="/admin/ads-admin" />
            <QuickTile icon={Target} label="التسويق" to="/admin/marketing" />
            <QuickTile icon={FileText} label="CMS" to="/admin/cms" />
            <QuickTile icon={Zap} label="الأتمتة" to="/admin/automations" />
            <QuickTile icon={Plug} label="التكاملات" to="/admin/integrations" />
            <QuickTile icon={ShieldCheck} label="الأمن" to="/admin/security" />
            <QuickTile icon={ShieldCheck} label="الجدار" to="/admin/firewall" />
            <QuickTile icon={Search} label="SEO" to="/admin/seo" />
            <QuickTile icon={BookOpen} label="المقالات" to="/admin/seo/articles" />
            <QuickTile icon={KeyRound} label="الكلمات" to="/admin/seo/keywords" />
            <QuickTile icon={SettingsIcon} label="الإعدادات" to="/admin/settings" />
            <QuickTile icon={ScrollText} label="السجلات" to="/admin/logs" />
            <QuickTile icon={ShieldCheck} label="الأدوار" to="/admin/roles" />
            <QuickTile icon={Activity} label="صحة النظام" to="/admin/health" />
            <QuickTile icon={Sparkles} label="المساعد AI" to="/admin/ai-assistant" />
            <QuickTile icon={Sparkles} label="مختبر الوكلاء" to="/admin/agents-lab" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertRow({
  label, value, to, tone,
}: { label: string; value: number | string; to: string; tone: "ok" | "warn" | "danger" }) {
  const color =
    tone === "danger" ? "text-rose-600 dark:text-rose-400" :
    tone === "warn" ? "text-amber-600 dark:text-amber-400" :
    "text-emerald-600 dark:text-emerald-400";
  return (
    <Link to={to} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </Link>
  );
}

function QuickTile({ icon: Icon, label, to }: { icon: any; label: string; to: string }) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center transition hover:border-primary/40 hover:bg-primary/5"
    >
      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

