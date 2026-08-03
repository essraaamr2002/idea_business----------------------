import { useEffect, useState } from "react";
import logoAsset from "@/assets/idea-business-logo.jpeg.asset.json";

function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return prefersReduced;
}

const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const r = 90 + (i % 3) * 30;
  return {
    tx: `${Math.cos(angle) * r}px`,
    ty: `${Math.sin(angle) * r}px`,
    delay: `${(i % 7) * 120}ms`,
    dur: `${1800 + (i % 5) * 250}ms`,
  };
});

const SPLASH_KEY = "splash_shown_v1";

export function SplashScreen() {
  const [showInitial, setShowInitial] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // Decide on mount only (avoids SSR/client hydration mismatch)
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SPLASH_KEY) !== "1") setShowInitial(true);
    } catch {
      setShowInitial(true);
    }
  }, []);

  useEffect(() => {
    if (!showInitial) return;
    const t = setTimeout(() => {
      if (reducedMotion) setShowInitial(false);
      else setIsExiting(true);
    }, 700);
    return () => clearTimeout(t);
  }, [reducedMotion, showInitial]);


  const handleTransitionEnd = () => {
    if (isExiting) {
      setShowInitial(false);
      try { sessionStorage.setItem(SPLASH_KEY, "1"); } catch { /* ignore */ }
    }
  };

  useEffect(() => {
    if (!showInitial) {
      try { sessionStorage.setItem(SPLASH_KEY, "1"); } catch { /* ignore */ }
      return;
    }
    const { body, documentElement: html } = document;
    const pb = body.style.overflow, ph = html.style.overflow;
    body.style.overflow = "hidden"; html.style.overflow = "hidden";
    return () => { body.style.overflow = pb; html.style.overflow = ph; };
  }, [showInitial]);

  if (!showInitial) return null;

  const transitionClass = reducedMotion ? "" : "transition-all duration-700 ease-out";
  const wrapperExit = isExiting && !reducedMotion ? "opacity-0 scale-95" : "opacity-100 scale-100";

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center ${transitionClass} ${wrapperExit}`}
      onTransitionEnd={handleTransitionEnd}
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
      style={{ touchAction: "none" }}
      aria-hidden="true"
    >
      {/* Deep AI background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, oklch(0.32 0.13 250 / 0.85) 0%, transparent 55%)," +
            "radial-gradient(ellipse at 70% 80%, oklch(0.30 0.16 200 / 0.75) 0%, transparent 55%)," +
            "linear-gradient(180deg, oklch(0.12 0.04 258) 0%, oklch(0.08 0.03 260) 100%)",
        }}
      />
      {/* Neural grid */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.78 0.14 220 / 0.4) 1px, transparent 1px)," +
            "linear-gradient(90deg, oklch(0.78 0.14 220 / 0.4) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="relative grid place-items-center">
        {/* Pulsing glow halo */}
        {!reducedMotion && (
          <div
            className="absolute h-80 w-80 md:h-[28rem] md:w-[28rem] rounded-full splash-pulse-glow"
            style={{
              background:
                "radial-gradient(circle, oklch(0.78 0.18 220 / 0.55) 0%, oklch(0.55 0.20 260 / 0.25) 40%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />
        )}

        {/* Orbit rings */}
        {!reducedMotion && (
          <>
            <div className="absolute h-72 w-72 md:h-96 md:w-96 rounded-full border border-cyan-300/30 splash-orbit">
              <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_12px_4px_oklch(0.85_0.15_220/0.7)]" />
              <span className="absolute top-1/2 -right-1 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-sky-200/80" />
            </div>
            <div className="absolute h-60 w-60 md:h-80 md:w-80 rounded-full border border-indigo-300/25 splash-orbit-rev">
              <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-indigo-300 shadow-[0_0_12px_4px_oklch(0.70_0.18_270/0.7)]" />
            </div>
          </>
        )}

        {/* Particles */}
        {!reducedMotion &&
          PARTICLES.map((p, i) => (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-cyan-200"
              style={{
                animation: `splash-particle ${p.dur} ease-out ${p.delay} infinite`,
                ["--tx" as never]: p.tx,
                ["--ty" as never]: p.ty,
                boxShadow: "0 0 8px 2px oklch(0.85 0.15 220 / 0.6)",
              } as React.CSSProperties}
            />
          ))}

        {/* Logo card with scan line */}
        <div
          className={`relative overflow-hidden rounded-3xl border border-cyan-300/25 bg-[oklch(0.15_0.05_258_/_0.55)] backdrop-blur-xl p-4 md:p-6 ${
            !reducedMotion ? "splash-pop" : ""
          }`}
          style={{
            boxShadow:
              "0 0 0 1px oklch(0.85 0.15 220 / 0.15), 0 20px 60px -10px oklch(0.55 0.20 260 / 0.5), inset 0 1px 0 oklch(1 0 0 / 0.08)",
          }}
        >
          <img
            src={logoAsset.url}
            alt="IDEA BUSINESS — IDEA BUSINESS"
            className={`relative h-48 w-48 md:h-64 md:w-64 object-contain rounded-2xl ${
              !reducedMotion ? "splash-float-y" : ""
            }`}
          />
          {!reducedMotion && (
            <div
              className="pointer-events-none absolute inset-x-0 h-12 splash-scan"
              style={{
                background:
                  "linear-gradient(180deg, transparent 0%, oklch(0.95 0.15 220 / 0.55) 50%, transparent 100%)",
                filter: "blur(2px)",
              }}
            />
          )}
        </div>

        {/* Brand text + AI badge */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_oklch(0.85_0.15_220/0.8)]" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-cyan-200/80">
              AI · Powered
            </span>
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-indigo-300 shadow-[0_0_8px_2px_oklch(0.70_0.18_270/0.8)]" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-wider splash-shimmer-text">
            IDEA BUSINESS
          </h1>
          <p className="text-sm md:text-base text-cyan-100/70 font-medium" dir="rtl">
            IDEA BUSINESS
          </p>

          {/* Progress bar */}
          <div className="mt-3 h-[3px] w-44 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${!reducedMotion ? "splash-progress-bar" : "w-full"}`}
              style={{
                background:
                  "linear-gradient(90deg, oklch(0.85 0.15 220) 0%, oklch(0.70 0.20 270) 100%)",
                boxShadow: "0 0 12px oklch(0.85 0.15 220 / 0.7)",
              }}
            />
          </div>
          <span className="text-[11px] text-cyan-100/60 tracking-widest">
            جارٍ تهيئة المنصة الذكية…
          </span>
        </div>
      </div>
    </div>
  );
}
