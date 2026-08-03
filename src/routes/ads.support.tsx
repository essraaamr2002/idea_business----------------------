import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Plus, ArrowLeft } from "lucide-react";
import { createAdSupportTicket, listMyAdSupportTickets } from "@/lib/ads-advanced.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/ads/support")({
  head: () => ({ meta: [{ title: "دعم الإعلانات" }] }),
  component: SupportPage,
});

function SupportPage() {
  const qc = useQueryClient();
  const list = useServerFn(listMyAdSupportTickets);
  const create = useServerFn(createAdSupportTicket);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const { data } = useQuery({ queryKey: ["my-ad-tickets"], queryFn: () => list() });
  const m = useMutation({
    mutationFn: () => create({ data: { campaignId: null, subject, message } }),
    onSuccess: () => {
      toast.success("تم إرسال تذكرتك");
      setShowForm(false); setSubject(""); setMessage("");
      qc.invalidateQueries({ queryKey: ["my-ad-tickets"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <WorkspaceShell>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/ads"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3"><LifeBuoy className="h-6 w-6 text-primary" /></div>
              <div>
                <h1 className="text-2xl font-extrabold">دعم الإعلانات</h1>
                <p className="text-sm text-muted-foreground">اطلب مساعدة فريق الإدارة بشأن حملاتك</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> تذكرة جديدة</Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader><CardTitle className="text-base">تذكرة دعم جديدة</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>الموضوع</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} /></div>
              <div><Label>الرسالة</Label><Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} /></div>
              <Button disabled={subject.length < 3 || message.length < 5 || m.isPending} onClick={() => m.mutate()}>إرسال</Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {(data?.items ?? []).map((t: any) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{t.subject}</h3>
                      <Badge variant={t.status === "resolved" ? "default" : t.status === "open" ? "secondary" : "outline"}>{t.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{t.message}</p>
                    {t.admin_reply && (
                      <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                        <div className="font-bold mb-1">رد الإدارة:</div>
                        <p className="whitespace-pre-wrap">{t.admin_reply}</p>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString("ar")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {(data?.items ?? []).length === 0 && !showForm && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد تذاكر بعد.</CardContent></Card>
          )}
        </div>
      </main>
    </WorkspaceShell>
  );
}
