import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookmarkX, Bookmark } from "lucide-react";
import { useEffect, useState } from "react";

const K = "read_later_v1";
type Item = { id: string; title: string; url: string; addedAt: number };

export const Route = createFileRoute("/read-later")({
  head: () => ({ meta: [{ title: "قراءة لاحقاً — IDEA BUSINESS" }] }),
  component: ReadLater,
});

export function readLaterAdd(item: Omit<Item, "addedAt">) {
  try {
    const list: Item[] = JSON.parse(localStorage.getItem(K) || "[]");
    if (list.find((i) => i.id === item.id)) return;
    list.unshift({ ...item, addedAt: Date.now() });
    localStorage.setItem(K, JSON.stringify(list.slice(0, 100)));
  } catch {}
}

function ReadLater() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(K) || "[]")) } catch {} }, []);
  const remove = (id: string) => { const n = items.filter((i) => i.id !== id); setItems(n); localStorage.setItem(K, JSON.stringify(n)); };
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black flex items-center gap-2"><Bookmark className="h-7 w-7 text-primary" /> قائمة القراءة لاحقاً</h1>
      <p className="mt-2 text-sm text-muted-foreground">احفظ المشاريع والمقالات وعد إليها وقت الفراغ.</p>
      <div className="mt-6 space-y-2">
        {items.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">لا يوجد عناصر محفوظة بعد.</CardContent></Card>}
        {items.map((i) => (
          <Card key={i.id}>
            <CardContent className="flex items-center justify-between p-3">
              <Link to={i.url as any} className="flex-1 truncate font-bold hover:text-primary">{i.title}</Link>
              <Button size="icon" variant="ghost" onClick={() => remove(i.id)}><BookmarkX className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
