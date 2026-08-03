import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ticket, Trophy, Gift, Clock } from "lucide-react";
import { getPoints, spendPoints } from "@/lib/loyalty";
import { toast } from "sonner";

export const Route = createFileRoute("/loyalty/raffle")({
  head: () => ({
    meta: [
      { title: "السحب الشهري — فرصة جوائز قيّمة | IDEA BUSINESS" },
      { name: "description", content: "اشترِ تذاكر بنقاطك واربح جوائز شهرية: عضويات، نقدية، وأكثر." },
    ],
  }),
  component: RafflePage,
});

const TICKET_COST = 50;
const PRIZES = [
  { rank: "الجائزة الكبرى", value: "٥٠٠٠ ر.س نقدي + عضوية VIP سنوية" },
  { rank: "الجائزة الثانية", value: "٢٠٠٠ ر.س رصيد محفظة" },
  { rank: "خمس جوائز ثالثة", value: "عضوية كاملة ٣ أشهر" },
];

function endOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
}

const KEY = "fb_raffle_tickets_v1";

function getTickets(): number {
  try { return Number(localStorage.getItem(KEY) ?? 0); } catch { return 0; }
}
function addTicket() {
  try { localStorage.setItem(KEY, String(getTickets() + 1)); } catch {}
}

function RafflePage() {
  const [pts, setPts] = useState(0);
  const [tickets, setTickets] = useState(0);
  const [left, setLeft] = useState(endOfMonth() - Date.now());

  useEffect(() => {
    setPts(getPoints());
    setTickets(getTickets());
    const i = setInterval(() => setLeft(endOfMonth() - Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const buy = () => {
    if (!spendPoints(TICKET_COST)) {
      toast.error("نقاطك لا تكفي لشراء تذكرة");
      return;
    }
    addTicket();
    setPts(getPoints());
    setTickets(getTickets());
    toast.success("اشتريت تذكرة! حظاً موفقاً 🎟️");
  };

  const d = Math.max(0, Math.floor(left / 86400000));
  const h = Math.max(0, Math.floor((left % 86400000) / 3600000));
  const m = Math.max(0, Math.floor((left % 3600000) / 60000));

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader
          icon={<Ticket className="h-6 w-6" />}
          title="السحب الشهري"
          subtitle="سحب علني آخر يوم من كل شهر بشهود من اللجنة. كلما زادت تذاكرك زادت فرصتك."
        />

        <Card className="mb-6 border-primary/40 bg-gradient-to-br from-primary/10 to-amber-500/5">
          <CardContent className="p-6 text-center">
            <div className="mb-1 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> ينتهي السحب الحالي خلال
            </div>
            <div dir="ltr" className="text-3xl font-black tabular-nums">
              {d}d {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
            </div>
            <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">رصيدك</div>
                <div className="text-xl font-black text-amber-600">{pts.toLocaleString("ar")}</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">تذاكرك</div>
                <div className="text-xl font-black text-primary">{tickets} 🎟️</div>
              </div>
            </div>
            <Button onClick={buy} size="lg" className="mt-5 font-extrabold">
              <Ticket className="me-2 h-4 w-4" /> اشترِ تذكرة بـ {TICKET_COST} نقطة
            </Button>
          </CardContent>
        </Card>

        <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
          <Trophy className="h-5 w-5 text-amber-500" /> جوائز هذا الشهر
        </h2>
        <div className="grid gap-3">
          {PRIZES.map((p, i) => (
            <Card key={i} className="border-amber-500/30">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-extrabold">{p.rank}</div>
                    <div className="text-xs text-muted-foreground">{p.value}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-6 rounded-lg bg-muted/40 p-3 text-center text-xs text-muted-foreground">
          السحب علني بتقنية عشوائية موثقة. تُعرض النتائج على لوحة الشرف ويُبلَّغ الفائزون عبر البريد.
        </p>
      </main>
    </div>
  );
}
