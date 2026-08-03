import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/**
 * Top progress bar — shows while navigation/loaders are pending.
 * (#2 NProgress-style indicator)
 */
export function RouteProgress() {
  const status = useRouterState({ select: (s) => s.status });
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let hide: ReturnType<typeof setTimeout> | undefined;
    if (status === "pending") {
      setVisible(true);
      setProgress(15);
      timer = setInterval(() => {
        setProgress((p) => (p < 80 ? p + Math.random() * 8 : p));
      }, 250);
    } else {
      setProgress(100);
      hide = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }
    return () => {
      if (timer) clearInterval(timer);
      if (hide) clearTimeout(hide);
    };
  }, [status]);

  if (!visible) return null;
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[100] h-0.5 bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-primary shadow-[0_0_10px_oklch(0.78_0.14_220/0.8)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
