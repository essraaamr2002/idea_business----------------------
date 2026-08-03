import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordAdEvent } from "@/lib/ads.functions";
import { resolveStorageUrl } from "@/lib/storage-url";
import { ExternalLink, Megaphone } from "lucide-react";

export interface FeedAd {
  id: string;
  headline: string;
  body: string | null;
  media_url: string | null;
  media_type: string | null;
  cta_label: string;
  cta_url: string;
}

export function AdCard({ ad }: { ad: FeedAd }) {
  const seen = useRef(false);
  const track = useServerFn(recordAdEvent);

  useEffect(() => {
    if (seen.current) return;
    const el = document.getElementById(`ad-${ad.id}`);
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !seen.current) {
          seen.current = true;
          track({ data: { id: ad.id, kind: "impression" } }).catch(() => {});
          io.disconnect();
        }
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [ad.id, track]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    track({ data: { id: ad.id, kind: "click" } }).catch(() => {});
    window.open(ad.cta_url, "_blank", "noopener,noreferrer");
  };

  return (
    <article
      id={`ad-${ad.id}`}
      className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
        <Megaphone className="h-3 w-3 text-primary" />
        <span>إعلان ممول</span>
      </div>

      {ad.media_url && (
        ad.media_type === "video" ? (
          <video src={resolveStorageUrl(ad.media_url)} className="w-full max-h-80 bg-black object-cover" controls preload="metadata" />
        ) : (
          <img src={resolveStorageUrl(ad.media_url)} alt={ad.headline} className="w-full max-h-80 object-cover" loading="lazy" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}} />
        )
      )}

      <div className="p-4 space-y-2">
        <h3 className="text-base font-extrabold">{ad.headline}</h3>
        {ad.body && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{ad.body}</p>}
        <a
          href={ad.cta_url}
          onClick={handleClick}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
        >
          {ad.cta_label}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </article>
  );
}
