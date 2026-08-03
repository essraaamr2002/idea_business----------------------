// Ring-buffer collector for console + network events. Initialized once at app boot.
// Reports are flushed to /api/public/client-log (source: diagnostics-report).

type LogEntry = { t: number; level: string; msg: string };
type NetEntry = { t: number; method: string; url: string; status?: number; ok?: boolean; ms?: number; error?: string };
type RouteEntry = { t: number; path: string };

const MAX = 80;
const logs: LogEntry[] = [];
const nets: NetEntry[] = [];
const routes: RouteEntry[] = [];
let installed = false;

function push<T>(arr: T[], item: T) {
  arr.push(item);
  if (arr.length > MAX) arr.shift();
}

function fmt(args: unknown[]): string {
  try {
    return args.map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 0))).join(" ").slice(0, 1000);
  } catch {
    return String(args[0] ?? "").slice(0, 1000);
  }
}

export function installDiagnostics() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  for (const level of ["log", "warn", "error", "info"] as const) {
    const orig = (console as any)[level].bind(console);
    (console as any)[level] = (...args: unknown[]) => {
      push(logs, { t: Date.now(), level, msg: fmt(args) });
      orig(...args);
    };
  }

  window.addEventListener("error", (e) => {
    push(logs, { t: Date.now(), level: "uncaught", msg: `${e.message} @ ${e.filename}:${e.lineno}` });
  });
  window.addEventListener("unhandledrejection", (e) => {
    push(logs, { t: Date.now(), level: "unhandled", msg: String((e as PromiseRejectionEvent).reason ?? "rejection").slice(0, 1000) });
  });

  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const t0 = performance.now();
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method || (typeof input !== "string" && !(input instanceof URL) && input.method) || "GET").toUpperCase();
    try {
      const res = await origFetch(input as any, init);
      push(nets, { t: Date.now(), method, url, status: res.status, ok: res.ok, ms: Math.round(performance.now() - t0) });
      return res;
    } catch (err) {
      push(nets, { t: Date.now(), method, url, error: String(err).slice(0, 300), ms: Math.round(performance.now() - t0) });
      throw err;
    }
  };

  push(routes, { t: Date.now(), path: location.pathname + location.search });
  const wrap = (k: "pushState" | "replaceState") => {
    const orig = history[k];
    history[k] = function (...args: any[]) {
      const r = orig.apply(this, args as any);
      push(routes, { t: Date.now(), path: location.pathname + location.search });
      return r;
    };
  };
  wrap("pushState"); wrap("replaceState");
  window.addEventListener("popstate", () => push(routes, { t: Date.now(), path: location.pathname + location.search }));
}

export function snapshotDiagnostics() {
  return {
    capturedAt: new Date().toISOString(),
    url: typeof location !== "undefined" ? location.href : "",
    ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
    consoleLogs: logs.slice(-50),
    networkEvents: nets.slice(-50),
    recentRoutes: routes.slice(-15),
    errorsCount: logs.filter((l) => l.level === "error" || l.level === "uncaught" || l.level === "unhandled").length,
    failedRequests: nets.filter((n) => n.error || (n.status && n.status >= 400)).length,
  };
}

export async function sendDiagnosticsReport(extra?: Record<string, unknown>) {
  const snap = snapshotDiagnostics();
  const body = {
    source: "diagnostics-report" as const,
    action: "manual_collect",
    ok: snap.errorsCount === 0 && snap.failedRequests === 0,
    error: snap.errorsCount > 0 ? `${snap.errorsCount} console errors, ${snap.failedRequests} failed requests` : null,
    context: { ...snap, ...(extra || {}) },
    url: snap.url,
  };
  try {
    await fetch("/api/public/client-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    return { ok: true, snap };
  } catch (e) {
    return { ok: false, snap, error: String(e) };
  }
}
