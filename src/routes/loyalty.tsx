import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StreakBar } from "@/components/StreakBar";
import { ReputationMeter } from "@/components/ReputationMeter";
import { Crown, Sparkles, Gift, CheckCircle2, Circle, Trophy, ShoppingBag, Ticket, Cake } from "lucide-react";
import {
  TIERS, tierFor, nextTier, getPoints, DAILY_QUESTS, getCompletedQuests, completeQuest,
  setBirthday, getBirthday, pingStreak,
} from "@/lib/loyalty";
import { toast } from "sonner";

export const Route = createFileRoute("/loyalty")({
  head: () => ({
    meta: [
      { title: "نظام الولاء — نقاط، مستويات، مكافآت | IDEA BUSINESS" },
      { name: "description", content: "اجمع النقاط، ارتقِ بمستوى عضويتك من برونزي إلى بلاتيني، واستبدل نقاطك بمزايا حصرية." },
    ],
  }),
  component: LoyaltyHub,
});

function LoyaltyHub() {
  const [pts, setPts] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [bday, setBdayState] = useState<{ mmdd: string } | null>(null);
  const [bdayInput, setBdayInput] = useState("");

  useEffect(() => {
    pingStreak();
    setPts(getPoints());
    setDone(getCompletedQuests());
    setBdayState(getBirthday());
  }, []);

  const tier = tierFor(pts);
  const next = nextTier(pts);
  const progress = next ? Math.round(((pts - tier.min) / (next.min - tier.min)) * 100) : 100;

  const doQuest = (id: string) => {
    const r = completeQuest(id);
    if (r.newly) {
      setDone(getCompletedQuests());
      setPts(r.points);
      toast.success("أحسنت! تم إضافة النقاط");
    }
  };

  const saveBday = () => {
    if (!/^\d{2}-\d{2}$/.test(bdayInput)) {
      toast.error("الصيغة: MM-DD مثال: 06-22");
      return;
    }
    setBirthday(bdayInput);
    setBdayState({ mmdd: bdayInput });
    toast.success("سنحتفل بك في يوم ميلادك 🎉");
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <PageHeader
          icon={<Crown className="h-6 w-6" />}
          title="نظام الولاء"
          subtitle="كلما زاد تفاعلك، زادت نقاطك، وارتقى مستواك، وفُتحت لك مزايا جديدة."
        />

        {/* Header card */}
        <Card className={`mb-6 overflow-hidden border-2 border-transparent bg-gradient-to-br ${tier.color}/20`}>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${tier.color} text-white shadow-lg`}>
                  <Crown className="h-8 w-8" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">مستواك الحالي</div>
                  <div className="text-2xl font-black">{tier.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="font-extrabold tabular-nums">{pts.toLocaleString("ar")} نقطة</span>
                  </div>
                </div>
              </div>
              <StreakBar />
            </div>

            {next && (
              <div className="mt-5">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>تقدمك نحو <b className="text-foreground">{next.name}</b></span>
                  <span className="font-bold tabular-nums">{pts - tier.min} / {next.min - tier.min}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
                  <div className={`h-full bg-gradient-to-r ${next.color}`} style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <QuickLink to="/loyalty/shop" icon={<ShoppingBag />} title="متجر المكافآت" desc="استبدل نقاطك" />
          <QuickLink to="/loyalty/raffle" icon={<Ticket />} title="السحب الشهري" desc="فرصة جوائز" />
          <QuickLink to="/honor-board" icon={<Trophy />} title="لوحة الشرف" desc="الأفضل هذا الشهر" />
          <QuickLink to="/certificates" icon={<Crown />} title="شهاداتي" desc="حمّل شهادات إنجاز" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Daily quests */}
          <Card>
            <CardHeader><CardTitle className="text-base">المهام اليومية</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {DAILY_QUESTS.map((q) => {
                const isDone = done.includes(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => doQuest(q.id)}
                    disabled={isDone}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-start transition ${
                      isDone ? "border-green-verified/30 bg-green-verified/5 opacity-70" : "border-border bg-card/40 hover:bg-foreground/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isDone ? <CheckCircle2 className="h-4 w-4 text-green-verified" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm font-bold">{q.title}</span>
                    </div>
                    <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-black text-amber-600">+{q.reward}</span>
                  </button>
                );
              })}
              <div className="rounded-md bg-muted/40 p-2 text-center text-[11px] text-muted-foreground">
                تتجدّد المهام يومياً عند منتصف الليل.
              </div>
            </CardContent>
          </Card>

          {/* Tiers preview */}
          <Card>
            <CardHeader><CardTitle className="text-base">المستويات والمزايا</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {TIERS.map((t) => (
                <div key={t.id} className={`rounded-lg border p-3 ${t.id === tier.id ? "border-primary/60 bg-primary/5" : "border-border bg-card/40"}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${t.color} text-white`}>
                        <Crown className="h-4 w-4" />
                      </span>
                      <span className="font-extrabold">{t.name}</span>
                      {t.id === tier.id && <span className="rounded bg-primary/15 px-1.5 text-[10px] font-black text-primary">حالي</span>}
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">{t.min.toLocaleString("ar")}+</span>
                  </div>
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {t.perks.map((p) => <li key={p}>• {p}</li>)}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Reputation */}
          <Card>
            <CardHeader><CardTitle className="text-base">سمعتك في المجتمع</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ReputationMeter score={Math.min(100, Math.round(pts / 60))} />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Mini label="تعليقات مفيدة" v="١٢" />
                <Mini label="ردود معتمدة" v="٤" />
                <Mini label="إعجابات تلقّيتها" v="٤٧" />
                <Mini label="مشاريع تابعتها" v="٩" />
              </div>
              <Link to="/community"><Button variant="outline" className="w-full">شارك في المجتمع</Button></Link>
            </CardContent>
          </Card>

          {/* Birthday */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cake className="h-4 w-4 text-rose-500" /> هدية يوم الميلاد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bday ? (
                <div className="rounded-lg border border-rose-300/40 bg-rose-50/40 p-3 text-sm dark:bg-rose-500/5">
                  <div className="font-extrabold">سجّلنا يوم ميلادك: <span className="text-rose-600 dark:text-rose-400">{bday.mmdd}</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">ستحصل تلقائياً على ٢٠٠ نقطة + كوبون خصم في يومك.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">سجّل يوم ميلادك (MM-DD) لتحصل على ٢٠٠ نقطة + كوبون هدية يوم ميلادك.</p>
                  <div className="flex gap-2">
                    <input
                      value={bdayInput}
                      onChange={(e) => setBdayInput(e.target.value)}
                      placeholder="06-22"
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                      dir="ltr"
                    />
                    <Button onClick={saveBday}><Gift className="me-1 h-4 w-4" /> احفظ</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function QuickLink({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link to={to as "/loyalty"} className="rounded-xl border border-border bg-card/60 p-4 transition hover:border-primary/40 hover:bg-primary/5">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="font-extrabold">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}

function Mini({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-black">{v}</div>
    </div>
  );
}
