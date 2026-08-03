import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { confirmNewsletter } from "@/lib/news.functions";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type State = "loading" | "ok" | "already" | "invalid" | "error";

export const Route = createFileRoute("/newsletter/confirm")({
  head: () => ({
    meta: [
      { title: "تأكيد الاشتراك في النشرة | IDEA BUSINESS" },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : "" }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { token } = Route.useSearch();
  const confirm = useServerFn(confirmNewsletter);
  const nav = useNavigate();
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    confirm({ data: { token } })
      .then((r: any) => {
        if (r?.ok && r?.already) setState("already");
        else if (r?.ok) setState("ok");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token, confirm]);

  return (
    <div className="container mx-auto max-w-lg px-4 py-16" dir="rtl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle>تأكيد الاشتراك في النشرة</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {state === "loading" && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> جاري التحقق من الرابط...
            </div>
          )}
          {state === "ok" && (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <p className="font-semibold">تم تفعيل اشتراكك بنجاح 🎉</p>
              <p className="text-sm text-muted-foreground">ستصلك أحدث الأخبار والفرص على بريدك.</p>
              <Button onClick={() => nav({ to: "/news" })}>تصفّح الأخبار</Button>
            </>
          )}
          {state === "already" && (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <p className="font-semibold">اشتراكك مُفعّل مسبقًا</p>
              <Link to="/news" className="text-primary underline text-sm">اذهب إلى الأخبار</Link>
            </>
          )}
          {state === "invalid" && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <p className="font-semibold">الرابط غير صالح أو منتهي</p>
              <p className="text-sm text-muted-foreground">يمكنك طلب رابط جديد من صفحة الأخبار.</p>
              <Button variant="outline" onClick={() => nav({ to: "/news" })}>العودة للأخبار</Button>
            </>
          )}
          {state === "error" && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <p className="font-semibold">حدث خطأ غير متوقع</p>
              <Button variant="outline" onClick={() => location.reload()}>إعادة المحاولة</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
