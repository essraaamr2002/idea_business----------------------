import { Star } from "lucide-react";

const TESTIMONIALS = [
  { n: "أحمد ك.", r: "مستثمر", t: "تجربة سلسة وضمانات قانونية حقيقية. ضاعفت محفظتي خلال 8 أشهر." },
  { n: "سارة م.", r: "رائدة أعمال", t: "جمعت تمويل مشروعي خلال 3 أسابيع — والدعم رائع." },
  { n: "خالد ع.", r: "مستثمر", t: "السوق الموازي خيار رائع للسيولة. منصة احترافية." },
];

export function Testimonials() {
  return (
    <section className="my-10">
      <h2 className="mb-4 text-2xl font-black">ماذا يقول مستخدمونا؟</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((x) => (
          <figure key={x.n} className="rounded-2xl border border-border bg-card/60 p-5">
            <div className="mb-2 flex gap-0.5 text-amber-400">{Array.from({length:5}).map((_,i)=><Star key={i} className="h-4 w-4 fill-current" />)}</div>
            <blockquote className="text-sm leading-7 text-foreground/90">«{x.t}»</blockquote>
            <figcaption className="mt-3 text-xs text-muted-foreground"><span className="font-bold text-foreground">{x.n}</span> — {x.r}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
