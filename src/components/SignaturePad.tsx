import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check, X } from "lucide-react";

type Props = {
  onConfirm: (dataUrl: string) => void;
  onCancel?: () => void;
  width?: number;
  height?: number;
  disabled?: boolean;
};

export function SignaturePad({ onConfirm, onCancel, width = 480, height = 180, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * e.currentTarget.width,
      y: ((e.clientY - r.top) / r.height) * e.currentTarget.height,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawingRef.current = true;
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  const confirm = () => {
    const c = canvasRef.current;
    if (!c || !hasInk) return;
    onConfirm(c.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-white p-2">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none rounded select-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        ارسم توقيعك داخل الإطار. التوقيع يُربط برقم السند ولا يمكن تعديله بعد الحفظ.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={disabled}>
          <Eraser className="h-4 w-4 ms-1" /> مسح
        </Button>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={disabled}>
              <X className="h-4 w-4 ms-1" /> إلغاء
            </Button>
          )}
          <Button type="button" size="sm" onClick={confirm} disabled={!hasInk || disabled}>
            <Check className="h-4 w-4 ms-1" /> تأكيد التوقيع
          </Button>
        </div>
      </div>
    </div>
  );
}
