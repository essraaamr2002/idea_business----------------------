import { useEffect, useRef, useState } from "react";

// Auto-save any form values to localStorage; returns the saved snapshot & a clear() function.
export function useAutoSave<T>(key: string, value: T, delay = 800) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const t = useRef<number | null>(null);
  useEffect(() => {
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => {
      try { localStorage.setItem(`draft:${key}`, JSON.stringify({ value, at: Date.now() })); setSavedAt(Date.now()); } catch {}
    }, delay);
    return () => { if (t.current) window.clearTimeout(t.current); };
  }, [key, value, delay]);
  return { savedAt, clear: () => localStorage.removeItem(`draft:${key}`) };
}

export function loadDraft<T>(key: string): { value: T; at: number } | null {
  try { const r = localStorage.getItem(`draft:${key}`); return r ? JSON.parse(r) : null; } catch { return null; }
}
