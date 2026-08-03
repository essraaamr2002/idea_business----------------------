import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/payment/failure")({
  component: FailurePage,
  validateSearch: (s: Record<string, unknown>) => ({ order: (s.order as string) || "" }),
});

function FailurePage() {
  const { order } = Route.useSearch();
  return (
    <>
      <div className="container mx-auto max-w-md p-8 text-center">
        <XCircle className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">فشل الدفع</h1>
        {order && <p className="mt-2 text-sm text-muted-foreground">رقم العملية: {order}</p>}
        <p className="mt-3 text-muted-foreground">لم تتم العملية. يمكنك المحاولة مرة أخرى.</p>
        <div className="mt-6 flex gap-2 justify-center">
          <Link to="/checkout"><Button>إعادة المحاولة</Button></Link>
          <Link to="/support"><Button variant="outline">الدعم</Button></Link>
        </div>
      </div>
    </>
  );
}
