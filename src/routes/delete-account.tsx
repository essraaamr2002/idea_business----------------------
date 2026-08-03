import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "حذف الحساب | IDEA BUSINESS" },
      { name: "description", content: "إجراءات حذف حسابك بشكل دائم." },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-xl px-4 py-10">
        <PageHeader icon={<Trash2 className="h-6 w-6" />} title="حذف الحساب" subtitle="إجراء دائم لا يمكن التراجع عنه." />
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm leading-relaxed">
          <p>سيؤدي هذا إلى حذف بياناتك خلال 30 يومًا بعد تأكيد طلب الحذف. لا يمكن استعادة الحساب أو الاستثمارات النشطة قبل هذا الإجراء.</p>
          <ul className="mt-3 list-disc space-y-1 ps-5 text-muted-foreground">
            <li>تأكد من سحب أرباحك ورصيد محفظتك.</li>
            <li>أغلق جميع المراكز الاستثمارية النشطة.</li>
            <li>قم بحفظ نسخة من بياناتك إن لزم.</li>
          </ul>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <button className="mt-4 w-full rounded-md bg-red-500 px-3 py-2 text-sm font-bold text-white hover:bg-red-600">طلب حذف نهائي</button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد حذف الحساب</AlertDialogTitle>
                <AlertDialogDescription>هذا الإجراء سيحذف بياناتك خلال 30 يوماً ولا يمكن التراجع عنه. هل أنت متأكد؟</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    toast.success("تم استلام طلب الحذف", { description: "سنرسل لك بريداً للتأكيد النهائي." });
                  }}
                  className="bg-red-500 hover:bg-red-600"
                >
                  تأكيد الحذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
}
