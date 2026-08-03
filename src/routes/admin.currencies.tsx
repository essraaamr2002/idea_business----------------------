import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, Save } from "lucide-react";
import { toast } from "sonner";
import { listCurrencies, adminSetSpread } from "@/lib/wallet-fx.functions";

export const Route = createFileRoute("/admin/currencies")({
  component: CurrenciesAdmin,
});

function CurrenciesAdmin() {
  const qc = useQueryClient();
  const fnList = useServerFn(listCurrencies);
  const fnSpread = useServerFn(adminSetSpread);
  const list = useQuery({ queryKey: ["adm-currencies"], queryFn: () => fnList() });
  const [from, setFrom] = useState("SAR");
  const [to, setTo] = useState("AED");
  const [spread, setSpread] = useState("0.5");
  const [fee, setFee] = useState("0.8");

  const mut = useMutation({
    mutationFn: () => fnSpread({ data: { from, to, spreadPct: Number(spread), feePct: Number(fee) } }),
    onSuccess: () => { toast.success("تم الحفظ"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AdminPageShell title="إدارة العملات وأسعار الصرف" description="22 عملة عربية · هوامش الربح · رسوم الصرف" icon={Globe}>
      <Card>
        <CardHeader><CardTitle className="text-base">العملات المدعومة</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr><th className="p-2 text-start">العملة</th><th className="p-2">الكود</th><th className="p-2">الفئة</th><th className="p-2">منازل</th><th className="p-2">الدولة</th><th className="p-2">الحالة</th></tr>
              </thead>
              <tbody>
                {(list.data ?? []).map((c: any) => (
                  <tr key={c.code} className="border-t">
                    <td className="p-2">{c.flag_emoji} {c.name_ar}</td>
                    <td className="p-2 text-center font-mono">{c.code}</td>
                    <td className="p-2 text-center"><Badge variant={c.tier === 1 ? "default" : c.tier === 2 ? "secondary" : "outline"}>T{c.tier}</Badge></td>
                    <td className="p-2 text-center">{c.decimal_places}</td>
                    <td className="p-2 text-center">{c.country_code}</td>
                    <td className="p-2 text-center">{c.receive_only ? <Badge variant="outline">استقبال فقط</Badge> : <Badge>نشطة</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">ضبط هامش وعمولة زوج عملات</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-5">
            <div>
              <Label>من</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(list.data ?? []).map((c: any) => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>إلى</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(list.data ?? []).map((c: any) => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>هامش %</Label><Input type="number" step="0.01" value={spread} onChange={(e) => setSpread(e.target.value)} /></div>
            <div><Label>رسوم %</Label><Input type="number" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} /></div>
            <div className="flex items-end"><Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending}><Save className="h-4 w-4 me-1" />حفظ</Button></div>
          </div>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
