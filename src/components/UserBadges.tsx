import { CheckCircle2, Sparkles, Flame } from "lucide-react";
import { resolveStorageUrl } from "@/lib/storage-url";

interface AvatarRingProps {
  src?: string | null;
  alt?: string;
  size?: number;
  premium?: boolean;
  verified?: boolean;
  fallback?: string;
}

export function AvatarRing({ src, alt = "", size = 64, premium, verified, fallback }: AvatarRingProps) {
  const inner = size - 4;
  return (
    <div
      className={`avatar-container ${verified ? "verified" : ""} ${premium ? "premium" : ""}`}
      style={{ width: size, height: size }}
      title={verified ? "حساب موثّق" : undefined}
    >
      {src ? (
        <img
          src={resolveStorageUrl(src)}
          alt={alt}
          width={inner}
          height={inner}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          style={{ width: inner, height: inner, borderRadius: "9999px", objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: inner,
            height: inner,
            borderRadius: "9999px",
            background: "linear-gradient(135deg,#1e3c72,#2a5298)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: Math.max(12, inner / 2.4),
          }}
        >
          {(fallback || alt || "?").slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
}

interface UserChipProps {
  name: string;
  avatarUrl?: string | null;
  pseudonym?: string | null;
  verifiedGreen?: boolean;
  verifiedBlue?: boolean;
  size?: number;
  subtitle?: string;
}

/** Twitter-like display: avatar (with green ring if verified) + name + blue check if premium. */
export function UserChip({ name, avatarUrl, pseudonym, verifiedGreen, verifiedBlue, size = 36, subtitle }: UserChipProps) {
  const display = pseudonym || name || "مستخدم";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <AvatarRing src={avatarUrl} alt={display} size={size} verified={verifiedGreen} premium={verifiedBlue} fallback={display} />
      <span style={{ display: "inline-flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 800, fontSize: 14 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{display}</span>
          {verifiedGreen && (
            <span title="حساب موثّق" style={{ color: "#16a34a", display: "inline-flex" }}>
              <CheckCircle2 size={14} fill="#16a34a" stroke="#fff" />
            </span>
          )}
          {verifiedBlue && (
            <span className="verified-check-blue" title="عضوية مميزة موثقة">
              <CheckCircle2 size={12} />
            </span>
          )}
        </span>
        {subtitle && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{subtitle}</span>}
      </span>
    </span>
  );
}

export function PremiumBadge({ label = "ممتاز" }: { label?: string }) {
  return (
    <span className="premium-badge" title="عضوية ممتازة">
      <Sparkles size={14} /> {label}
    </span>
  );
}

export function VerifiedBadge({ label = "موثّق" }: { label?: string }) {
  return (
    <span className="verified-badge" title="حساب موثّق برقم الجوال">
      <CheckCircle2 size={16} /> {label}
    </span>
  );
}

export function PalmPointsBadge({ points }: { points: number }) {
  return (
    <span className="palm-points-badge" title="نقاط النخلة">
      <PalmHeartIcon />
      {points.toLocaleString("ar")} نقطة
    </span>
  );
}

/** Stylized palm + heart matching the brand logo's cyan→sky→indigo gradient */
function PalmHeartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="palmGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="55%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="heartGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {/* trunk */}
      <path
        d="M14.6 30c.2-4 .6-7.8 1.4-11.6"
        stroke="url(#palmGrad)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* fronds */}
      <path
        d="M16 8c3.2-3.4 7-3.6 9.5-2.2-2.4.2-4.6 1.2-6.4 2.8M16 8c3.8-1 7.4.6 9 3.4-2.2-1-4.6-1.2-6.8-.6M16 8c-3.2-3.4-7-3.6-9.5-2.2 2.4.2 4.6 1.2 6.4 2.8M16 8c-3.8-1-7.4.6-9 3.4 2.2-1 4.6-1.2 6.8-.6M16 8c0-2.6 1.4-5 3.6-6-.4 2.2-1.2 4.2-2.6 5.8M16 8c0-2.6-1.4-5-3.6-6 .4 2.2 1.2 4.2 2.6 5.8"
        stroke="url(#palmGrad)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* coconut accent */}
      <circle cx="16" cy="8" r="1.3" fill="url(#palmGrad)" />
      {/* heart */}
      <path
        d="M25 18.4c0-1.5-1.2-2.6-2.6-2.6-1 0-1.8.5-2.2 1.3-.4-.8-1.2-1.3-2.2-1.3-1.4 0-2.6 1.1-2.6 2.6 0 2.4 4.8 5 4.8 5s4.8-2.6 4.8-5z"
        fill="url(#heartGrad)"
        stroke="#e0f2fe"
        strokeWidth="0.6"
      />
    </svg>
  );
}

export function StreakBadge({ days }: { days: number }) {
  if (!days || days < 1) return null;
  return (
    <span className="streak-badge" title="سلسلة التفاعل اليومي">
      <Flame size={14} /> {days} يوم
    </span>
  );
}

interface UserNameWithBadgesProps {
  name: string;
  premium?: boolean;
  verified?: boolean;
  points?: number;
  streak?: number;
}

export function UserNameWithBadges({ name, premium, verified, points, streak }: UserNameWithBadgesProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <strong>{name}</strong>
      {premium && <PremiumBadge />}
      {verified && <VerifiedBadge />}
      {typeof points === "number" && points > 0 && <PalmPointsBadge points={points} />}
      {typeof streak === "number" && streak > 0 && <StreakBadge days={streak} />}
    </span>
  );
}
