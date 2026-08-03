import { useEffect, useRef, useState } from "react";
import { resolveStorageUrl } from "@/lib/storage-url";

export function LazyImage({ src, alt, className = "", placeholder }: { src: string; alt: string; className?: string; placeholder?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded ? <div className="absolute inset-0 animate-pulse bg-muted/60" /> : null}
      <img
        ref={ref}
        src={visible ? resolveStorageUrl(src) : (placeholder || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>")}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
