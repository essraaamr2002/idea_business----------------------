import { useEffect, useState } from "react";

export type WatermarkPosition =
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right";

export interface WatermarkSettings {
  enabled: boolean;
  opacity: number; // 0..1
  position: WatermarkPosition;
  showOnMobile: boolean;
}

export const DEFAULT_WATERMARK: WatermarkSettings = {
  enabled: true,
  opacity: 0.95,
  position: "bottom-left",
  showOnMobile: true,
};

const KEY = "haraj:watermark:settings:v1";
const EVENT = "haraj:watermark:settings:changed";

export function loadWatermarkSettings(): WatermarkSettings {
  if (typeof window === "undefined") return DEFAULT_WATERMARK;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_WATERMARK;
    const parsed = JSON.parse(raw) as Partial<WatermarkSettings>;
    return { ...DEFAULT_WATERMARK, ...parsed };
  } catch {
    return DEFAULT_WATERMARK;
  }
}

export function saveWatermarkSettings(s: WatermarkSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: s }));
}

export function useWatermarkSettings(): [WatermarkSettings, (s: WatermarkSettings) => void] {
  const [s, setS] = useState<WatermarkSettings>(DEFAULT_WATERMARK);
  useEffect(() => {
    setS(loadWatermarkSettings());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<WatermarkSettings>).detail;
      if (detail) setS(detail);
      else setS(loadWatermarkSettings());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setS(loadWatermarkSettings());
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const update = (next: WatermarkSettings) => {
    setS(next);
    saveWatermarkSettings(next);
  };
  return [s, update];
}
