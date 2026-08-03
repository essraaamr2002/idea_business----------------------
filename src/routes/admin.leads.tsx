import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminLeads, updateLeadStatus } from "@/lib/leads.functions";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Download, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/leads")({
  head: () => ({ meta: [{ title: "العملاء المحتملون | لوحة الإدارة" }] }),
  component: LeadsAdmin,
});

const STATUSES = ["new", "contacted", "qualified", "converted", "rejected"] as const;
const STATUS_LABEL: Record<string, string> = {
  new: "جديد", contacted: "تم التواصل", qualified: "مؤهّل", converted: "تحوّل لعميل", rejected: "مرفوض",
};

function LeadsAdmin() {
  const listFn = useServerFn(listAdminLeads);
  const updateFn = useServerFn(updateLeadStatus);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: () => listFn({ data: { limit: 500 } }),
  });

  const leads = data?.leads ?? [];

  const exportCsv = () => {
    const rows = [["الاسم", "الجوال", "البريد", "القناة", "الحالة", "التاريخ"]];
    for (const l of leads) rows.push([l.full_name ?? "", l.phone ?? "", l.email ?? "", l.channel ?? "", l.status, l.created_at]);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await updateFn({ data: { id, status: status as never } });
      toast.success("تم التحديث");
      refetch();
    } catch (e) { toast.error((e as Error).message); }
  };

  const byStatus = (s: string) => leads.filter((l: any) => l.status === s).length;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <PageHeader icon={<Users className="h-6 w-6" />} title="العملاء المحتملون (Leads)" subtitle="جهات الاتصال المُستوردة عبر مشاركات الأعضاء — جاهزة للتسويق." />

        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-6">
          {STATUSES.map((s) => (
            <Card key={s}><CardContent className="p-3 text-center">
              <div className="text-[11px] text-muted-foreground">{STATUS_LABEL[s]}</div>
              <div className="text-xl font-black">{byStatus(s)}</div>
            </CardContent></Card>
          ))}
          <Card><CardContent className="p-3 text-center">
            <div className="text-[11px] text-muted-foreground">الإجمالي</div>
            <div className="text-xl font-black text-primary">{leads.length}</div>
          </CardContent></Card>
        </div>

        <div className="mb-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}>تحديث</Button>
          <Button size="sm" onClick={exportCsv} disabled={!leads.length}><Download className="me-1 h-4 w-4" />تصدير CSV</Button>
        </div>

        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="p-2 text-start">الاسم</th>
                <th className="p-2 text-start">الجوال</th>
                <th className="p-2 text-start">البريد</th>
                <th className="p-2 text-start">القناة</th>
                <th className="p-2 text-start">كود الإحالة</th>
                <th className="p-2 text-start">الحالة</th>
                <th className="p-2 text-start">التاريخ</th>
                <th className="p-2 text-start">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">جارٍ التحميل…</td></tr> :
                leads.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">لا توجد بيانات بعد.</td></tr> :
                leads.map((l: any) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-2 font-bold">{l.full_name || "—"}</td>
                    <td className="p-2 font-mono text-xs">{l.phone ? <a href={`tel:${l.phone}`} className="text-primary"><Phone className="inline h-3 w-3" /> {l.phone}</a> : "—"}</td>
                    <td className="p-2 font-mono text-xs">{l.email ? <a href={`mailto:${l.email}`} className="text-primary"><Mail className="inline h-3 w-3" /> {l.email}</a> : "—"}</td>
                    <td className="p-2"><Badge variant="outline">{l.channel || "—"}</Badge></td>
                    <td className="p-2 font-mono text-xs">{l.referral_code || "—"}</td>
                    <td className="p-2"><Badge>{STATUS_LABEL[l.status] || l.status}</Badge></td>
                    <td className="p-2 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString("ar")}</td>
                    <td className="p-2">
                      <select value={l.status} onChange={(e) => setStatus(l.id, e.target.value)} className="rounded border bg-background px-2 py-1 text-xs">
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </CardContent></Card>
      </main>
    </div>
  );
}
