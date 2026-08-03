import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, ImageIcon } from "lucide-react";

interface Props {
  code: string;
  url: string;
  username?: string;
}

export function InviteCardGenerator({ code, url, username }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const W = 1080, H = 1080;
    c.width = W; c.height = H;

    // Gradient background
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0f172a");
    g.addColorStop(0.5, "#1e293b");
    g.addColorStop(1, "#0b1220");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Decorative circle
    ctx.beginPath();
    ctx.arc(W * 0.85, H * 0.15, 220, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W * 0.1, H * 0.9, 280, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
    ctx.fill();

    // Header
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 36px system-ui, -apple-system";
    ctx.textAlign = "right";
    ctx.fillText("IDEA BUSINESS", W - 80, 110);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px system-ui, -apple-system";
    ctx.textAlign = "center";
    ctx.fillText("انضم بدعوتي 🎁", W / 2, H / 2 - 120);

    if (username) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 36px system-ui";
      ctx.fillText(`بدعوة من @${username}`, W / 2, H / 2 - 50);
    }

    // Code box
    ctx.fillStyle = "rgba(251, 191, 36, 0.12)";
    roundRect(ctx, W / 2 - 280, H / 2 + 20, 560, 140, 24);
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    roundRect(ctx, W / 2 - 280, H / 2 + 20, 560, 140, 24);
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 26px system-ui";
    ctx.fillText("كود الدعوة", W / 2, H / 2 + 60);

    ctx.fillStyle = "#fbbf24";
    ctx.font = "900 64px ui-monospace, monospace";
    ctx.fillText(code || "------", W / 2, H / 2 + 130);

    // Benefits
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 30px system-ui";
    ctx.fillText("✨ مكافأة + ترقية عضوية + نقاط ولاء", W / 2, H / 2 + 230);

    // URL
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "500 24px system-ui";
    const shortUrl = url.replace(/^https?:\/\//, "");
    ctx.fillText(shortUrl, W / 2, H - 90);

    setDataUrl(c.toDataURL("image/png"));
  }, [code, url, username]);

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `invite-${code || "card"}.png`;
    a.click();
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-extrabold">
          <ImageIcon className="h-4 w-4 text-primary" />
          بطاقة دعوة قابلة للمشاركة
        </div>
        <Button size="sm" onClick={download} disabled={!dataUrl}>
          <Download className="me-1 h-4 w-4" /> تحميل PNG
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg bg-black/40">
        <canvas ref={canvasRef} className="block h-auto w-full max-w-xs" />
      </div>
      <p className="text-xs text-muted-foreground">جاهزة لقصص واتساب وX وانستجرام (1080×1080).</p>
    </div>
  );
}
