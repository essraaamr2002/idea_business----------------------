import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Search } from "lucide-react";

export const Route = createFileRoute("/admin/intel")({
  component: IntelPage,
});

function IntelPage() {
  const [q, setQ] = useState("");
  const term = q.trim();
  const { data, isFetching } = useQuery({
    queryKey: ["admin", "global-search", term],
    queryFn: async () => {
      if (term.length < 2) return { users: [], projects: [], disputes: [] };
      const like = `%${term}%`;
      const [users, projects, disputes] = await Promise.all([
        supabase.from("profiles").select("id,email,full_name").or(`email.ilike.${like},full_name.ilike.${like}`).limit(15),
        supabase.from("projects").select("id,title,status").ilike("title", like).limit(15),
        supabase.from("disputes").select("id,subject,status").ilike("subject", like).limit(15),
      ]);
      return { users: users.data ?? [], projects: projects.data ?? [], disputes: disputes.data ?? [] };
    },
    enabled: term.length >= 2,
  });

  return (
    <AdminPageShell
      title="البحث الذكي والاستخبارات"
      description="بحث موحّد عبر المستخدمين، المشاريع، النزاعات — مع وسوم ذكية وربط كيانات"
      icon={Search}
    >
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن مستخدم، مشروع، نزاع…" className="pe-10" />
          </div>
          {term.length > 0 && term.length < 2 && <p className="text-xs text-muted-foreground mt-2">أدخل حرفين على الأقل…</p>}
        </CardContent>
      </Card>

      {term.length >= 2 && (
        <div className="grid gap-3 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">المستخدمون ({data?.users.length ?? 0})</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm max-h-80 overflow-y-auto">
              {isFetching ? "…" : (data?.users ?? []).map((u: any) => (
                <div key={u.id} className="border-b py-1.5">
                  <div className="font-medium">{u.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">المشاريع ({data?.projects.length ?? 0})</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm max-h-80 overflow-y-auto">
              {(data?.projects ?? []).map((p: any) => (
                <div key={p.id} className="border-b py-1.5 flex justify-between">
                  <span className="truncate">{p.title}</span>
                  <Badge variant="outline">{p.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">النزاعات ({data?.disputes.length ?? 0})</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm max-h-80 overflow-y-auto">
              {(data?.disputes ?? []).map((d: any) => (
                <div key={d.id} className="border-b py-1.5 flex justify-between">
                  <span className="truncate">{d.subject}</span>
                  <Badge variant="outline">{d.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminPageShell>
  );
}
