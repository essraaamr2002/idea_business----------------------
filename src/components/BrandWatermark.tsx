import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/haraj-mashare3-logo.jpeg.asset.json";
import { useWatermarkSettings } from "@/lib/watermark-settings";

/**
 * Persistent, subtle brand mark visible on every page.
 * - Position, opacity, enabled state and mobile visibility controlled
 *   via /admin/watermark (stored in localStorage).
 * - Always hidden when printing.
 * - Hidden by default on routes opted-out via data-no-watermark on <body>.
 */
export function BrandWatermark() {
  const [s] = useWatermarkSettings();
  if (!s.enabled) return null;

  const posClass: Record<string, string> = {
    "bottom-left": "bottom-3 left-3 sm:bottom-4 sm:left-4",
    "bottom-right": "bottom-3 right-3 sm:bottom-4 sm:right-4",
    "top-left": "top-16 left-3 sm:top-20 sm:left-4",
    "top-right": "top-16 right-3 sm:top-20 sm:right-4",
  };

  // Lift above bottom mobile nav when anchored bottom on small screens.
  const liftMobile = s.position.startsWith("bottom") ? "mb-16 md:mb-0" : "";

  const visibility = s.showOnMobile ? "block" : "hidden md:block";

  return (
    <div
      data-testid="brand-watermark"
      className={`pointer-events-none fixed z-40 print:hidden ${visibility} ${posClass[s.position]} ${liftMobile}`}
      style={{ opacity: s.opacity }}
    >
      <Link
        to="/"
        aria-label="IDEA BUSINESS — الصفحة الرئيسية"
        className="pointer-events-auto group flex items-center gap-1.5 sm:gap-2 rounded-full border border-border/60 bg-background/75 px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-lg backdrop-blur-md transition hover:bg-background hover:shadow-xl"
      >
        <span className="relative inline-flex h-7 w-7 sm:h-8 sm:w-8 overflow-hidden rounded-full ring-1 ring-primary/30">
          <img
            src={logoAsset.url}
            alt="IDEA BUSINESS"
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
        </span>
        <span className="hidden lg:inline-block text-[11px] font-extrabold tracking-wide bg-gradient-to-l from-cyan-500 via-sky-500 to-indigo-500 bg-clip-text text-transparent">
          IDEA BUSINESS
        </span>
      </Link>
    </div>
  );
}
