import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandWatermark } from "@/components/BrandWatermark";
import {
  DEFAULT_WATERMARK,
  useWatermarkSettings,
  type WatermarkPosition,
} from "@/lib/watermark-settings";

export const Route = createFileRoute("/admin/watermark")({
  component: WatermarkAdminPage,
  head: () => ({
    meta: [
      { title: "إعدادات الشعار الثابت — IDEA BUSINESS" },
      { name: "description", content: "تحكّم بظهور الشعار الثابت في كل صفحات المنصة." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const POSITIONS: { value: WatermarkPosition; label: string }[] = [
  { value: "bottom-left", label: "أسفل-يسار" },
  { value: "bottom-right", label: "أسفل-يمين" },
  { value: "top-left", label: "أعلى-يسار" },
  { value: "top-right", label: "أعلى-يمين" },
];

function WatermarkAdminPage() {
  const [s, set] = useWatermarkSettings();
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground">إعدادات الشعار الثابت (Watermark)</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              يتحكم بمظهر شارة الشعار التي تظهر في كل صفحات المنصة. التغييرات تُحفظ محلياً وتُطبَّق فوراً.
            </p>
          </div>
          <Link to="/admin" className="text-sm font-bold text-primary hover:underline">← لوحة الإدارة</Link>
        </header>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
          {/* Enabled */}
          <label className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-card-foreground">تفعيل الشعار الثابت</div>
              <p className="text-xs text-muted-foreground">إخفاؤه نهائياً من كل الصفحات.</p>
            </div>
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={(e) => set({ ...s, enabled: e.target.checked })}
              className="h-5 w-5 accent-primary"
            />
          </label>

          {/* Show on mobile */}
          <label className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-card-foreground">عرضه على الشاشات الصغيرة</div>
              <p className="text-xs text-muted-foreground">إظهار الشارة على الهواتف أيضاً (مرفوع فوق الشريط السفلي تلقائياً).</p>
            </div>
            <input
              type="checkbox"
              checked={s.showOnMobile}
              onChange={(e) => set({ ...s, showOnMobile: e.target.checked })}
              className="h-5 w-5 accent-primary"
            />
          </label>

          {/* Opacity */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="op" className="font-bold text-card-foreground">العتامة (Opacity)</label>
              <span className="font-mono text-xs text-muted-foreground">{Math.round(s.opacity * 100)}%</span>
            </div>
            <input
              id="op"
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={s.opacity}
              onChange={(e) => set({ ...s, opacity: parseFloat(e.target.value) })}
              className="mt-2 w-full accent-primary"
            />
          </div>

          {/* Position */}
          <div>
            <div className="font-bold text-card-foreground">الموضع على الشاشة</div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {POSITIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set({ ...s, position: p.value })}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
                    s.position === p.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => set(DEFAULT_WATERMARK)}
              className="rounded-md bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground hover:opacity-90"
            >
              إعادة للإعدادات الافتراضية
            </button>
            <Link
              to="/admin/brand-kit"
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
            >
              دليل الهوية الكامل ←
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          <strong className="text-card-foreground">معاينة حيّة:</strong> الشارة الظاهرة حالياً في الزاوية هي نفسها التي تتأثر بهذه الإعدادات.
        </section>
      </div>
      {/* Ensure preview reflects current admin edits even on this page */}
      <BrandWatermark />
    </div>
  );
}
