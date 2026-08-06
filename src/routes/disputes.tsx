import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Plus, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/disputes")({
  head: () => ({
    meta: [
      { title: "المنازعات | IDEA BUSINESS" },
      {
        name: "description",
        content:
          "قسم المنازعات: افتح نزاعاً قانونياً على مشروع وتابع حالته. محامون مختصون في كل دولة.",
      },
    ],
  }),
  component: DisputesPage,
});

function DisputesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["dispute-project-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, ticker")
        .order("name")
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["my-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select(
          "id, project_id, reason, amount_claimed, status, fee_amount, fee_paid, lawyer_name, lawyer_country, resolution, created_at, projects(name, ticker)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("سجّل دخولك أولاً");
      const selectedProject = projects?.find((project) => project.id === projectId);
      if (!selectedProject) throw new Error("اختر مشروعًا صحيحًا من القائمة");
      const { error } = await supabase.from("disputes").insert({
        project_id: selectedProject.id,
        claimant_id: u.user.id,
        reason: reason.trim(),
        amount_claimed: amount ? Number(amount) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم فتح النزاع — سيتواصل معك فريق التحكيم قريباً");
      setShowForm(false);
      setProjectId("");
      setReason("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["my-disputes"] });
    },
    onError: (error: Error) => toast.error(error.message || "تعذر فتح النزاع"),
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <PageHeader
          icon={<Scale className="h-6 w-6" />}
          title="قسم المنازعات"
          subtitle="افتح نزاعاً قانونياً، تابع حالته، واطلب محامياً مختصاً في دولتك."
          actions={
            <Button
              onClick={() => setShowForm((s) => !s)}
              className="gradient-primary text-primary-foreground border-0 font-extrabold"
            >
              <Plus className="h-4 w-4 me-1" /> فتح نزاع جديد
            </Button>
          }
        />

        {showForm && (
          <Card className="mb-6 border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">تفاصيل النزاع</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-bold">المشروع</label>
                <Select value={projectId} onValueChange={setProjectId} disabled={projectsLoading}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={projectsLoading ? "جارٍ تحميل المشروعات..." : "اختر المشروع"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(projects ?? []).map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                        {project.ticker ? ` (${project.ticker})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!projectsLoading && (projects?.length ?? 0) === 0 && (
                  <p className="mt-1 text-xs text-destructive">لا توجد مشروعات متاحة لفتح نزاع.</p>
                )}
              </div>
              <div>
                <label className="text-sm font-bold">سبب النزاع</label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="اشرح المشكلة باختصار..."
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-bold">المبلغ المطالَب به (اختياري)</label>
                <Input
                  type="number"
                  dir="ltr"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-xs font-semibold text-warning-foreground">
                <AlertCircle className="h-4 w-4" />
                رسوم فتح النزاع 1500 دولار، تُسترد إن صدر الحكم لصالحك.
              </div>
              <Button
                disabled={create.isPending || !projectId || !reason}
                onClick={() => create.mutate()}
                className="w-full font-extrabold"
              >
                {create.isPending ? "جارٍ الإرسال..." : "تأكيد فتح النزاع"}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {isLoading && <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>}
          {!isLoading && (rows?.length ?? 0) === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-10 text-center">
              <Scale className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <h3 className="mt-3 text-lg font-black">لا توجد منازعات</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                عند الحاجة، افتح نزاعاً وسيتولى فريقنا متابعته.
              </p>
            </div>
          )}
          {(rows ?? []).map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        d.status === "open"
                          ? "destructive"
                          : d.status === "resolved"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {d.status}
                    </Badge>
                    <Link
                      to="/projects/$id"
                      params={{ id: d.project_id }}
                      className="font-bold hover:underline"
                    >
                      {d.projects?.name || d.project_id.slice(0, 8)}
                    </Link>
                    {d.projects?.ticker && (
                      <span className="text-xs text-muted-foreground">{d.projects.ticker}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString("ar")}
                  </span>
                </div>
                <p className="mt-2 text-sm">{d.reason}</p>
                {d.amount_claimed && (
                  <div className="mt-1 text-xs font-bold text-primary">
                    المطالبة: {d.amount_claimed} USD
                  </div>
                )}
                {d.lawyer_name && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    المحامي: {d.lawyer_name} — {d.lawyer_country}
                  </div>
                )}
                {d.resolution && (
                  <div className="mt-2 rounded bg-muted/50 p-2 text-xs">{d.resolution}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
