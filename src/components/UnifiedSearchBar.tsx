import { useEffect, useRef, useState } from "react";
import { Search, Loader2, FileText, FolderKanban, User } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { unifiedSearch } from "@/lib/search-unified.functions";
import { Link, useNavigate } from "@tanstack/react-router";

type Result = { kind: string; id: string; title: string; snippet: string; url: string; score: number };

const KIND_ICON: Record<string, any> = { project: FolderKanban, article: FileText, user: User };
const KIND_LABEL: Record<string, string> = { project: "مشروع", article: "مقال", user: "مستخدم" };

export function UnifiedSearchBar({ className }: { className?: string }) {
  const search = useServerFn(unifiedSearch);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setItems([]); setOpen(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await search({ data: { q: term, limit: 10 } });
        setItems(r as Result[]);
        setOpen(true);
      } catch { setItems([]); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`relative ${className ?? ""}`} dir="rtl">
      <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim()) {
              navigate({ to: "/search", search: { q: q.trim() } as any });
              setOpen(false);
            }
          }}
          placeholder="ابحث في المشاريع، المقالات، المستخدمين… (Ctrl+K)"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {open && items.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-xl">
          <ul className="max-h-96 overflow-y-auto">
            {items.map((r) => {
              const Icon = KIND_ICON[r.kind] || Search;
              return (
                <li key={`${r.kind}-${r.id}`}>
                  <Link
                    to={r.url as any}
                    className="flex items-start gap-3 px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => setOpen(false)}
                  >
                    <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{r.title}</span>
                        <span className="text-[10px] text-muted-foreground">{KIND_LABEL[r.kind]}</span>
                      </div>
                      {r.snippet && <p className="truncate text-xs text-muted-foreground">{r.snippet}</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            to="/search"
            search={{ q: q.trim() } as any}
            onClick={() => setOpen(false)}
            className="block border-t bg-muted/30 px-3 py-2 text-center text-xs font-bold text-primary"
          >
            عرض كل النتائج لـ "{q.trim()}" →
          </Link>
        </div>
      )}
    </div>
  );
}
