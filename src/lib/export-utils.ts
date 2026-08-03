// Client-only helpers for exporting tabular data and generating simple PDFs.

export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
  if (!rows.length) return "";
  const cols = headers ?? Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function downloadFile(name: string, content: string | Blob, mime = "text/csv;charset=utf-8;") {
  const blob = content instanceof Blob ? content : new Blob(["\ufeff" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const escHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]!));

export function printableReport(title: string, rows: Record<string, unknown>[]): void {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${escHtml(title)}</title>
  <style>
    body{font-family:Cairo,system-ui,sans-serif;padding:24px;color:#111}
    h1{font-size:20px;margin:0 0 16px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:right}
    th{background:#f5f5f5}
    .meta{color:#666;font-size:11px;margin-bottom:12px}
  </style></head><body>
  <h1>${escHtml(title)}</h1>
  <div class="meta">تم الإنشاء: ${escHtml(new Date().toLocaleString("ar"))}</div>
  <table><thead><tr>${cols.map((c) => `<th>${escHtml(c)}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${escHtml(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table>
  <script>window.onload=()=>window.print()</script>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
