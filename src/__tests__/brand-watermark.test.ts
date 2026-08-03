import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * BrandWatermark ظهور على جميع الصفحات
 * ============================================
 * الشارة مركّبة مرّة واحدة في src/routes/__root.tsx ضمن RootComponent،
 * فتظهر تلقائياً في كل المسارات لأنها داخل الـ shell الرئيسي.
 *
 * أي صفحة تحتاج إخفاءها يجب أن تُدرَج صراحةً في WATERMARK_OPT_OUT أدناه.
 */
const WATERMARK_OPT_OUT: string[] = [
  // مثال: "src/routes/some-fullscreen-experience.tsx"
];

const ROOT = "src/routes/__root.tsx";

describe("BrandWatermark — coverage across all routes", () => {
  it("mounted globally in __root.tsx", () => {
    const root = readFileSync(ROOT, "utf8");
    expect(root).toMatch(/import\s*{\s*BrandWatermark\s*}\s*from\s*["']@\/components\/BrandWatermark["']/);
    expect(root).toMatch(/<BrandWatermark\s*\/>/);
  });

  it("no route file overrides the global shell to remove BrandWatermark", () => {
    const routes = listRoutes("src/routes");
    const violations: string[] = [];
    for (const file of routes) {
      if (file.endsWith("__root.tsx")) continue;
      if (WATERMARK_OPT_OUT.includes(file)) continue;
      const src = readFileSync(file, "utf8");
      // Routes shouldn't manually mount the watermark again (would duplicate).
      const mounts = (src.match(/<BrandWatermark\b/g) || []).length;
      // admin/watermark renders a local preview; allow but cap.
      const allowed = file.endsWith("admin.watermark.tsx") ? 1 : 0;
      if (mounts > allowed) violations.push(`${file} mounts <BrandWatermark/> ${mounts} times (allowed ${allowed})`);
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("opt-out list is explicit and documented", () => {
    // Force reviewers to keep the opt-out list small and intentional.
    expect(WATERMARK_OPT_OUT.length).toBeLessThanOrEqual(3);
    for (const f of WATERMARK_OPT_OUT) {
      expect(f.startsWith("src/routes/")).toBe(true);
    }
  });

  it("BrandWatermark respects admin settings (enabled/opacity/position/showOnMobile)", () => {
    const src = readFileSync("src/components/BrandWatermark.tsx", "utf8");
    expect(src).toMatch(/useWatermarkSettings/);
    expect(src).toMatch(/s\.enabled/);
    expect(src).toMatch(/s\.opacity/);
    expect(src).toMatch(/s\.position/);
    expect(src).toMatch(/s\.showOnMobile/);
    expect(src).toMatch(/print:hidden/);
  });
});

function listRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listRoutes(p));
    else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith(".gen.ts")) out.push(p);
  }
  return out;
}
