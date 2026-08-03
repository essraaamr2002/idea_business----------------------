import { TICKER_DATA } from "@/lib/mockData";
import { TrendingDown, TrendingUp } from "lucide-react";

export function LiveTicker() {
  const items = [...TICKER_DATA, ...TICKER_DATA];
  return (
    <div className="relative overflow-hidden border-b border-border bg-foreground text-background">
      <div className="absolute right-0 top-0 z-10 flex h-full items-center gap-2 bg-foreground px-4 text-xs font-bold">
        <span className="h-2 w-2 rounded-full bg-success pulse-dot" />
        مباشر
      </div>
      <div className="flex w-max gap-8 py-2.5 ps-32 ticker-track" dir="ltr">
        {items.map((t, i) => {
          const up = t.change >= 0;
          return (
            <div key={i} className="flex items-center gap-2 text-xs whitespace-nowrap">
              <span className="font-extrabold tracking-wide">{t.symbol}</span>
              <span className="num font-semibold opacity-90">
                {t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t.currency}
              </span>
              <span className={`num inline-flex items-center gap-0.5 font-bold ${up ? "text-success" : "text-destructive"}`}>
                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {up ? "+" : ""}{t.change.toFixed(2)}%
              </span>
              <span className="opacity-30">•</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
