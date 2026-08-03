import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Award } from "lucide-react";

interface Props {
  recipientName: string;
  achievement: string;
  date?: string;
}

export function CertificateGenerator({ recipientName, achievement, date }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState("");
  const dateStr = date ?? new Date().toLocaleDateString("ar");

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const W = 1600, H = 1100;
    c.width = W; c.height = H;

    // Background
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#fffbeb");
    g.addColorStop(1, "#fef3c7");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 12;
    ctx.strokeRect(40, 40, W - 80, H - 80);
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 3;
    ctx.strokeRect(70, 70, W - 140, H - 140);

    // Header
    ctx.fillStyle = "#92400e";
    ctx.textAlign = "center";
    ctx.font = "bold 44px system-ui, -apple-system";
    ctx.fillText("IDEA BUSINESS", W / 2, 160);

    // Title
    ctx.fillStyle = "#1f2937";
    ctx.font = "900 96px system-ui";
    ctx.fillText("شهادة تقدير", W / 2, 320);

    ctx.fillStyle = "#6b7280";
    ctx.font = "500 36px system-ui";
    ctx.fillText("تُمنح هذه الشهادة بكل فخر إلى", W / 2, 410);

    // Name
    ctx.fillStyle = "#b45309";
    ctx.font = "900 84px system-ui";
    ctx.fillText(recipientName || "—", W / 2, 540);

    // Underline
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 350, 560);
    ctx.lineTo(W / 2 + 350, 560);
    ctx.stroke();

    // Achievement
    ctx.fillStyle = "#374151";
    ctx.font = "600 44px system-ui";
    wrapText(ctx, `تقديراً لـ ${achievement}`, W / 2, 660, W - 300, 60);

    // Date + signature
    ctx.fillStyle = "#6b7280";
    ctx.font = "500 30px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(`التاريخ: ${dateStr}`, W - 140, H - 160);
    ctx.textAlign = "left";
    ctx.fillText("توقيع الإدارة", 140, H - 160);

    // Seal
    ctx.beginPath();
    ctx.arc(W / 2, H - 180, 70, 0, Math.PI * 2);
    ctx.fillStyle = "#b45309";
    ctx.fill();
    ctx.fillStyle = "#fef3c7";
    ctx.font = "bold 28px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("معتمد", W / 2, H - 170);

    setDataUrl(c.toDataURL("image/png"));
  }, [recipientName, achievement, dateStr]);

  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
    const words = text.split(" ");
    let line = "";
    let yy = y;
    for (const w of words) {
      const test = line + w + " ";
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(line, x, yy);
        line = w + " ";
        yy += lineH;
      } else line = test;
    }
    ctx.fillText(line, x, yy);
  }

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `certificate-${recipientName.replace(/\s+/g, "-")}.png`;
    a.click();
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50">
        <canvas ref={canvasRef} className="block h-auto w-full" />
      </div>
      <Button onClick={download} disabled={!dataUrl} className="w-full font-extrabold">
        <Download className="me-2 h-4 w-4" /> تحميل الشهادة (PNG عالي الدقة)
      </Button>
      <p className="text-xs text-muted-foreground">
        <Award className="me-1 inline h-3 w-3" />
        يمكنك طباعتها أو إرفاقها بسيرتك الذاتية.
      </p>
    </div>
  );
}
