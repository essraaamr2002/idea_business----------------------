import { useState, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { listSettings, updateSetting } from "@/lib/admin-settings.functions";
import { Search } from "lucide-react";

type Setting = {
  key: string; value: any; category: string; label: string;
  description: string | null; value_type: string; updated_at: string;
};

function unwrap(v: any): any {
  if (typeof v === "string") return v.replace(/^"|"$/g, "");
  return v;
}

export function SettingsEditor({ category, hideSearch = false }: { category?: string; hideSearch?: boolean }) {
  const list = useServerFn(listSettings);
  const update = useServerFn(updateSetting);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Record<string, any>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings", category ?? "all"],
    queryFn: () => list({ data: { category } }),
  });

  useEffect(() => {
    if (data) {
      const d: Record<string, any> = {};
      for (const s of data as Setting[]) d[s.key] = s.value;
      setDraft(d);
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => update({ data: { key, value } }),
    onSuccess: () => { toast.success("تم الحفظ"); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: any) => toast.error(e?.message ?? "فشل الحفظ"),
  });

  const filtered = useMemo(() => {
    const arr = (data ?? []) as Setting[];
    const q = search.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter((s) => s.key.toLowerCase().includes(q) || s.label.toLowerCase().includes(q));
  }, [data, search]);

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      {!hideSearch && (
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث في المفاتيح..." className="pr-9" />
        </div>
      )}
      <div className="grid gap-3">
        {filtered.map((s) => {
          const val = draft[s.key];
          const setVal = (v: any) => setDraft((d) => ({ ...d, [s.key]: v }));
          return (
            <Card key={s.key}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 min-w-0">
                    <Label className="font-semibold">{s.label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5"><code className="font-mono">{s.key}</code>{s.description ? ` — ${s.description}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 md:w-1/2">
                    {s.value_type === "boolean" ? (
                      <Switch checked={val === true || val === "true"} onCheckedChange={(c) => setVal(c)} />
                    ) : s.value_type === "json" || s.value_type === "textarea" ? (
                      <Textarea value={typeof val === "string" ? val : JSON.stringify(val ?? "", null, 2)} onChange={(e) => {
                        try { setVal(s.value_type === "json" ? JSON.parse(e.target.value) : e.target.value); }
                        catch { setVal(e.target.value); }
                      }} className="font-mono text-xs" rows={3} />
                    ) : s.value_type === "number" ? (
                      <Input type="number" value={String(unwrap(val) ?? "")} onChange={(e) => setVal(e.target.value === "" ? null : Number(e.target.value))} />
                    ) : (
                      <Input value={String(unwrap(val) ?? "")} onChange={(e) => setVal(e.target.value)} />
                    )}
                    <Button size="sm" disabled={mut.isPending} onClick={() => mut.mutate({ key: s.key, value: val })}>حفظ</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <div className="text-center text-muted-foreground py-8">لا توجد مفاتيح مطابقة.</div>}
      </div>
    </div>
  );
}
