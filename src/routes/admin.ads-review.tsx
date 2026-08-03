import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Plus, Trash2, ShieldAlert } from "lucide-react";
import {
  listAdReviewQueue, setAdReviewState, listBlockedKeywords, addBlockedKeyword, removeBlockedKeyword,
} from "@/lib/ads-advanced.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/ads-review")({
  component: AdsReviewPage,
});

function AdsReviewPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAdReviewQueue);
  const setState = useServerFn(setAdReviewState);
  const listKw = useServerFn(listBlockedKeywords);
  const addKw = useServerFn(addBlockedKeyword);
  const removeKw = useServerFn(removeBlockedKeyword);

  const { data: queue } = useQuery({ queryKey: ["admin-ad-queue"], queryFn: () => list() });
  const { data: kws } = useQuery({ queryKey: ["admin-blocked-kws"], queryFn: () => listKw() });

  const review = useMutation({
    mutationFn: (v: { id: string; state: "approved" | "changes_requested"; note?: string }) => setState({ data: v }),
    onSuccess: () => { toast.success("تم"); qc.invalidateQueries({ queryKey: ["admin-ad-queue"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const [newKw, setNewKw] = useState("");
  const [reason, setReason] = useState("");
  const addMut = useMutation({
    mutationFn: () => addKw({ data: { keyword: newKw, reason: reason || undefined } }),
    onSuccess: () => { toast.success("أُضيفت الكلمة"); setNewKw(""); setReason(""); qc.invalidateQueries({ queryKey: ["admin-blocked-kws"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => removeKw({ data: { id } }),
    onSuccess: () => { toast.success("حُذفت"); qc.invalidateQueries({ queryKey: ["admin-blocked-kws"] }); },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold flex items-center gap-2"><ShieldAlert className="h-6 w-6" /> مراجعة الإعلانات والكلمات المحظورة</h1>
      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">قائمة المراجعة ({queue?.items.length ?? 0})</TabsTrigger>
          <TabsTrigger value="keywords">الكلمات المحظورة</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-3 mt-4">
          {(queue?.items ?? []).map((a: any) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{a.headline}</CardTitle>
                  <Badge variant="secondary">{a.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {a.body && <p className="text-muted-foreground">{a.body}</p>}
                {a.media_url && <img src={a.media_url} alt="" className="h-24 rounded" />}
                <p className="text-xs">رابط: <a href={a.cta_url} className="text-primary underline" target="_blank" rel="noreferrer">{a.cta_url}</a></p>
                <p className="text-xs text-muted-foreground">ميزانية: {a.total_budget} {a.currency}</p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => review.mutate({ id: a.id, state: "approved" })}><Check className="h-3 w-3" /> اعتماد</Button>
                  <Button size="sm" variant="destructive" onClick={() => {
                    const note = prompt("سبب طلب التعديل");
                    if (note) review.mutate({ id: a.id, state: "changes_requested", note });
                  }}><X className="h-3 w-3" /> طلب تعديل</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(queue?.items ?? []).length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد إعلانات بانتظار المراجعة.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="keywords" className="space-y-3 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">إضافة كلمة محظورة</CardTitle></CardHeader>
            <CardContent className="flex gap-2 flex-wrap">
              <Input className="max-w-xs" placeholder="الكلمة" value={newKw} onChange={(e) => setNewKw(e.target.value)} />
              <Input className="max-w-xs" placeholder="السبب (اختياري)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <Button disabled={newKw.length < 2 || addMut.isPending} onClick={() => addMut.mutate()}><Plus className="h-4 w-4" /> إضافة</Button>
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-2">
            {(kws?.items ?? []).map((k: any) => (
              <Badge key={k.id} variant="outline" className="px-3 py-1.5 gap-2">
                {k.keyword}
                <button onClick={() => delMut.mutate(k.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
              </Badge>
            ))}
            {(kws?.items ?? []).length === 0 && <p className="text-sm text-muted-foreground">لا توجد كلمات محظورة.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
