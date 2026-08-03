import logoAsset from "@/assets/idea-business-brand.jpeg.asset.json";

interface BrandLoaderProps {
  /** "page" = full-screen overlay, "inline" = block within content */
  variant?: "page" | "inline";
  /** Logo size in px */
  size?: number;
  /** Optional caption */
  label?: string;
}

/**
 * Animated brand-logo loader: the circular logo bounces up and down in the
 * middle of the screen — replaces text "جارٍ التحميل…" placeholders.
 */
export function BrandLoader({ variant = "inline", size = 96, label }: BrandLoaderProps) {
  const stage = Math.round(size * 1.6);

  const content = (
    <div className="flex flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <div
        className="relative"
        style={{ width: stage, height: stage }}
      >
        {/* Bouncing shadow on the floor */}
        <span
          className="absolute left-1/2 bottom-0 -translate-x-1/2 rounded-[50%] bg-foreground/25 blur-md"
          style={{
            width: size * 0.7,
            height: size * 0.14,
            animation: "brand-loader-shadow 1.1s cubic-bezier(.5,.05,.5,.95) infinite",
          }}
          aria-hidden
        />
        {/* Bouncing logo */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 0,
            width: size,
            height: size,
            animation: "brand-loader-bounce 1.1s cubic-bezier(.5,.05,.5,.95) infinite",
          }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-full ring-2 ring-primary/40 shadow-[0_18px_40px_-12px_rgba(56,189,248,.6)] bg-background">
            <img
              src={logoAsset.url}
              alt="IDEA BUSINESS — جارٍ التحميل"
              className="h-full w-full rounded-full object-contain"
              style={{
                filter:
                  "drop-shadow(0 8px 20px rgba(56,189,248,.55)) contrast(1.05) saturate(1.1)",
              }}
            />
          </div>
        </div>
      </div>
      {label && (
        <div className="text-xs font-bold text-muted-foreground tracking-wide">{label}</div>
      )}
      <span className="sr-only">جارٍ التحميل…</span>

      <style>{`
        @keyframes brand-loader-bounce {
          0%, 100% { transform: translate(-50%, 0) scale(1, 1); }
          45%      { transform: translate(-50%, ${Math.round(size * 0.55)}px) scale(1.04, .92); }
          50%      { transform: translate(-50%, ${Math.round(size * 0.6)}px)  scale(1.08, .88); }
          55%      { transform: translate(-50%, ${Math.round(size * 0.55)}px) scale(1.04, .92); }
        }
        @keyframes brand-loader-shadow {
          0%, 100% { transform: translateX(-50%) scale(1);   opacity: .25; }
          50%      { transform: translateX(-50%) scale(.55); opacity: .55; }
        }
      `}</style>
    </div>
  );

  if (variant === "page") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm">
        {content}
      </div>
    );
  }
  return <div className="flex min-h-[40vh] w-full items-center justify-center py-10">{content}</div>;
}

export default BrandLoader;
