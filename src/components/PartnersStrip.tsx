const PARTNERS = ["Visa", "Mastercard", "STC Pay", "Tabby", "Tamara", "Mada", "Apple Pay", "Google Pay"];

export function PartnersStrip() {
  return (
    <section className="my-10">
      <h2 className="mb-4 text-center text-xs font-extrabold uppercase tracking-widest text-muted-foreground">شركاؤنا الموثوقون</h2>
      <div className="flex flex-wrap items-center justify-center gap-6 opacity-80">
        {PARTNERS.map((p) => (
          <div key={p} className="rounded-md border border-border bg-card/60 px-4 py-2 text-sm font-black tracking-wide">{p}</div>
        ))}
      </div>
    </section>
  );
}
