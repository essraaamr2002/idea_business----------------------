import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

type Props = {
  amount: number | string | null | undefined;
  currency?: string; // source currency, default USD
  className?: string;
  approxClassName?: string;
  showOriginal?: boolean; // default true
  inline?: boolean; // render approx inline next to value instead of below
};

/**
 * Renders a monetary amount in its original currency, and (when different)
 * an approximate conversion to the visitor's display currency right below.
 *
 * The original/stored value is the source of truth — the converted value is
 * shown only as a courtesy and always labelled "تقريبي".
 */
export function Money({
  amount,
  currency = "USD",
  className,
  approxClassName,
  showOriginal = true,
  inline = false,
}: Props) {
  const { format, formatConverted, displayCurrency } = useCurrency();
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (n == null || !isFinite(Number(n))) {
    return <span className={className}>—</span>;
  }
  const num = Number(n);
  const src = (currency || "USD").toUpperCase();
  const original = format(num, src);
  const approx = src === displayCurrency.toUpperCase() ? null : formatConverted(num, src);

  if (inline) {
    return (
      <span className={className}>
        {showOriginal && original}
        {approx && (
          <span
            className={cn("ms-1 text-[10px] text-muted-foreground", approxClassName)}
            title="تقريبي حسب أسعار الصرف"
          >
            ({approx} تقريبي)
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      {showOriginal && <span>{original}</span>}
      {approx && (
        <span
          className={cn("text-[10px] font-normal text-muted-foreground", approxClassName)}
          title="تقريبي حسب أسعار الصرف"
        >
          {approx} <span className="opacity-70">تقريبي</span>
        </span>
      )}
    </span>
  );
}
