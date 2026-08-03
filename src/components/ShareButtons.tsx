import { Button } from "@/components/ui/button";
import { Copy, Share2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * Share buttons: WhatsApp, X, copy link, native share (#24).
 */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const fullUrl = typeof window !== "undefined" && url.startsWith("/") ? `${window.location.origin}${url}` : url;
  const text = encodeURIComponent(`${title} — ${fullUrl}`);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("تم نسخ الرابط");
    } catch {
      toast.error("تعذّر النسخ");
    }
  };

  const native = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, url: fullUrl });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={native} aria-label="مشاركة">
        <Share2 className="me-1 h-4 w-4" /> مشاركة
      </Button>
      <a
        href={`https://wa.me/?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="مشاركة عبر واتساب"
      >
        <Button type="button" variant="outline" size="sm">
          <MessageCircle className="me-1 h-4 w-4" /> واتساب
        </Button>
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="مشاركة على X"
      >
        <Button type="button" variant="outline" size="sm">X</Button>
      </a>
      <Button type="button" variant="outline" size="sm" onClick={copy} aria-label="نسخ الرابط">
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}
