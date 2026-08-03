import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function OfflineBanner() {
  const { t } = useI18n();
  const [off, setOff] = useState(false);

  useEffect(() => {
    const up = () => setOff(false);
    const down = () => setOff(true);
    setOff(typeof navigator !== "undefined" && navigator.onLine === false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (!off) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[250] bg-destructive text-destructive-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-xs font-bold">
        <WifiOff className="h-3.5 w-3.5" />
        {t("offline.message")}
      </div>
    </div>
  );
}
