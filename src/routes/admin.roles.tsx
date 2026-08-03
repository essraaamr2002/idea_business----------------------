import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { listRolePermissions } from "@/lib/admin-members.functions";

export const Route = createFileRoute("/admin/roles")({
  component: RolesMatrix,
});

const ROLES = ["admin", "moderator", "accountant", "support", "seo"] as const;

function RolesMatrix() {
  const fetchPerms = useServerFn(listRolePermissions);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "role_permissions"],
    queryFn: () => fetchPerms(),
  });

  // Build perm → roles map
  const map: Record<string, Set<string>> = {};
  for (const row of (data ?? []) as any[]) {
    (map[row.permission] ||= new Set()).add(row.role);
  }
  const perms = Object.keys(map).sort();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>مصفوفة الأدوار والصلاحيات</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            عرض للقراءة فقط لصلاحيات كل دور. لتعديل أدوار مستخدم محدد افتح صفحة <strong>الأعضاء</strong> → الأدوار.
          </p>
          {isLoading ? (
            <p className="text-muted-foreground">جاري التحميل…</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الصلاحية</TableHead>
                    {ROLES.map((r) => <TableHead key={r} className="text-center">{r}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perms.map((p) => (
                    <TableRow key={p}>
                      <TableCell className="font-mono text-xs">{p}</TableCell>
                      {ROLES.map((r) => (
                        <TableCell key={r} className="text-center">
                          {map[p].has(r) ? <Badge variant="default">✓</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {perms.length === 0 && (
                    <TableRow><TableCell colSpan={ROLES.length + 1} className="text-center text-muted-foreground">لا توجد صلاحيات مسجلة.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
