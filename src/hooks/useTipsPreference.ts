import { useEffect, useState, useCallback } from "react";

const KEY = "busniss.smart_tips_enabled";

function read(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(KEY);
  return v === null ? true : v === "1";
}

export function useTipsPreference() {
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    setEnabled(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setEnabled(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPref = useCallback((next: boolean) => {
    setEnabled(next);
    try {
      window.localStorage.setItem(KEY, next ? "1" : "0");
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    } catch {}
  }, []);

  return { enabled, setEnabled: setPref };
}

export function isSeenOnce(id: string): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(`busniss.tip_seen.${id}`) === "1";
}
export function markSeen(id: string) {
  try { window.localStorage.setItem(`busniss.tip_seen.${id}`, "1"); } catch {}
}
