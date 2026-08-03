import { createFileRoute, Link } from "@tanstack/react-router";
import brandLogo from "@/assets/haraj-mashare3-logo.jpeg.asset.json";

export const Route = createFileRoute("/admin/brand-kit")({
  component: BrandKitPage,
  head: () => ({
    meta: [
      { title: "دليل الهوية البصرية — IDEA BUSINESS" },
      { name: "description", content: "الشعار الرسمي، الألوان، الأيقونات، وروابط الأصول الخاصة بهوية IDEA BUSINESS." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const ICON_FILES = [
  { name: "/favicon.ico", purpose: "أيقونة المتصفح (ICO متعدد الأحجام 16/32/48)" },
  { name: "/icon-16.png", purpose: "أيقونة ٓFavicon صغيرة (16×16)" },
  { name: "/icon-32.png", purpose: "أيقونة Favicon (32×32)" },
  { name: "/icon-192.png", purpose: "أيقونة PWA (192×192)" },
  { name: "/icon-512.png", purpose: "أيقونة PWA كبيرة (512×512)" },
  { name: "/apple-touch-icon.png", purpose: "أيقونة iOS Home Screen (180×180)" },
  { name: "/og-logo.png", purpose: "شعار للمشاركة (512×512)" },
  { name: "/og-image.jpg", purpose: "بطاقة المشاركة على وسائل التواصل (1200×630)" },
  { name: "/manifest.webmanifest", purpose: "ملف PWA Manifest" },
];

const COLORS = [
  { name: "Primary — Cyan", token: "--primary", hex: "oklch(0.68 0.14 210)", className: "bg-primary" },
  { name: "Accent — Lime", token: "--accent", hex: "oklch(0.88 0.16 130)", className: "bg-accent" },
  { name: "Brand Deep Teal", token: "--ib-deep", hex: "oklch(0.30 0.10 220)", className: "bg-ib-deep" },
  { name: "Brand Cyan", token: "--ib-cyan", hex: "oklch(0.72 0.14 200)", className: "bg-ib-cyan" },
  { name: "Brand Neon (Lime)", token: "--ib-neon", hex: "oklch(0.86 0.17 135)", className: "bg-ib-neon" },
  { name: "Background", token: "--background", hex: "oklch(0.985 0.005 200)", className: "bg-background border border-border" },
  { name: "Foreground (Text)", token: "--foreground", hex: "oklch(0.22 0.04 235)", className: "bg-foreground" },
  { name: "Muted Surface", token: "--muted", hex: "oklch(0.965 0.012 220)", className: "bg-muted" },
];

function BrandKitPage() {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground">دليل الهوية — IDEA BUSINESS</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              مرجع رسمي للشعار، الألوان، وأصول الأيقونات. استخدمه في كل المواد المرئية والمشاركات الخارجية.
            </p>
          </div>
          <Link to="/admin" className="text-sm font-bold text-primary hover:underline">← لوحة الإدارة</Link>
        </header>

        {/* Logo card */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-card-foreground">الشعار الرسمي</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[260px_1fr]">
            <div className="rounded-xl bg-[oklch(0.98_0.005_200)] p-4 ring-1 ring-border">
              <img src={brandLogo.url} alt="IDEA BUSINESS — IDEA BUSINESS" className="h-48 w-full object-contain" />
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-card-foreground">
                <strong>الاسم العربي:</strong> IDEA BUSINESS
              </p>
              <p className="text-muted-foreground">
                <strong>الشعار البصري:</strong> شجرة نخيل أسلوبية متشابكة مع حرف B باللونين السماوي والتركوازي، يرمز للنماء والجذور المحلية لمشاريع الشرق الأوسط وشمال إفريقيا.
              </p>
              <p className="text-muted-foreground">
                <strong>التاجلاين:</strong> «مشاريع دول الشرق الأوسط وشمال إفريقيا — حيث تتداول الأفكار وتنمو الاستثمارات.»
              </p>
              <p className="text-muted-foreground">
                <strong>قواعد الاستخدام:</strong> لا تُغيّر ألوان الشعار ولا تُشوّه نسبه؛ احتفظ بمساحة فارغة حوله لا تقل عن نصف ارتفاع شجرة الشعار.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <a href={brandLogo.url} download className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90">تحميل الشعار JPG</a>
                <a href="/og-logo.png" download className="rounded-md bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground hover:opacity-90">تحميل PNG 512</a>
                <a href="/og-image.jpg" download className="rounded-md bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground hover:opacity-90">بطاقة OG 1200×630</a>
              </div>
            </div>
          </div>
        </section>

        {/* Colors */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-card-foreground">لوحة الألوان</h2>
          <p className="mt-1 text-sm text-muted-foreground">جميع الألوان معرّفة كرموز Tailwind v4 في <code className="rounded bg-muted px-1.5 py-0.5">src/styles.css</code>.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {COLORS.map((c) => (
              <div key={c.token} className="rounded-xl border border-border overflow-hidden">
                <div className={`h-20 ${c.className}`} />
                <div className="p-3 text-xs">
                  <div className="font-bold text-card-foreground">{c.name}</div>
                  <div className="font-mono text-muted-foreground">{c.token}</div>
                  <div className="font-mono text-muted-foreground">{c.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Icons & Files */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-card-foreground">ملفات الأيقونات والـ Metadata</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-right text-xs font-bold text-muted-foreground">
                <tr><th className="py-2 px-3">المعاينة</th><th className="py-2 px-3">الملف</th><th className="py-2 px-3">الغرض</th><th className="py-2 px-3">الرابط</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ICON_FILES.map((f) => (
                  <tr key={f.name}>
                    <td className="py-2 px-3">
                      {f.name.match(/\.(png|jpg|ico)$/i) ? (
                        <img src={f.name} alt="" className="h-10 w-10 rounded object-contain ring-1 ring-border" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs text-card-foreground">{f.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{f.purpose}</td>
                    <td className="py-2 px-3"><a className="text-primary hover:underline" href={f.name} target="_blank" rel="noreferrer">فتح</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Metadata reference */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-card-foreground">مرجع وسوم Metadata الرسمية</h2>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-xs text-card-foreground" dir="ltr">{`<title>IDEA BUSINESS — مشاريع دول الشرق الأوسط وشمال إفريقيا</title>
<meta name="description" content="IDEA BUSINESS: منصة عربية لتداول الأفكار وتنمية الاستثمارات…">
<meta property="og:site_name" content="IDEA BUSINESS">
<meta property="og:image" content="https://busniss.org/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">`}</pre>
        </section>
      </div>
    </div>
  );
}
