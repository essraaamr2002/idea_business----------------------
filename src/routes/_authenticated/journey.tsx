import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Compass, Rocket, Users, Settings2, TrendingUp, CheckCircle2, Circle } from "lucide-react";
import {
  JOURNEY_STAGES,
  type JourneyStage,
  getMyJourney,
  saveMyJourney,
} from "@/lib/journey.functions";
import { listMyProjects } from "@/lib/founder-dashboard.functions";
import { reportClientEvent } from "@/lib/client-telemetry";

export const Route = createFileRoute("/_authenticated/journey")({
  component: JourneyPage,
});

const STAGE_META: Record<JourneyStage, { title: string; desc: string; icon: any; cta: { id: string; label: string; to: string } }> = {
  discover: {
    title: "الاستكشاف",
    desc: "تعرّف على السوق والفرص المتاحة قبل اتخاذ القرار.",
    icon: Compass,
    cta: { id: "cta-discover-market", label: "استكشف السوق", to: "/market" },
  },
  create: {
    title: "الإنشاء",
    desc: "أنشئ أول مشروع أو أضف فرصة استثمارية.",
    icon: Rocket,
    cta: { id: "cta-create-project", label: "أنشئ مشروعًا", to: "/projects/new" },
  },
  attract: {
    title: "الجذب",
    desc: "روّج لمشروعك واجذب أول مستثمرين أو عملاء.",
    icon: Users,
    cta: { id: "cta-attract-promote", label: "أدوات الترويج", to: "/launch-hub" },
  },
  operate: {
    title: "التشغيل",
    desc: "أدر عملياتك اليومية وتابع الأداء.",
    icon: Settings2,
    cta: { id: "cta-operate-dashboard", label: "لوحة مشاريعي", to: "/founder-dashboard" },
  },
  grow: {
    title: "النمو",
    desc: "وسّع نشاطك عبر السوق الموازي وأدوات النمو.",
    icon: TrendingUp,
    cta: { id: "cta-grow-secondary", label: "السوق الموازي", to: "/secondary-market" },
  },
};

const LS_AUTO = "journey:auto-stage";
const LS_MARKED = "journey:marked-stages";

function detectStage(projectsCount: number, hasActive: boolean): JourneyStage {
  if (projectsCount === 0) return "discover";
  if (!hasActive) return "create";
  if (projectsCount === 1) return "attract";
  if (projectsCount < 3) return "operate";
  return "grow";
}

