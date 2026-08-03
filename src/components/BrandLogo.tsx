import { useEffect, useState } from "react";
import logoAsset from "@/assets/idea-business-logo.png.asset.json";

/**
 * مقاسات الشعار الموحّدة عبر المنصة — مكبّرة وبدون إطار.
 */
export const BRAND_LOGO_SIZES = {
  watermark: 44,
  navCompact: 64,
  navMobile: 80,
  navExpanded: 128,
  footer: 220,
  hero: 280,
} as const;

export const BRAND_LOGO_GUTTER = {
  watermark: "0.75rem",
  inline: "0.75rem",
  stacked: "0.25rem",
} as const;

interface BrandLogoProps {
  size?: number;
  withWordmark?: boolean;
  variant?: "full" | "minimal";
  orientation?: "horizontal" | "stacked";
  responsive?: boolean;
  /** يفعّل تأثير الاقتراب/الابتعاد عند التمرير */
  parallax?: boolean;
}

/**
 * hook خفيف لقياس مقدار تمرير الصفحة (0 → 1 على أول 400px)
 */
function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const y = window.scrollY || 0;
      setP(Math.min(1, y / 400));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return p;
}

export function BrandLogo({
  size = 160,
  withWordmark = false,
  variant = "full",
  orientation = "stacked",
  responsive = false,
  parallax = false,
}: BrandLogoProps) {
  const isStacked = orientation === "stacked";
  const progress = useScrollProgress();
  const logoSrc = withWordmark ? "/brand-mark-clean.png" : logoAsset.url;

  // scale من 1 (فوق الصفحة) إلى 0.72 عند التمرير للأسفل — يعطي إحساس "يبتعد ويقترب"
  const scale = parallax ? 1 - progress * 0.28 : 1;
  const translateY = parallax ? -progress * 6 : 0;

  const imgStyle = responsive
    ? { width: `clamp(72px, 18vw, ${size}px)`, height: "auto" as const }
    : { width: size, height: "auto" as const };

  return (
    <div
      className={
        isStacked ? "flex flex-col items-center gap-1" : "flex items-center gap-3 sm:gap-4"
      }
    >
      <span
        title="IDEA BUSINESS"
        className="inline-block shrink-0 will-change-transform"
        style={{
          transform: `translateY(${translateY}px) scale(${scale})`,
          transition: "transform 200ms cubic-bezier(.22,.61,.36,1)",
        }}
      >
        <img
          src={logoSrc}
          alt="IDEA BUSINESS"
          style={{
            ...imgStyle,
            filter:
              variant === "full"
                ? "drop-shadow(0 12px 32px rgba(56,189,248,.45)) drop-shadow(0 4px 10px rgba(15,23,42,.35))"
                : "none",
          }}
          className="block select-none"
          draggable={false}
        />
      </span>

      {withWordmark && (
        <div className={isStacked ? "text-center leading-tight" : "leading-tight"}>
          <div
            className={
              (isStacked ? "text-sm sm:text-base " : "text-base sm:text-lg ") +
              "font-black tracking-[0.18em] bg-gradient-to-l from-cyan-300 via-sky-500 to-indigo-500 bg-clip-text text-transparent"
            }
            style={{ fontFamily: '"Poppins","Segoe UI",sans-serif' }}
          >
            IDEA BUSINESS
          </div>
        </div>
      )}
    </div>
  );
}
