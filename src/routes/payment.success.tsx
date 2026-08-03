import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/payment/success")({
  component: SuccessPage,
  validateSearch: (s: Record<string, unknown>) => ({
    order: (s.order as string) || "",
    purpose: (s.purpose as string) || "",
    returnTo: (s.returnTo as string) || "",
  }),
});

function SuccessPage() {
  const { order, purpose, returnTo } = Route.useSearch();
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (!returnTo) return;
    if (count <= 0) {
      window.location.href = returnTo;
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, returnTo]);

  return (
    <div className="container mx-auto max-w-md p-8 text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
      <h1 className="mt-4 text-2xl font-bold">تم الدفع بنجاح</h1>
      {order && <p className="mt-2 text-sm text-muted-foreground">رقم العملية: {order}</p>}
      {purpose === "seriousness_deposit" ? (
        <p className="mt-3 text-muted-foreground">
          تم تأكيد وديعة الجدية. يمكنك الآن المزايدة.
        </p>
      ) : (
        <p className="mt-3 text-muted-foreground">سيتم تحديث رصيدك خلال لحظات.</p>
      )}

      {returnTo ? (
        <>
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            سنعيدك تلقائياً لإكمال المزايدة خلال {count}ث…
          </p>
          <div className="mt-4">
            <Button onClick={() => (window.location.href = returnTo)}>
              <ArrowLeft className="me-1 h-4 w-4" />
              العودة الآن لإتمام المزايدة
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-6 flex gap-2 justify-center">
          <Link to="/wallet"><Button>المحفظة</Button></Link>
          <Link to="/dashboard"><Button variant="outline">لوحتي</Button></Link>
        </div>
      )}
    </div>
  );
}
