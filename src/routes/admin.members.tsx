import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  listMembers, updateMemberFlags, grantRole, revokeRole,
} from "@/lib/admin-members.functions";

export const Route = createFileRoute("/admin/members")({
  component: MembersPage,
});

const ROLES = ["admin", "moderator", "seo", "accountant", "support"] as const;

function MembersPage() {
  const qc = useQueryClient();
  const fetchMembers = useServerFn(listMembers);
  const [query, setQuery] = useState("");
  const [kyc, setKyc] = useState<string>("all");
  const [membership, setMembership] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "members", query, kyc, membership],
    queryFn: () => fetchMembers({
      data: {
        query: query || undefined,
        kycStatus: kyc === "all" ? undefined : kyc,
        membership: membership === "all" ? undefined : membership,
        limit: 50,
      },
    }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>الأعضاء</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="ابحث بالاسم، الهاتف، أو UUID"
              value={query} onChange={(e) => setQuery(e.target.value)}
              className="max-w-md"
            />
            <Select value={kyc} onValueChange={setKyc}>
              <SelectTrigger className="w-44"><SelectValue placeholder="حالة KYC" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل حالات KYC</SelectItem>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="submitted">submitted</SelectItem>
                <SelectItem value="verified">verified</SelectItem>
                <SelectItem value="rejected">rejected</SelectItem>
                <SelectItem value="unverified">unverified</SelectItem>
              </SelectContent>
            </Select>
            <Select value={membership} onValueChange={setMembership}>
              <SelectTrigger className="w-40"><SelectValue placeholder="العضوية" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العضويات</SelectItem>
                <SelectItem value="basic">basic</SelectItem>
                <SelectItem value="full">full</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>الدولة</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead>العضوية</TableHead>
                  <TableHead>الأدوار</TableHead>
                  <TableHead className="text-end">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">…</TableCell></TableRow>
                )}
                {!isLoading && (data?.rows ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">لا توجد نتائج</TableCell></TableRow>
                )}
                {(data?.rows ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.display_name || "—"}
                      {r.verified_blue && <Badge className="ms-2" variant="default">✔</Badge>}
                      {r.verified_green && <Badge className="ms-2" variant="secondary">KYC</Badge>}
                      <div className="text-xs text-muted-foreground font-mono">{r.id.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell>{r.phone || "—"}</TableCell>
                    <TableCell>{r.country || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{r.kyc_status}</Badge></TableCell>
                    <TableCell><Badge>{r.membership}</Badge></TableCell>
                    <TableCell className="text-xs">
                      {(r.roles ?? []).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-end space-x-1 space-x-reverse">
                      <MemberFlagsDialog member={r} onDone={() => qc.invalidateQueries({ queryKey: ["admin", "members"] })} />
                      <RolesDialog member={r} onDone={() => qc.invalidateQueries({ queryKey: ["admin", "members"] })} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">المجموع: {data?.count ?? 0}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function MemberFlagsDialog({ member, onDone }: { member: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [membership, setMembership] = useState(member.membership);
  const [vBlue, setVBlue] = useState(!!member.verified_blue);
  const [vGreen, setVGreen] = useState(!!member.verified_green);
  const [reason, setReason] = useState("");
  const update = useServerFn(updateMemberFlags);
  const m = useMutation({
    mutationFn: () => update({
      data: { userId: member.id, membership, verifiedBlue: vBlue, verifiedGreen: vGreen, reason },
    }),
    onSuccess: () => { toast.success("تم التحديث"); setOpen(false); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">تعديل</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>تعديل بيانات العضو</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>العضوية</Label>
            <Select value={membership} onValueChange={(v) => setMembership(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">basic</SelectItem>
                <SelectItem value="full">full</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <Label>توثيق أزرق</Label>
            <Switch checked={vBlue} onCheckedChange={setVBlue} />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <Label>توثيق أخضر (KYC)</Label>
            <Switch checked={vGreen} onCheckedChange={setVGreen} />
          </div>
          <div>
            <Label>السبب (إلزامي)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={reason.length < 3 || m.isPending} onClick={() => m.mutate()}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RolesDialog({ member, onDone }: { member: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<typeof ROLES[number]>("moderator");
  const g = useServerFn(grantRole);
  const r = useServerFn(revokeRole);
  const grant = useMutation({
    mutationFn: () => g({ data: { userId: member.id, role } }),
    onSuccess: () => { toast.success("تم منح الدور"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: (rl: string) => r({ data: { userId: member.id, role: rl as any } }),
    onSuccess: () => { toast.success("تم سحب الدور"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="secondary">الأدوار</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>أدوار العضو</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {(member.roles ?? []).length === 0 && <span className="text-sm text-muted-foreground">لا توجد أدوار</span>}
            {(member.roles ?? []).map((rl: string) => (
              <Badge key={rl} variant="secondary" className="cursor-pointer" onClick={() => revoke.mutate(rl)}>
                {rl} ✕
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => grant.mutate()} disabled={grant.isPending}>إضافة</Button>
          </div>
          <p className="text-xs text-muted-foreground">انقر على الدور لسحبه.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
