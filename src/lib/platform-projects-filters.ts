// Pure helpers extracted from PlatformProjectsPage for testability and reuse.
// Keep dependency-free so they can run under vitest without DOM.

export type SortKey = "newest" | "price_asc" | "price_desc" | "ending_soon";

export type FilterInput = {
  q?: string;
  sector?: string;
  country?: string;
};

export function buildSearchBlob(p: any): string {
  if (!p || typeof p !== "object") return "";
  return [p.name, p.description, p.sector, p.country, p.ticker]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterRows<T extends Record<string, any>>(
  rows: T[],
  { q = "", sector = "", country = "" }: FilterInput,
  getBlob: (row: T) => string = buildSearchBlob,
): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle && !sector && !country) return rows;
  const out: T[] = [];
  for (const p of rows) {
    if (sector && p.sector !== sector) continue;
    if (country && p.country !== country) continue;
    if (needle && !getBlob(p).includes(needle)) continue;
    out.push(p);
  }
  return out;
}

export function sortRows<T extends Record<string, any>>(
  rows: T[],
  sortBy: SortKey,
  isAuction = false,
): T[] {
  if (rows.length < 2) return rows;
  const priceOf = (r: any) =>
    Number((isAuction ? r.current_price ?? r.start_price : r.current_price ?? r.share_price) || 0);
  const arr = rows.slice();
  switch (sortBy) {
    case "price_asc":
      return arr.sort((a, b) => priceOf(a) - priceOf(b));
    case "price_desc":
      return arr.sort((a, b) => priceOf(b) - priceOf(a));
    case "ending_soon":
      return arr.sort(
        (a, b) => new Date(a.ends_at || 0).getTime() - new Date(b.ends_at || 0).getTime(),
      );
    default:
      return arr.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      );
  }
}

export function toggleCompareItem<T extends { id: string }>(
  current: T[],
  item: T,
  max = 3,
): { next: T[]; error?: string } {
  if (current.find((x) => x.id === item.id)) {
    return { next: current.filter((x) => x.id !== item.id) };
  }
  if (current.length >= max) {
    return { next: current, error: `الحد الأقصى ${max} مشاريع للمقارنة` };
  }
  return { next: [...current, item] };
}
