import { toast } from "sonner";

export function notifyError(e: any) {
  const msg = String(e?.message ?? e ?? "");
  if (msg.includes("quota_exceeded")) {
    toast.error("باقتك المجانية انتهت لهذا الشهر", {
      description: "ارتقِ للعضوية المفتوحة (25 ر.س / شهر) للحصول على تفاعلات غير محدودة.",
      action: { label: "ترقية", onClick: () => { window.location.href = "/membership"; } },
    });
    return;
  }
  toast.error(msg || "حدث خطأ");
}
