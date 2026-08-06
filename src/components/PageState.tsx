import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

type PageStateKind = "loading" | "empty" | "error";

type PageStateProps = {
  kind: PageStateKind;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  className?: string;
};

const fallback = {
  ar: {
    loadingTitle: "جارٍ التحميل",
    loadingDescription: "نجهّز البيانات الآن.",
    emptyTitle: "لا توجد بيانات بعد",
    emptyDescription: "ستظهر البيانات هنا عند توفرها.",
    errorTitle: "حدث خطأ",
    errorDescription: "تعذّر تحميل البيانات. حاول مرة أخرى.",
    retry: "إعادة المحاولة",
  },
  en: {
    loadingTitle: "Loading",
    loadingDescription: "Preparing the data now.",
    emptyTitle: "No data yet",
    emptyDescription: "Data will appear here when it is available.",
    errorTitle: "Something went wrong",
    errorDescription: "Could not load the data. Try again.",
    retry: "Try again",
  },
};

export function PageState({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  icon: IconProp,
  className = "",
}: PageStateProps) {
  const { lang, dir } = useI18n();
  const copy = fallback[lang];
  const Icon =
    IconProp ?? (kind === "loading" ? Loader2 : kind === "error" ? AlertTriangle : Inbox);

  const finalTitle =
    title ??
    (kind === "loading"
      ? copy.loadingTitle
      : kind === "error"
        ? copy.errorTitle
        : copy.emptyTitle);

  const finalDescription =
    description ??
    (kind === "loading"
      ? copy.loadingDescription
      : kind === "error"
        ? copy.errorDescription
        : copy.emptyDescription);

  return (
    <Card dir={dir} className={`border-dashed bg-card/70 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className="mb-4 rounded-full bg-primary/10 p-3 text-primary">
          <Icon className={`h-6 w-6 ${kind === "loading" ? "animate-spin" : ""}`} />
        </div>
        <div className="text-base font-extrabold text-foreground">{finalTitle}</div>
        <p className="mt-1 max-w-md text-sm font-medium text-foreground/75">{finalDescription}</p>
        {onAction && kind !== "loading" && (
          <Button type="button" onClick={onAction} className="mt-4 gap-2">
            {kind === "error" && <RefreshCw className="h-4 w-4" />}
            {actionLabel ?? copy.retry}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
