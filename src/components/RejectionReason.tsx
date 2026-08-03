import { AlertTriangle, RefreshCw, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface RejectionReasonProps {
  /** Short title — e.g. "تم رفض طلب التحقق". */
  title: string;
  /** Free-text reason returned from the server or admin. */
  reason?: string | null;
  /** Optional structured suggestions to fix the issue. */
  tips?: string[];
  /** Optional retry handler. */
  onRetry?: () => void;
  /** Whether to show the "Contact support" link. Default true. */
  showSupport?: boolean;
}

/**
 * Standardised rejection / decline card.
 * Used by KYC, wallet payouts, project purchases, offers, tickets…
 */
export function RejectionReason({
  title,
  reason,
  tips,
  onRetry,
  showSupport = true,
}: RejectionReasonProps) {
  const inferred = tips ?? inferTips(reason);
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-start">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-500/15 text-red-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-extrabold text-red-700 dark:text-red-300">{title}</h4>
          {reason && (
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              <span className="font-bold">السبب: </span>
              {reason}
            </p>
          )}
          {inferred.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-bold text-muted-foreground">خطوات لإصلاح المشكلة:</div>
              <ul className="mt-1 list-disc space-y-1 ps-5 text-sm text-foreground">
                {inferred.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {onRetry && (
              <Button size="sm" onClick={onRetry}>
                <RefreshCw className="me-2 h-4 w-4" />
                إعادة المحاولة
              </Button>
            )}
            {showSupport && (
              <Button asChild size="sm" variant="outline">
                <Link to="/support">
                  <MessageSquare className="me-2 h-4 w-4" />
                  تواصل مع الدعم
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function inferTips(reason?: string | null): string[] {
  if (!reason) return [];
  const r = reason.toLowerCase();
  const tips: string[] = [];
  if (/expired|منته|انتهاء/.test(r)) tips.push("استخدم وثيقة سارية المفعول (غير منتهية الصلاحية).");
  if (/damaged|تالف|غير واضح|blur|blurry/.test(r)) tips.push("التقط صورة جديدة بإضاءة جيدة وبدون انعكاسات.");
  if (/face|وجه|liveness|حي/.test(r)) tips.push("أعد التحقق الحي في مكان مضاء وانظر مباشرة إلى الكاميرا.");
  if (/name|اسم|mismatch|تطابق/.test(r)) tips.push("تأكد أن الاسم في الوثيقة يطابق اسم حسابك بالكامل.");
  if (/balance|رصيد|insufficient/.test(r)) tips.push("تأكد من توفر رصيد كافٍ في محفظتك قبل إعادة المحاولة.");
  return tips;
}
