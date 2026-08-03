import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareButtons } from "@/components/ShareButtons";
import { ContactShareDialog } from "@/components/ContactShareDialog";
import { InviteCardGenerator } from "@/components/InviteCardGenerator";
import { Gift, Users, Copy, Check, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/referrals")({
  head: () => ({
    meta: [
      { title: "ادعُ صديقاً — كافآت + ترقية عضويتك | IDEA BUSINESS" },
      { name: "description", content: "ادعُ أصدقاءك لIDEA BUSINESS واحصل على نقاط مكافأة، ومع كل 5 أصدقاء يكملون التسجيل تُرقّى عضويتك تلقائياً 30 يوماً." },
    ],
  }),
  component: ReferralsPage,
});

const GOAL = 5;

function ReferralsPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const { data, refetch } = useQuery({
    enabled: !!user,
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      const { data: code, error } = await supabase.rpc("ensure_referral_code");
      if (error) throw error;
      const { data: row } = await supabase
        .from("referrals")
        .select("uses_count, reward_total")
        .eq("referrer_id", user!.id)
        .maybeSingle();
      const { data: profile } = await supabase
        .from("profiles")
        .select("membership, membership_expires_at")
        .eq("id", user!.id)
        .maybeSingle();
      const { count: clicks } = await supabase
        .from("referral_clicks")
        .select("id", { count: "exact", head: true })
        .eq("code", String(code).toUpperCase());
      const { data: pairs } = await supabase
        .from("referral_verifications")
        .select("status")
        .eq("referrer_id", user!.id);
      const pending = (pairs ?? []).filter((p: any) => p.status === "pending").length;
      const flagged = (pairs ?? []).filter((p: any) => p.status === "flagged").length;
      return {
        code: code as string,
        count: row?.uses_count ?? 0,
        reward: Number(row?.reward_total ?? 0),
        membership: profile?.membership ?? "basic",
        expiresAt: profile?.membership_expires_at as string | null,
        clicks: clicks ?? 0,
        pending,
        flagged,
      };
    },
  });

  const code = data?.code ?? "";
  const link = code ? `https://busniss.org/r/${code}` : "";
  const count = data?.count ?? 0;
  const progress = Math.min(100, Math.round((count % GOAL) / GOAL * 100));
  const toGoal = GOAL - (count % GOAL);
  const conversion = data && data.clicks ? Math.round((data.count / data.clicks) * 100) : 0;


  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("تم نسخ الرابط");
    } catch {
      toast.error("تعذّر النسخ");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader
          icon={<Gift className="h-6 w-6" />}
          title="ادعُ صديقاً — اربحوا معاً"
          subtitle="كل صديق ينضم برابطك يمنحك 50 نقطة، وكل 5 أصدقاء يكملون التسجيل تُرقّى عضويتك إلى الكاملة 30 يوماً."
        />

        {!user ? (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <div className="font-extrabold">سجّل دخولك للحصول على رابطك الخاص</div>
                <div className="text-sm text-muted-foreground">يستغرق ثوانٍ فقط.</div>
              </div>
              <Link to="/auth"><Button className="font-extrabold">سجّل الدخول</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">رابط دعوتك</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-stretch gap-2">
                  <code dir="ltr" className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-bold">{link || "..."}</code>
                  <Button size="sm" onClick={copy} variant="outline" disabled={!link}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {link && <ShareButtons url={link} title="انضم لIDEA BUSINESS عبر دعوتي" />}
                {link && (
                  <ContactShareDialog
                    url={link}
                    code={code}
                    message={`مرحباً! انضم لمنصة IDEA BUSINESS عبر دعوتي — فرص استثمار موثّقة ومزايدات على مشاريع حقيقية.`}
                  />
                )}
                <div className="rounded-lg bg-muted/30 p-3 text-xs">
                  كود الدعوة: <span className="font-black text-primary">{code || "..."}</span>
                </div>

                {/* Membership progress */}
                <div className="rounded-xl border border-primary/30 bg-gradient-to-l from-primary/10 to-transparent p-4">
                  <div className="mb-2 flex items-center gap-2 font-extrabold text-primary-dark">
                    <Crown className="h-4 w-4" />
                    تقدّمك نحو ترقية العضوية
                  </div>
                  <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                    <span>{count % GOAL} من {GOAL} أصدقاء</span>
                    <span className="font-bold">
                      {toGoal === GOAL ? `ادعُ ${GOAL} أصدقاء لترقية عضويتك` : `بقي ${toGoal} لترقية تلقائية 30 يوماً`}
                    </span>
                  </div>
                  {data?.membership === "full" && data.expiresAt && (
                    <div className="mt-2 rounded-md bg-green-verified/10 px-2 py-1 text-[11px] font-extrabold text-green-verified">
                      عضويتك الكاملة نشطة حتى {new Date(data.expiresAt).toLocaleDateString("ar")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">إحصائياتك</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Stat label="نقرات الرابط" value={data?.clicks ?? 0} icon={<Users className="h-4 w-4" />} />
                <Stat label="مُسجَّلون موثَّقون" value={count} icon={<Check className="h-4 w-4" />} />
                <Stat label="بانتظار تأكيد الجوال" value={data?.pending ?? 0} icon={<Users className="h-4 w-4" />} />
                <Stat label="نقاط مكتسبة" value={data?.reward ?? 0} icon={<Gift className="h-4 w-4" />} />
                <div className="rounded-lg bg-primary/5 p-3 text-xs">
                  معدل التحويل: <span className="font-black text-primary">{conversion}%</span>
                </div>
                {(data?.flagged ?? 0) > 0 && (
                  <div className="rounded-lg bg-destructive/10 p-2 text-[11px] text-destructive">
                    {data?.flagged} إحالة مشبوهة (تم إيقافها تلقائياً)
                  </div>
                )}
                <Button size="sm" variant="outline" className="w-full" onClick={() => refetch()}>تحديث</Button>
              </CardContent>
            </Card>

          </div>
        )}

        {user && <TierProgressCard userId={user.id} />}


        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Step n="1" title="انسخ رابطك" desc="رابط فريد مرتبط بحسابك." />
          <Step n="2" title="شارك مع أصدقائك" desc="واتساب، X، أو أي قناة." />
          <Step n="3" title="رُقّيت عضويتك" desc="كل 5 أصدقاء = شهر عضوية كاملة + 250 نقطة." />
        </div>

        {user && code && (
          <div className="mt-8">
            <InviteCardGenerator code={code} url={link} />
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">{icon}{label}</div>
      <div className="text-lg font-black tabular-nums">{value}</div>
    </div>
  );
}
function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 font-black text-primary">{n}</div>
      <div className="mt-3 font-extrabold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}

function TierProgressCard({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["referral-tier", userId],
    queryFn: async () => {
      const [{ data: prog }, { data: tiers }] = await Promise.all([
        supabase.rpc("get_user_referral_progress", { p_user_id: userId }),
        supabase.from("referral_tiers").select("*").order("sort_order", { ascending: true }),
      ]);
      const row = Array.isArray(prog) ? prog[0] : prog;
      return { progress: row as any, tiers: (tiers ?? []) as any[] };
    },
  });
  if (!data) return null;
  const p = data.progress ?? {};
  const pct = Math.min(100, Number(p.progress_pct ?? 0));
  return (
    <Card className="mt-8 border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="h-4 w-4 text-primary" />
          مستوى السفير الحالي: {p.current_tier_ar ?? "برونزي"} — {Number(p.verified_count ?? 0)} إحالة موثّقة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>عمولة {Number(p.current_commission ?? 0)}% + {Number(p.current_reward ?? 0)} ﷼/إحالة</span>
            {p.next_tier_ar && <span className="font-bold">بقي {p.next_tier_needed} للمستوى «{p.next_tier_ar}»</span>}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {data.tiers.map((t) => {
            const active = t.tier_key === p.current_tier;
            return (
              <div
                key={t.id}
                className={`rounded-xl border p-3 text-xs ${
                  active ? "border-primary bg-primary/10" : "border-border bg-muted/20"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-black" style={{ color: t.badge_color || undefined }}>{t.name_ar}</span>
                  {active && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">الحالي</span>}
                </div>
                <div className="text-muted-foreground">من {t.min_referrals} {t.max_referrals ? `إلى ${t.max_referrals}` : "فأكثر"}</div>
                <div className="mt-1 font-bold">{Number(t.reward_per_referral_sar)} ﷼ + {Number(t.commission_pct)}%</div>
                {Array.isArray(t.perks) && t.perks.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
                    {t.perks.slice(0, 3).map((k: string, i: number) => <li key={i}>• {k}</li>)}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
