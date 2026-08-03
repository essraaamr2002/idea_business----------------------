import { useCurrency } from "@/contexts/CurrencyContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Check, Coins } from "lucide-react";
import { ARAB_CURRENCIES } from "@/lib/currencies";
import { useI18n } from "@/lib/i18n";

const EXTRA = [{ code: "USD", name: "US Dollar", nameAr: "دولار أمريكي", symbol: "$" }];

export function CurrencySelector() {
  const { displayCurrency, setDisplayCurrency, ready } = useCurrency();
  const { lang, t } = useI18n();
  const list = [...EXTRA, ...ARAB_CURRENCIES.filter((c) => c.code !== "USD")];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("currency.select")}
          className="hidden h-9 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-bold transition hover:bg-muted sm:inline-flex"
          title={ready ? t("currency.display") : t("currency.loading")}
        >
          <Coins className="h-3.5 w-3.5 text-primary" />
          <span>{displayCurrency}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
        <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground">
          {t("currency.note")}
        </div>
        <DropdownMenuSeparator />
        {list.map((c: any) => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => setDisplayCurrency(c.code)}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <span className="font-bold">{c.code}</span>
              <span className="text-xs text-muted-foreground">{lang === "ar" ? c.nameAr ?? c.name : c.nameEn ?? c.name}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{c.symbol}</span>
              {c.code === displayCurrency && <Check className="h-3.5 w-3.5 text-primary" />}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
