import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { getVapidPublicKey, savePushSubscription, removePushSubscription } from "@/lib/push.functions";
import { toast } from "sonner";

function b64urlToBytes(s: string) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function bufToB64url(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function PushSubscribeButton() {
  const getKey = useServerFn(getVapidPublicKey);
  const saveSub = useServerFn(savePushSubscription);
  const removeSub = useServerFn(removePushSubscription);
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.getRegistration("/sw-push.js").then(async (reg) => {
      if (!reg) return;
      const s = await reg.pushManager.getSubscription();
      if (s) { setSubscribed(true); setEndpoint(s.endpoint); }
    });
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const { publicKey } = await getKey();
      if (!publicKey) {
        toast.error("لم يتم تفعيل خدمة الإشعارات على الخادم بعد. يرجى مراجعة الإدارة.");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { toast.error("تم رفض الإذن"); return; }
      const reg = await navigator.serviceWorker.register("/sw-push.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64urlToBytes(publicKey),
      });
      const json = sub.toJSON() as any;
      await saveSub({
        data: {
          endpoint: sub.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent,
        },
      });
      setSubscribed(true);
      setEndpoint(sub.endpoint);
      toast.success("تم تفعيل إشعارات المتصفح");
    } catch (e: any) {
      toast.error(e?.message ?? "تعذّر التفعيل");
    } finally { setBusy(false); }
  };

  const disable = async () => {
    if (!endpoint) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
      const sub = await reg?.pushManager.getSubscription();
      await sub?.unsubscribe();
      await removeSub({ data: { endpoint } });
      setSubscribed(false);
      setEndpoint(null);
      toast.success("تم إيقاف الإشعارات");
    } catch (e: any) {
      toast.error(e?.message ?? "تعذّر الإيقاف");
    } finally { setBusy(false); }
  };

  if (!supported) return null;
  return (
    <Button onClick={subscribed ? disable : enable} disabled={busy} variant={subscribed ? "outline" : "default"} size="sm" className="gap-2">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : subscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {subscribed ? "إيقاف الإشعارات" : "تفعيل إشعارات المتصفح"}
    </Button>
  );
}
