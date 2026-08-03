import { describe, expect, it } from "vitest";
import {
  buildSearchBlob,
  filterRows,
  sortRows,
  toggleCompareItem,
} from "../lib/platform-projects-filters";

const ROWS = [
  { id: "a", name: "مشروع زراعي", description: "خضار", sector: "agri", country: "SA", current_price: 100, created_at: "2026-06-01", ends_at: "2026-07-01" },
  { id: "b", name: "متجر إلكتروني", description: "تجارة", sector: "retail", country: "EG", current_price: 50, created_at: "2026-06-10", ends_at: "2026-06-30" },
  { id: "c", name: "ستارت أب AI", description: "ذكاء اصطناعي", sector: "tech", country: "AE", current_price: 500, created_at: "2026-06-20", ends_at: "2026-08-01" },
];

describe("filterRows", () => {
  it("returns original array when no filters", () => {
    expect(filterRows(ROWS, {})).toBe(ROWS);
  });
  it("filters by sector", () => {
    expect(filterRows(ROWS, { sector: "tech" }).map((r) => r.id)).toEqual(["c"]);
  });
  it("filters by country", () => {
    expect(filterRows(ROWS, { country: "EG" }).map((r) => r.id)).toEqual(["b"]);
  });
  it("filters by Arabic search", () => {
    expect(filterRows(ROWS, { q: "زراعي" }).map((r) => r.id)).toEqual(["a"]);
  });
  it("filters by case-insensitive english search", () => {
    expect(filterRows(ROWS, { q: "TECH" }).map((r) => r.id)).toEqual(["c"]);
  });
  it("combines filters", () => {
    expect(filterRows(ROWS, { q: "متجر", country: "EG" }).map((r) => r.id)).toEqual(["b"]);
  });
});

describe("buildSearchBlob", () => {
  it("lowercases and joins searchable fields", () => {
    expect(buildSearchBlob({ name: "Foo", sector: "Tech" })).toBe("foo tech");
  });
  it("ignores nullish", () => {
    expect(buildSearchBlob(null)).toBe("");
  });
});

describe("sortRows", () => {
  it("sorts price asc", () => {
    expect(sortRows(ROWS, "price_asc").map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
  it("sorts price desc", () => {
    expect(sortRows(ROWS, "price_desc").map((r) => r.id)).toEqual(["c", "a", "b"]);
  });
  it("sorts newest first by default", () => {
    expect(sortRows(ROWS, "newest").map((r) => r.id)).toEqual(["c", "b", "a"]);
  });
  it("sorts ending soon", () => {
    expect(sortRows(ROWS, "ending_soon").map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
  it("does not mutate input", () => {
    const before = ROWS.map((r) => r.id);
    sortRows(ROWS, "price_desc");
    expect(ROWS.map((r) => r.id)).toEqual(before);
  });
});

describe("toggleCompareItem", () => {
  it("adds item when missing", () => {
    const { next, error } = toggleCompareItem([], ROWS[0]);
    expect(next.map((r) => r.id)).toEqual(["a"]);
    expect(error).toBeUndefined();
  });
  it("removes item when present", () => {
    const { next } = toggleCompareItem([ROWS[0]], ROWS[0]);
    expect(next).toEqual([]);
  });
  it("rejects beyond max", () => {
    const { next, error } = toggleCompareItem(ROWS, { id: "d" } as any, 3);
    expect(error).toBeTruthy();
    expect(next).toEqual(ROWS);
  });
});
