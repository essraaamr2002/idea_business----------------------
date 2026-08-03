import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { listKyc, decideKyc } from "@/lib/admin-members.functions";

export const Route = createFileRoute("/admin/kyc")({
  component: KycPage,
});

function KycPage() {
  const [tab, setTab] = useState("pending");
  return (
    <Card>
      <CardHeader><CardTitle>طلبات التحقق (KYC)</CardTitle></CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">المعلقة</TabsTrigger>
            <TabsTrigger value="verified">المعتمدة</TabsTrigger>
            <TabsTrigger value="rejected">المرفوضة</TabsTrigger>
            <TabsTrigger value="all">الكل</TabsTrigger>
          </TabsList>
          {(["pending", "verified", "rejected", "all"] as const).map((s) => (
            <TabsContent key={s} value={s} className="space-y-3 pt-4">
              <KycList status={s === "all" ? undefined : s} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function KycList({ status }: { status?: string }) {
  const qc = useQueryClient();
  const fetchKyc = useServerFn(listKyc);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "kyc", status ?? "all"],
    queryFn: () => fetchKyc({ data: { status } }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">جاري التحميل…</p>;
  if (!data?.length) return <p className="text-sm text-muted-foreground">لا توجد طلبات.</p>;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {data.map((k: any) => (
        <KycCard key={k.id} item={k} onDone={() => qc.invalidateQueries({ queryKey: ["admin", "kyc"] })} />
      ))}
    </div>
  );
}

function KycCard({ item, onDone }: { item: any; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const decide = useServerFn(decideKyc);
  const m = useMutation({
    mutationFn: (approve: boolean) => decide({ data: { kycId: item.id, approve, reason } }),
    onSuccess: () => { toast.success("تم"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{item.profile?.display_name || item.user_id.slice(0, 8)}</p>
          <p className="text-xs text-muted-foreground">{item.profile?.phone} • {item.profile?.country}</p>
        </div>
        <Badge variant={item.status === "verified" ? "default" : item.status === "rejected" ? "destructive" : "outline"}>
          {item.status}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {item.document_signed_url && <a href={item.document_signed_url} target="_blank" rel="noreferrer" className="text-primary underline">📄 المستند</a>}
        {item.selfie_signed_url && <a href={item.selfie_signed_url} target="_blank" rel="noreferrer" className="text-primary underline">🤳 السيلفي الحي</a>}
        {item.signature_signed_url && <a href={item.signature_signed_url} target="_blank" rel="noreferrer" className="text-primary underline">✍️ التوقيع</a>}
      </div>
      {(item.document_meta || item.document_expiry) && (
        <div className="rounded-md bg-muted/40 p-2 text-xs space-y-1">
          {item.document_type && <p><strong>نوع الوثيقة:</strong> {item.document_type}</p>}
          {item.document_meta?.ocr_name && <p><strong>الاسم (OCR):</strong> {item.document_meta.ocr_name}</p>}
          {item.document_meta?.ocr_id_number && <p><strong>رقم الوثيقة:</strong> {item.document_meta.ocr_id_number}</p>}
          {item.document_expiry && <p><strong>تاريخ الانتهاء:</strong> {item.document_expiry}</p>}
          {item.document_meta?.engine && <p><strong>المحرّك:</strong> {item.document_meta.engine}</p>}
        </div>
      )}
      {item.pledge_accepted && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs space-y-1">
          <p>✅ وقّع التعهد بعدم التحايل وقبول الغرامة (25,000$)</p>
          {item.arbitration_accepted && <p>✅ قبل تحكيم شركة فايرير السعودية</p>}
          {item.pledge_full_name && <p><strong>الاسم في الإقرار:</strong> {item.pledge_full_name}</p>}
          {item.pledge_signed_at && <p><strong>تاريخ التوقيع:</strong> {new Date(item.pledge_signed_at).toLocaleString("ar")}</p>}
        </div>
      )}
      {item.liveness_challenge && (
        <p className="text-xs text-muted-foreground">
          🎯 تحدّيات حيّة: {(item.liveness_challenge.questions || []).join(" • ")} ({item.liveness_challenge.framesCount} لقطة)
        </p>
      )}
      {item.ai_score != null && (
        <p className="text-xs text-muted-foreground">
          AI: {item.ai_decision} • {Number(item.ai_score).toFixed(2)} — {item.ai_reasoning}
        </p>
      )}
      {item.status === "pending" || item.status === "submitted" ? (
        <>
          <Textarea placeholder="سبب (اختياري للقبول، إلزامي للرفض)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => m.mutate(true)} disabled={m.isPending}>اعتماد</Button>
            <Button size="sm" variant="destructive" onClick={() => m.mutate(false)} disabled={m.isPending || reason.length < 3}>رفض</Button>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">روجعت في {item.reviewed_at ? new Date(item.reviewed_at).toLocaleString("ar") : "—"}</p>
      )}
    </div>
  );
}
