import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Award, Users, Megaphone } from "lucide-react";

export const Route = createFileRoute("/ambassadors")({
  head: () => ({
    meta: [
      { title: "السفراء | IDEA BUSINESS" },
      { name: "description", content: "انضم لبرنامج سفراء IDEA BUSINESS وكسب عمولات حصرية." },
    ],
  }),
  component: AmbassadorsPage,
});

function AmbassadorsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Award className="h-6 w-6" />} title="برنامج السفراء" subtitle="ساعد في نشر ثقافة الاستثمار واكسب مكافآت." />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { i: Users, t: "ادعُ شبكتك", d: "شارك رابطك مع المهتمين بالاستثمار." },
            { i: Megaphone, t: "اصنع محتوى", d: "اكتب أو صور تجربتك مع المنصة." },
            { i: Award, t: "اكسب مكافآت", d: "حتى 15% من عمولات الإحالات + مزايا حصرية." },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card/60 p-5 text-center">
              <s.i className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-2 font-bold">{s.t}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => toast.success("تم استلام طلبك", { description: "سيتواصل معك فريق السفراء خلال 48 ساعة." })}
          className="mt-6 w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground hover:opacity-90"
        >
          قدّم طلبًا للانضمام
        </button>
      </main>
    </div>
  );
}
