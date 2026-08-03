import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Check } from "lucide-react";
import { toast } from "sonner";

/** Browser push permission opt-in card (#129). */
export function PushNotificationsCard() {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission);
  }, []);

  const request = async () => {
    if (perm === "unsupported") return;
    const r = await Notification.requestPermission();
    setPerm(r);
    if (r === "granted") {
      toast.success("تم تفعيل الإشعارات");
      try {
        new Notification("IDEA BUSINESS", {
          body: "ستصلك تنبيهات عن مشاريعك وصفقات السوق الموازي.",
          icon: "/og-logo.png",
        });
      } catch {
        /* ignore */
      }
    } else if (r === "denied") {
      toast.error("تم رفض الإشعارات — يمكنك تفعيلها لاحقاً من إعدادات المتصفح");
    }
  };

  if (perm === "unsupported") return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {perm === "granted" ? <Check className="h-5 w-5" /> : perm === "denied" ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </div>
        <div>
          <div className="font-extrabold">إشعارات المتصفح</div>
          <div className="text-xs font-medium text-muted-foreground">
            {perm === "granted" && "مفعّلة — ستصلك تنبيهات السوق والمشاريع لحظياً."}
            {perm === "denied" && "مرفوضة — فعّلها من إعدادات الموقع في متصفحك."}
            {perm === "default" && "احصل على تنبيهات لحظية لتحركات أسعار حصصك وتنبيهات النزاعات."}
          </div>
        </div>
      </div>
      {perm === "default" && (
        <Button onClick={request} size="sm" className="font-extrabold">
          تفعيل الإشعارات
        </Button>
      )}
    </div>
  );
}