function JourneyPage() {
  const qc = useQueryClient();
  const loadJourney = useServerFn(getMyJourney);
  const persistJourney = useServerFn(saveMyJourney);
  const loadProjects = useServerFn(listMyProjects);

  const journey = useQuery({
    queryKey: ["my-journey"],
    queryFn: () => loadJourney(),
    staleTime: 30_000,
  });

  const projects = useQuery({
    queryKey: ["my-projects-journey"],
    queryFn: () => loadProjects(),
    staleTime: 30_000,
  });

  // Local mirror so UI stays responsive; DB is source of truth on load.
  const [marked, setMarked] = useState<Set<JourneyStage>>(new Set());
  const [autoStage, setAutoStage] = useState<JourneyStage | null>(null);

  // Hydrate from DB, then from localStorage as fallback.
  useEffect(() => {
    if (journey.data) {
      setMarked(new Set((journey.data.marked_stages ?? []) as JourneyStage[]));
      setAutoStage((journey.data.auto_stage as JourneyStage | null) ?? null);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const lsMarked = window.localStorage.getItem(LS_MARKED);
      const lsAuto = window.localStorage.getItem(LS_AUTO) as JourneyStage | null;
      if (lsMarked) setMarked(new Set(JSON.parse(lsMarked)));
      if (lsAuto && JOURNEY_STAGES.includes(lsAuto)) setAutoStage(lsAuto);
    } catch {
      /* ignore */
    }
  }, [journey.data]);

  // Auto-detect stage from projects, persist when it changes.
  useEffect(() => {
    if (!projects.data) return;
    const list = projects.data as any[];
    const hasActive = list.some((p) => p.status === "active");
    const detected = detectStage(list.length, hasActive);
    if (detected === autoStage) return;
    setAutoStage(detected);
    try {
      window.localStorage.setItem(LS_AUTO, detected);
    } catch {
      /* ignore */
    }
    // Persist to DB — best effort, ignore failures.
    persistJourney({ data: { auto_stage: detected } }).catch(() => {});
    reportClientEvent({
      source: "journey",
      action: "stage-detected",
      ok: true,
      context: { stageName: detected, projectsCount: list.length, hasActive },
    });
    qc.invalidateQueries({ queryKey: ["my-journey"] });
  }, [projects.data, autoStage, persistJourney, qc]);

  // View telemetry (once per mount).
  useEffect(() => {
    reportClientEvent({
      source: "journey",
      action: "view",
      ok: true,
      context: { stageName: autoStage ?? undefined },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentIdx = useMemo(
    () => (autoStage ? JOURNEY_STAGES.indexOf(autoStage) : 0),
    [autoStage],
  );
  const completedCount = marked.size;
  const progressPct = Math.round(
    ((Math.max(currentIdx, 0) + 1) / JOURNEY_STAGES.length) * 100,
  );

  const toggleMark = (stage: JourneyStage) => {
    const next = new Set(marked);
    const wasMarked = next.has(stage);
    if (wasMarked) next.delete(stage);
    else next.add(stage);
    setMarked(next);
    const arr = Array.from(next);
    try {
      window.localStorage.setItem(LS_MARKED, JSON.stringify(arr));
    } catch {
      /* ignore */
    }
    persistJourney({ data: { marked_stages: arr } }).catch(() => {});
    reportClientEvent({
      source: "journey",
      action: wasMarked ? "stage-unmark" : "stage-mark",
      ok: true,
      context: { stageName: stage },
    });
  };

  const onCta = (stage: JourneyStage) => {
    const meta = STAGE_META[stage];
    reportClientEvent({
      source: "journey",
      action: "cta-click",
      ok: true,
      context: { stageName: stage, ctaId: meta.cta.id, to: meta.cta.to },
    });
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">🚀 رحلتي</h1>
        <p className="text-sm text-muted-foreground">
          نتتبع مرحلتك الحالية تلقائيًا ونعرض لك الخطوة التالية المناسبة. تقدّمك محفوظ على حسابك.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">تقدّم الرحلة</CardTitle>
            <Badge variant="secondary">
              {completedCount} / {JOURNEY_STAGES.length} مراحل مُنجزة
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPct} className="h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            المرحلة الحالية المكتشفة تلقائيًا:{" "}
            <span className="font-semibold text-foreground">
              {autoStage ? STAGE_META[autoStage].title : "…"}
            </span>
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {JOURNEY_STAGES.map((stage, idx) => {
          const meta = STAGE_META[stage];
          const Icon = meta.icon;
          const isCurrent = stage === autoStage;
          const isMarked = marked.has(stage);
          return (
            <Card key={stage} className={isCurrent ? "border-primary shadow-sm" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {idx + 1}. {meta.title}
                      </CardTitle>
                      {isCurrent && (
                        <Badge className="mt-1" variant="default">
                          الحالية
                        </Badge>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleMark(stage)}
                    aria-label={isMarked ? "إلغاء الإنجاز" : "علامة إنجاز"}
                    data-testid={`mark-stage-${stage}`}
                    className="text-muted-foreground hover:text-primary transition"
                  >
                    {isMarked ? (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{meta.desc}</p>
                <Button
                  asChild
                  size="sm"
                  variant={isCurrent ? "default" : "outline"}
                  data-testid={meta.cta.id}
                  onClick={() => onCta(stage)}
                >
                  <Link to={meta.cta.to as any}>{meta.cta.label}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
