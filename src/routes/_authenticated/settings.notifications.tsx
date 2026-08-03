import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getNotificationPrefs, updateNotificationPrefs } from '@/lib/notification-prefs.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/settings/notifications')({
  head: () => ({ meta: [{ title: 'إعدادات الإشعارات | IDEA BUSINESS' }] }),
  component: NotificationsSettingsPage,
});

function NotificationsSettingsPage() {
  const get = useServerFn(getNotificationPrefs);
  const upd = useServerFn(updateNotificationPrefs);
  const [p, setP] = useState({
    email_enabled: true,
    inapp_enabled: true,
    dm_enabled: true,
    journalist_digest: true,
  });

  useEffect(() => {
    void get().then((r) =>
      setP({
        email_enabled: !!r.email_enabled,
        inapp_enabled: !!r.inapp_enabled,
        dm_enabled: !!r.dm_enabled,
        journalist_digest: !!r.journalist_digest,
      }),
    );
  }, [get]);

  async function toggle(k: keyof typeof p, v: boolean) {
    const next = { ...p, [k]: v };
    setP(next);
    try {
      await upd({ data: { [k]: v } });
      toast.success('تم الحفظ');
    } catch {
      toast.error('فشل الحفظ');
    }
  }

  const rows: Array<{ k: keyof typeof p; label: string; desc: string }> = [
    { k: 'email_enabled', label: 'رسائل البريد الإلكتروني', desc: 'إشعارات النظام والتقارير عبر الإيميل.' },
    { k: 'inapp_enabled', label: 'الإشعارات داخل المنصة', desc: 'الجرس أعلى الصفحة.' },
    { k: 'dm_enabled', label: 'الرسائل الخاصة', desc: 'استقبال محادثات مباشرة من الأعضاء.' },
    { k: 'journalist_digest', label: 'ملخّص صحفي المنصة', desc: 'موجز أسبوعي بأبرز الأخبار والمشاريع.' },
  ];

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">إعدادات الإشعارات والبريد</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>قنوات التنبيه</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map((r) => (
            <div key={r.k} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0">
              <div>
                <div className="font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground">{r.desc}</div>
              </div>
              <Switch checked={p[r.k]} onCheckedChange={(v) => toggle(r.k, v)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
