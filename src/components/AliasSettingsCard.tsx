import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { updateAliasSettings } from "@/lib/community-posts.functions";
import { toast } from "sonner";
import { UserCircle2, Loader2 } from "lucide-react";

export function AliasSettingsCard() {
  const { user } = useAuth();
  const update = useServerFn(updateAliasSettings);
  const [aliasName, setAliasName] = useState("");
  const [useDefault, setUseDefault] = useState(false);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("alias_name,use_alias_default,points")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setAliasName((data as any).alias_name ?? "");
        setUseDefault(!!(data as any).use_alias_default);
        setPoints((data as any).points ?? 0);
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      await update({ data: { aliasName, useAliasDefault: useDefault } });
      toast.success("تم حفظ إعدادات الاسم");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <UserCircle2 className="h-4 w-4 text-primary" /> الاسم الحركي ونقاطك
        </h2>
        <div className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
          {points.toLocaleString("ar")} نقطة
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              الاسم الحركي (يظهر بدل اسمك الحقيقي)
            </label>
            <input
              type="text"
              value={aliasName}
              onChange={(e) => setAliasName(e.target.value)}
              placeholder="مثال: مستثمر طموح"
              maxLength={50}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <input
              type="checkbox"
              checked={useDefault}
              onChange={(e) => setUseDefault(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold">استخدم الاسم الحركي افتراضياً</div>
              <div className="text-xs text-muted-foreground">
                يمكنك التبديل لكل بزنسة على حِدة عند النشر.
              </div>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <div>إعجاب على بزنستك: <b className="text-foreground">+1</b></div>
            <div>تعليق: <b className="text-foreground">+2</b></div>
            <div>إعادة بزنسة: <b className="text-foreground">+3</b></div>
            <div>بزنسة جديدة: <b className="text-foreground">+5</b></div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-full bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      )}
    </div>
  );
}
