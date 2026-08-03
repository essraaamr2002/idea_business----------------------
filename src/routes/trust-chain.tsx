import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, ShieldCheck, XCircle, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listTrustChain, verifyTrustBlock } from "@/lib/trust-chain.functions";
import { useState } from "react";

export const Route = createFileRoute("/trust-chain")({
  head: () => ({ meta: [
    { title: "سلسلة الثقة | IDEA BUSINESS" },
    { name: "description", content: "ختم يومي علني (Merkle root) — أي شخص يتحقق من عدم التلاعب." },
  ]}),
  component: TrustChainPage,
});

function TrustChainPage() {
  const list = useServerFn(listTrustChain);
  const verify = useServerFn(verifyTrustBlock);
  const { data } = useQuery({ queryKey: ["chain"], queryFn: () => list({ data: { limit: 30 } as any }) });
  const [verified, setVerified] = useState<Record<number, boolean>>({});
  const mVerify = useMutation({
    mutationFn: (h: number) => verify({ data: { height: h } as any }),
    onSuccess: (r) => setVerified((s) => ({ ...s, [r.block.height]: r.ok })),
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader icon={<Link2 className="h-6 w-6" />} title="سلسلة الثقة" subtitle="ختم Merkle يومي علني لكل الصفقات." />
        <Card className="p-4">
          <div className="space-y-2">
            {(data ?? []).length === 0 && <p className="text-muted-foreground text-sm">لم يتم ختم أي كتلة بعد.</p>}
            {(data ?? []).map((b: any) => (
              <div key={b.height} className="border rounded p-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-bold text-sm flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> كتلة #{b.height}
                    <span className="text-muted-foreground font-normal">— {new Date(b.sealed_at).toLocaleString("ar-SA")}</span>
                  </div>
                  <div className="mt-1 space-y-1 font-mono text-[10px] text-muted-foreground break-all">
                    <div>Merkle: {b.merkle_root}</div>
                    <div>Hash: {b.block_hash}</div>
                    <div>عدد الأحداث: {b.event_count}</div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => mVerify.mutate(b.height)}>تحقّق</Button>
                  {verified[b.height] === true && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  {verified[b.height] === false && <XCircle className="h-5 w-5 text-red-600" />}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
