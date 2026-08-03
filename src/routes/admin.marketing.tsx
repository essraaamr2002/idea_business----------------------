import { createFileRoute } from "@tanstack/react-router";
import { SettingsEditor } from "@/components/admin/SettingsEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

export const Route = createFileRoute("/admin/marketing")({
  component: AdminMarketing,
});

function AdminMarketing() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Target className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">التسويق والبكسلات</h1>
          <p className="text-sm text-muted-foreground">بكسل Meta (فيسبوك/انستقرام)، تيك توك، سناب شات، Google Analytics، Google Ads، تويتر/X، لينكدإن، بنترست.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>معرفات البكسلات</CardTitle></CardHeader>
        <CardContent>
          <SettingsEditor category="marketing" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>كيف تجلب المعرفات؟</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• <strong>Meta (فيسبوك/انستقرام)</strong>: من Events Manager → Pixels → انسخ Pixel ID.</p>
          <p>• <strong>TikTok</strong>: من TikTok Ads → Assets → Events → Web Pixel.</p>
          <p>• <strong>Snapchat</strong>: من Ads Manager → Events Manager.</p>
          <p>• <strong>Google Analytics</strong>: من GA4 → Admin → Data Streams (G-XXXXXX).</p>
          <p>• البكسلات تُحقن تلقائياً في كل صفحات الموقع بعد الحفظ.</p>
        </CardContent>
      </Card>
    </div>
  );
}
