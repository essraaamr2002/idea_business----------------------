import { Compass, ShieldAlert, Sprout, Target, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface MotivationalTrait {
  id: string;
  label: { ar: string; en: string };
  headline: { ar: string; en: string };
  principle: { ar: string; en: string };
  citation: string;
  icon: LucideIcon;
  accent: string;
  ring: string;
}

const MOTIVATIONAL_TRAITS: MotivationalTrait[] = [
  {
    id: "autonomy",
    label: { ar: "المبادر المستقل", en: "Independent Initiator" },
    headline: { ar: "تتحكم بقراراتك الاستثمارية بحرية", en: "You control your investment decisions independently." },
    principle: { ar: "الاستقلالية (Autonomy) - نظرية تقرير الذات", en: "Autonomy - Self-Determination Theory" },
    citation: "Deci & Ryan, 2000",
    icon: Compass,
    accent: "text-sky-600",
    ring: "border-sky-500/40 bg-sky-500/5",
  },
  {
    id: "competence",
    label: { ar: "المتقن", en: "Skill Builder" },
    headline: { ar: "كل تعلم جديد يقوي حكمك على المشاريع", en: "Every new skill sharpens how you evaluate projects." },
    principle: { ar: "الكفاءة (Competence) - نظرية تقرير الذات", en: "Competence - Self-Determination Theory" },
    citation: "Deci & Ryan, 2000",
    icon: Target,
    accent: "text-emerald-600",
    ring: "border-emerald-500/40 bg-emerald-500/5",
  },
  {
    id: "relatedness",
    label: { ar: "شريك المجتمع", en: "Community Partner" },
    headline: { ar: "تنمو داخل شبكة رواد ومستثمرين حقيقيين", en: "You grow inside a real network of founders and investors." },
    principle: { ar: "الانتماء (Relatedness) - نظرية تقرير الذات", en: "Relatedness - Self-Determination Theory" },
    citation: "Deci & Ryan, 2000",
    icon: Users,
    accent: "text-violet-600",
    ring: "border-violet-500/40 bg-violet-500/5",
  },
  {
    id: "goal-gradient",
    label: { ar: "قريب من الهدف", en: "Goal Closer" },
    headline: { ar: "كل خطوة توثيق تقربك من إتمام المشروع", en: "Every verification step moves you closer to launch." },
    principle: { ar: "أثر التدرج نحو الهدف (Goal-Gradient)", en: "Goal-Gradient Hypothesis" },
    citation: "Kivetz, Urminsky & Zheng, 2006",
    icon: TrendingUp,
    accent: "text-amber-600",
    ring: "border-amber-500/40 bg-amber-500/5",
  },
  {
    id: "loss-aversion",
    label: { ar: "حامي رأس المال", en: "Capital Protector" },
    headline: { ar: "أدوات الضمان والتوثيق تحمي ما بنيته", en: "Guarantee and verification tools protect what you build." },
    principle: { ar: "تجنب الخسارة (Loss Aversion)", en: "Loss Aversion" },
    citation: "Kahneman & Tversky, 1979",
    icon: ShieldAlert,
    accent: "text-rose-600",
    ring: "border-rose-500/40 bg-rose-500/5",
  },
  {
    id: "growth-mindset",
    label: { ar: "عقلية النمو", en: "Growth Mindset" },
    headline: { ar: "كل تجربة درس، والفشل بيانات لتحسين المسار", en: "Every attempt teaches; setbacks become data for the next move." },
    principle: { ar: "عقلية النمو (Growth Mindset)", en: "Growth Mindset" },
    citation: "Dweck, 2006",
    icon: Sprout,
    accent: "text-teal-600",
    ring: "border-teal-500/40 bg-teal-500/5",
  },
];

interface MotivationalBadgesProps {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export function MotivationalBadges({ title, subtitle, compact = false }: MotivationalBadgesProps) {
  const { dir, lang } = useI18n();
  const resolvedTitle =
    title ?? (lang === "ar" ? "سماتك التحفيزية - مبنية على أبحاث علوم السلوك" : "Your motivational traits - grounded in behavioral science");
  const resolvedSubtitle =
    subtitle ??
    (lang === "ar"
      ? "ست سمات تبرز نمط تفاعلك مع المنصة، مستوحاة من دراسات علمية معتمدة."
      : "Six traits that reflect how you engage with the platform, inspired by established research.");

  return (
    <section dir={dir} className="space-y-4">
      <header className="text-center max-w-2xl mx-auto">
        <h2 className="text-xl md:text-2xl font-black">{resolvedTitle}</h2>
        <p className="text-sm text-muted-foreground mt-1">{resolvedSubtitle}</p>
      </header>
      <div className={`grid gap-3 ${compact ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
        {MOTIVATIONAL_TRAITS.map((trait) => {
          const Icon = trait.icon;
          return (
            <article key={trait.id} className={`rounded-2xl border p-4 transition hover:shadow-md ${trait.ring}`}>
              <div className="flex items-start gap-3">
                <div className={`rounded-xl border border-border bg-background/70 p-2 ${trait.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">{trait.principle[lang]}</div>
                  <h3 className="font-extrabold mt-0.5">{trait.label[lang]}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{trait.headline[lang]}</p>
                  <div className="text-[10px] mt-2 text-muted-foreground/70 font-mono">{trait.citation}</div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
