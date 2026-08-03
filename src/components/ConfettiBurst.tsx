import { useEffect, useState } from "react";

export function ConfettiBurst({ trigger }: { trigger: boolean }) {
  const [bits, setBits] = useState<{ x: number; r: number; c: string; d: number }[]>([]);
  useEffect(() => {
    if (!trigger) return;
    const palette = ["#22d3ee", "#a78bfa", "#f472b6", "#34d399", "#facc15"];
    setBits(Array.from({ length: 40 }).map(() => ({
      x: Math.random() * 100,
      r: Math.random() * 360,
      c: palette[Math.floor(Math.random() * palette.length)],
      d: 1.5 + Math.random() * 1.5,
    })));
    const t = setTimeout(() => setBits([]), 3000);
    return () => clearTimeout(t);
  }, [trigger]);
  if (bits.length === 0) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[400] overflow-hidden">
      {bits.map((b, i) => (
        <span key={i} className="absolute top-0 block h-2 w-2 rounded-sm"
          style={{ left: `${b.x}%`, background: b.c, transform: `rotate(${b.r}deg)`, animation: `fb-fall ${b.d}s linear forwards` }} />
      ))}
      <style>{`@keyframes fb-fall { to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }`}</style>
    </div>
  );
}
