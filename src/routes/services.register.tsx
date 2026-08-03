import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, ShieldCheck, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ARAB_CURRENCIES } from "@/lib/currencies";

export const Route = createFileRoute("/services/register")({
  head: () => ({ meta: [{ title: "افتح متجر خدماتك" }] }),
  component: RegisterProviderPage,
});

const CATEGORIES = [
  "استشارات قانونية", "استشارات مالية", "محاسبة وضرائب",
  "تسويق رقمي", "تصميم جرافيك", "برمجة وتطوير",
  "كتابة وترجمة", "استشارات إدارية", "دراسات جدوى", "تصوير وفيديو",
];

function RegisterProviderPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [provider, setProvider] = useState<any>({
    display_name: "", headline: "", bio: "", category: CATEGORIES[0], country: "SA", city: "",
    hourly_rate: "", currency: "SAR",
  });
  const [kyc, setKyc] = useState<any>({ id_document_url: "", business_license_url: "", selfie_url: "" });
  const [existingKycStatus, setExistingKycStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("service_providers").select("*").eq("user_id", user.id).maybeSingle();
      if (p) {
        setProvider(p);
        const { data: k } = await supabase.from("service_provider_kyc").select("*").eq("provider_id", p.id).maybeSingle();
        if (k) { setKyc(k); setExistingKycStatus(k.status); }
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const upload = async (field: string, file: File) => {
    if (!user) return;
    setUploading(field);
    try {
      const path = `${user.id}/${field}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("provider-kyc").upload(path, file, { upsert: true });
      if (error) throw error;
      setKyc((k: any) => ({ ...k, [field]: path }));
      toast.success("تم الرفع");
    } catch (e: any) {
      toast.error(e.message || "تعذّر الرفع");
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!user) return toast.error("سجّل الدخول أولاً");
    if (!provider.display_name || !provider.category) return toast.error("أكمل الحقول الأساسية");
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        display_name: provider.display_name,
        headline: provider.headline || null,
        bio: provider.bio || null,
        category: provider.category,
        country: provider.country || null,
        city: provider.city || null,
        hourly_rate: provider.hourly_rate ? Number(provider.hourly_rate) : null,
        currency: provider.currency || "SAR",
        status: "pending_review",
      };
      const { data: up, error } = await supabase
        .from("service_providers")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;

      if (kyc.id_document_url || kyc.selfie_url || kyc.business_license_url) {
        await supabase.from("service_provider_kyc").upsert({
          provider_id: up.id,
          user_id: user.id,
          id_document_url: kyc.id_document_url || null,
          business_license_url: kyc.business_license_url || null,
          selfie_url: kyc.selfie_url || null,
          status: "pending",
          submitted_at: new Date().toISOString(),
        }, { onConflict: "provider_id" });
        await supabase.from("service_providers").update({ kyc_status: "pending" }).eq("id", up.id);
      }
      toast.success("تم الحفظ — بانتظار مراجعة الإدارة");
      nav({ to: "/services" });
    } catch (e: any) {
      toast.error(e.message || "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <div className="p-8 text-center">سجّل الدخول أولاً</div>;
  if (loading) return <div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <PageHeader
          icon={<Briefcase className="h-6 w-6" />}
          title="افتح متجر خدماتك"
          subtitle="أضف بيانات ملفك ومستندات KYC ليظهر متجرك بعد اعتماد الإدارة."
        />

        <Card>
          <CardHeader><CardTitle>بيانات المتجر</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><Label>اسم الظهور</Label><Input value={provider.display_name} onChange={(e) => setProvider({ ...provider, display_name: e.target.value })} /></div>
            <div>
              <Label>التصنيف</Label>
              <Select value={provider.category} onValueChange={(v) => setProvider({ ...provider, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>عنوان قصير</Label><Input value={provider.headline ?? ""} onChange={(e) => setProvider({ ...provider, headline: e.target.value })} placeholder="مثال: مستشار قانوني للشركات الناشئة" /></div>
            <div className="sm:col-span-2"><Label>نبذة تفصيلية</Label><Textarea rows={4} value={provider.bio ?? ""} onChange={(e) => setProvider({ ...provider, bio: e.target.value })} /></div>
            <div><Label>الدولة</Label><Input value={provider.country ?? ""} onChange={(e) => setProvider({ ...provider, country: e.target.value })} /></div>
            <div><Label>المدينة</Label><Input value={provider.city ?? ""} onChange={(e) => setProvider({ ...provider, city: e.target.value })} /></div>
            <div><Label>السعر بالساعة</Label><Input type="number" value={provider.hourly_rate ?? ""} onChange={(e) => setProvider({ ...provider, hourly_rate: e.target.value })} /></div>
            <div>
              <Label>العملة</Label>
              <Select value={provider.currency ?? "SAR"} onValueChange={(v) => setProvider({ ...provider, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ARAB_CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-green-verified" /> توثيق KYC للمزود</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {existingKycStatus && (
              <div className={`rounded-lg p-3 text-sm font-bold ${
                existingKycStatus === "approved" ? "bg-green-verified/10 text-green-verified" :
                existingKycStatus === "rejected" ? "bg-destructive/10 text-destructive" :
                "bg-yellow-500/10 text-yellow-700"
              }`}>
                حالة التوثيق: {existingKycStatus === "approved" ? "مُعتمد" : existingKycStatus === "rejected" ? "مرفوض" : "قيد المراجعة"}
              </div>
            )}
            <FileField label="صورة الهوية" field="id_document_url" value={kyc.id_document_url} uploading={uploading} onUpload={upload} />
            <FileField label="سلفي مع الهوية" field="selfie_url" value={kyc.selfie_url} uploading={uploading} onUpload={upload} />
            <FileField label="السجل التجاري (اختياري)" field="business_license_url" value={kyc.business_license_url} uploading={uploading} onUpload={upload} />
            <p className="text-xs text-muted-foreground">
              الملفات مخزنة في مساحة خاصة ولن يراها إلا فريق المراجعة.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground font-bold">
            {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            حفظ وإرسال للمراجعة
          </Button>
        </div>
      </main>
    </div>
  );
}

function FileField({ label, field, value, uploading, onUpload }: { label: string; field: string; value?: string; uploading: string | null; onUpload: (f: string, file: File) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <Label>{label}</Label>
        <div className="text-xs text-muted-foreground truncate">{value ? "✓ تم الرفع" : "لم يُرفع بعد"}</div>
      </div>
      <label className="cursor-pointer">
        <input
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(field, f); }}
        />
        <span className="inline-flex items-center gap-1 rounded-lg border border-primary bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20">
          {uploading === field ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {value ? "استبدال" : "رفع"}
        </span>
      </label>
    </div>
  );
}
