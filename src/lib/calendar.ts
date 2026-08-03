// Calendar sync: generate .ics files for events (project deadlines, payouts, draws)
export type CalEvent = { title: string; description?: string; start: Date; end?: Date; url?: string };

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

export function buildIcs(events: CalEvent[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//IDEA BUSINESS//EN"];
  for (const e of events) {
    const end = e.end ?? new Date(e.start.getTime() + 60 * 60 * 1000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${Math.random().toString(36).slice(2)}@busniss.org`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(e.start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${escape(e.title)}`,
      e.description ? `DESCRIPTION:${escape(e.description)}` : "",
      e.url ? `URL:${e.url}` : "",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

function escape(s: string) { return s.replace(/[,;\\]/g, (m) => `\\${m}`).replace(/\n/g, "\\n"); }

export function downloadIcs(filename: string, events: CalEvent[]) {
  const blob = new Blob([buildIcs(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
