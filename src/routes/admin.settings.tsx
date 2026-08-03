import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Settings as SettingsIcon } from "lucide-react";
import { listSettings } from "@/lib/admin-settings.functions";
import { SettingsEditor } from "@/components/admin/SettingsEditor";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const list = useServerFn(listSettings);
  const [q, setQ] = useState("");
  const { data } = useQuery({ queryKey: ["admin-settings-all-cats"], queryFn: () => list({ data: {} }) });

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const r of (data ?? []) as any[]) s.add(r.category);
    return Array.from(s).sort();
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">مركز الإعدادات</h1>
          <p className="text-sm text-muted-foreground">أكثر من 200 مفتاح تحكم — تعديل فوري دون نشر كود.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عبر كل الفئات..." className="pr-9" />
      </div>

      {q.trim() ? (
        <SettingsEditor hideSearch />
      ) : (
        <Tabs defaultValue={categories[0] ?? "commissions"} className="w-full">
          <TabsList className="flex flex-wrap h-auto">
            {categories.map((c) => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}
          </TabsList>
          {categories.map((c) => (
            <TabsContent key={c} value={c}>
              <SettingsEditor category={c} hideSearch />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
