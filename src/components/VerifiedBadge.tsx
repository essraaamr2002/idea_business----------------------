import { BadgeCheck, ShieldCheck } from "lucide-react";

export function VerifiedBadge({ blue, green }: { blue?: boolean; green?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {blue && <BadgeCheck className="h-3.5 w-3.5 fill-blue-verified text-background" />}
      {green && <ShieldCheck className="h-3.5 w-3.5 fill-green-verified text-background" />}
    </span>
  );
}
