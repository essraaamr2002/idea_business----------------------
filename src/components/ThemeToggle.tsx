import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-24" />;

  const opts = [
    { v: "light", icon: Sun, label: "فاتح" },
    { v: "dark", icon: Moon, label: "داكن" },
    { v: "system", icon: Monitor, label: "تلقائي" },
  ] as const;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/50 p-1 backdrop-blur" role="group" aria-label="تبديل السمة">
      {opts.map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          type="button"
          onClick={() => setTheme(v)}
          aria-label={label}
          aria-pressed={theme === v}
          className={`grid h-7 w-7 place-items-center rounded-full transition ${theme === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
