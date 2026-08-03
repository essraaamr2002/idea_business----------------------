import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { listCommunityPosts, moderatePost } from "@/lib/admin-moderation.functions";

export const Route = createFileRoute("/admin/content")({
  component: ContentPage,
});

function ContentPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCommunityPosts);
  const moderate = useServerFn(moderatePost);
  const [status, setStatus] = useState<string>("all");
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "posts", status, query],
    queryFn: () => list({ data: { status: status === "all" ? undefined : status, query: query || undefined, limit: 100 } }),
  });

  const act = useMutation({
    mutationFn: (v: { postId: string; action: "hide" | "publish" | "delete"; reason: string }) =>
      moderate({ data: v }),
    onSuccess: () => { toast.success("تم"); qc.invalidateQueries({ queryKey: ["admin", "posts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  function ask(action: "hide" | "publish" | "delete", postId: string) {
    const reason = prompt(`السبب لـ ${action}`);
    if (reason && reason.length >= 3) act.mutate({ postId, action, reason });
  }

  return (
    <Card>
      <CardHeader><CardTitle>المحتوى والمجتمع</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="بحث في المحتوى" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="published">منشور</SelectItem>
              <SelectItem value="hidden">مخفي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading && <p className="text-muted-foreground">…</p>}
        <div className="space-y-3">
          {(data ?? []).map((p: any) => (
            <div key={p.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground font-mono">
                  {p.user_id.slice(0, 8)} • {new Date(p.created_at).toLocaleString("ar")}
                </div>
                <div className="flex gap-1">
                  <Badge variant="outline">{p.post_type}</Badge>
                  <Badge variant={p.status === "published" ? "default" : "secondary"}>{p.status}</Badge>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm">{p.content}</p>
              {(p.media_urls ?? []).length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {p.media_urls.map((u: string, i: number) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer" className="text-xs text-primary underline">وسائط {i + 1}</a>
                  ))}
                </div>
              )}
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>❤ {p.likes_count}</span>
                <span>💬 {p.comments_count}</span>
                <span>🔁 {p.reposts_count}</span>
              </div>
              <div className="flex gap-2">
                {p.status === "published"
                  ? <Button size="sm" variant="secondary" onClick={() => ask("hide", p.id)}>إخفاء</Button>
                  : <Button size="sm" variant="default" onClick={() => ask("publish", p.id)}>إعادة نشر</Button>}
                <Button size="sm" variant="destructive" onClick={() => ask("delete", p.id)}>حذف</Button>
              </div>
            </div>
          ))}
          {!isLoading && (data ?? []).length === 0 && <p className="text-muted-foreground">لا توجد منشورات.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
