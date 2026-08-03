import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { unifiedSearch } from "@/lib/search-unified.functions";
import { Search, FileText, FolderKanban, User, Loader2 } from "lucide-react";

const KIND_ICON: Record<string, any> = { project: FolderKanban, article: FileText, user: User };
const KIND_LABEL: Record<string, string> = { project: "مشروع", article: "مقال", user: "مستخدم" };

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => z.object({ q: z.string().default("") }).parse(s),
  component: Page,
});

function Page() {
  const { q } = Route.useSearch();
  const search = useServerFn(unifiedSearch);
  const { data = [], isLoading } = useQuery({
    queryKey: ["unified-search", q],
    queryFn: () => search({ data: { q, limit: 50 } }),
    enabled: q.length >= 2,
  });

  return (
    <div dir="rtl" className="container mx-auto max-w-3xl py-8">
      <div className="mb-6 flex items-center gap-2">
        <Search className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">نتائج البحث</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        البحث عن: <span className="font-bold text-foreground">"{q}"</span>
      </p>
      {q.length < 2 ? (
        <div className="rounded-xl border bg-muted/30 p-8 text-center text-muted-foreground">اكتب كلمتين على الأقل للبحث</div>
      ) : isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border bg-muted/30 p-8 text-center text-muted-foreground">لا توجد نتائج</div>
      ) : (
        <ul className="space-y-2">
          {(data as any[]).map((r) => {
            const Icon = KIND_ICON[r.kind] || Search;
            return (
              <li key={`${r.kind}-${r.id}`}>
                <Link to={r.url as any} className="flex items-start gap-3 rounded-xl border bg-card p-4 hover:border-primary">
                  <Icon className="mt-1 h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{r.title}</h3>
                      <span className="text-[10px] rounded bg-muted px-1.5 py-0.5">{KIND_LABEL[r.kind]}</span>
                    </div>
                    {r.snippet && <p className="mt-1 text-sm text-muted-foreground">{r.snippet}</p>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
