import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldCheck, Loader2, Camera, Sparkles, Wand2, Megaphone, Plus } from "lucide-react";
import { toast } from "sonner";
import { verifyKycWithAi } from "@/lib/kyc.functions";
import { VerificationSystem } from "@/components/VerificationSystem";
import { aiProfileAutofill, aiWriteBio } from "@/lib/profile-ai.functions";
import { BrandLoader } from "@/components/BrandLoader";
import { resolveStorageUrl } from "@/lib/storage-url";
import { AliasSettingsCard } from "@/components/AliasSettingsCard";
import { FounderProjectsCard } from "@/components/FounderProjectsCard";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "ملفي الشخصي" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const runKyc = useServerFn(verifyKycWithAi);
  const runAutofill = useServerFn(aiProfileAutofill);
  const runBio = useServerFn(aiWriteBio);

  const handleAutofill = async () => {
    if (aiText.trim().length < 5) return toast.error("اكتب وصفاً مختصراً عن نفسك أولاً");
    setAiBusy(true);
    try {
      const r = await runAutofill({ data: { freeText: aiText.trim(), locale: "ar" } });
      if (!r.ok) return toast.error(r.error);
      const p = r.profile ?? {};
      setProfile((prev: any) => ({
        ...prev,
        display_name: p.display_name ?? prev.display_name,
        occupation: p.occupation ?? prev.occupation,
        nationality: p.nationality ?? prev.nationality,
        country: p.country ?? prev.country,
        city: p.city ?? prev.city,
        phone: p.phone ?? prev.phone,
        whatsapp: p.whatsapp ?? prev.whatsapp,
        monthly_income: p.monthly_income ?? prev.monthly_income,
        monthly_obligations: p.monthly_obligations ?? prev.monthly_obligations,
        net_worth: p.net_worth ?? prev.net_worth,
        bio: p.bio ?? prev.bio,
      }));
      toast.success("تم تعبئة الحقول — راجعها قبل الحفظ");
    } catch {
      toast.error("تعذّر استخراج البيانات");
    } finally {
      setAiBusy(false);
    }
  };

  const handleWriteBio = async () => {
    setBioBusy(true);
    try {
      const r = await runBio({ data: {
        occupation: profile.occupation,
        city: profile.city,
        country: profile.country,
        nationality: profile.nationality,
        hints: aiText.trim() || undefined,
      }});
      if (!r.ok) return toast.error(r.error);
      setProfile({ ...profile, bio: r.bio });
      toast.success("تم توليد نبذة بالذكاء الاصطناعي");
    } catch {
      toast.error("تعذّر توليد النبذة");
    } finally {
      setBioBusy(false);
    }
  };


  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    // Sensitive PII columns (phone, kyc, income…) are no longer readable via direct
    // SELECT for security; use the SECURITY DEFINER RPC scoped to auth.uid().
    supabase.rpc("get_my_profile").then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : (data as any);
      setProfile(row ?? null);
    });
  }, [user?.id]);

  if (!user || !profile) return <WorkspaceShell><BrandLoader /></WorkspaceShell>;

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 4 * 1024 * 1024) return toast.error("الصورة كبيرة جداً (الحد 4MB)");
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw new Error(up.error.message);
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (error) throw new Error(error.message);
      setProfile({ ...profile, avatar_url: url });
      toast.success("تم تحديث الصورة الشخصية");
    } catch (e: any) {
      toast.error("فشل رفع الصورة: " + e.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: profile.display_name,
      bio: profile.bio,
      country: profile.country,
      city: profile.city,
      nationality: profile.nationality,
      phone: profile.phone,
      whatsapp: profile.whatsapp,
      occupation: profile.occupation,
      monthly_income: profile.monthly_income ? Number(profile.monthly_income) : null,
      monthly_obligations: profile.monthly_obligations ? Number(profile.monthly_obligations) : null,
      net_worth: profile.net_worth ? Number(profile.net_worth) : null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ الملف الشخصي");
  };

  return (
    <div className="min-h-screen bg-background">
      <WorkspaceShell>
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative">
            <div className="h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full ring-4 ring-primary/30 bg-muted shadow-card">
              {profile.avatar_url ? (
                <img src={resolveStorageUrl(profile.avatar_url)} alt={profile.display_name ?? "صورة شخصية"} className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-black text-muted-foreground">
                  {(profile.display_name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <label
              className="absolute -bottom-1 -end-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background hover:scale-105 transition"
              title="تغيير الصورة الشخصية"
            >
              {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={avatarUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              {profile.display_name || "ملفي"}
              {profile.verified_green && <CheckCircle2 className="h-5 w-5" style={{ color: "var(--green-verified)" }} />}
              {profile.verified_blue && <ShieldCheck className="h-5 w-5" style={{ color: "var(--blue-verified)" }} />}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant="outline" className="font-bold">{profile.membership === "full" ? "الشاملة" : "العادية"}</Badge>
        </div>

        <VerificationSystem
          userId={user.id}
          onComplete={async () => {
            const { data } = await supabase.rpc("get_my_profile");
            const row = Array.isArray(data) ? data[0] : (data as any);
            if (row) setProfile(row);
          }}
        />

        <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              مساعد التعبئة الذكي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              اكتب فقرة قصيرة عنك (المهنة، الجنسية، المدينة، الدخل، الالتزامات، رقم الجوال…) وسيقوم الذكاء الاصطناعي بتعبئة جميع الحقول تلقائياً. مثال: «أنا أحمد، مهندس مدني سعودي مقيم في الرياض، دخلي 18000 ريال، التزاماتي 6500، رقمي 0551234567».
            </p>
            <Textarea
              rows={4}
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="اكتب وصفاً مختصراً عن نفسك هنا…"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAutofill} disabled={aiBusy} className="gradient-primary text-primary-foreground font-extrabold">
                {aiBusy ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Wand2 className="h-4 w-4 me-2" />}
                تعبئة الحقول بالذكاء الاصطناعي
              </Button>
              <Button onClick={handleWriteBio} disabled={bioBusy} variant="outline" className="font-bold">
                {bioBusy ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Sparkles className="h-4 w-4 me-2" />}
                توليد نبذة احترافية
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>البيانات الشخصية</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="الاسم الكامل" value={profile.display_name} onChange={(v) => setProfile({ ...profile, display_name: v })} />
            <Field label="المهنة" value={profile.occupation} onChange={(v) => setProfile({ ...profile, occupation: v })} />
            <Field label="الجنسية" value={profile.nationality} onChange={(v) => setProfile({ ...profile, nationality: v })} />
            <Field label="الدولة" value={profile.country} onChange={(v) => setProfile({ ...profile, country: v })} />
            <Field label="المدينة" value={profile.city} onChange={(v) => setProfile({ ...profile, city: v })} />
            <Field label="رقم الجوال" value={profile.phone} onChange={(v) => setProfile({ ...profile, phone: v })} />
            <Field label="واتساب" value={profile.whatsapp} onChange={(v) => setProfile({ ...profile, whatsapp: v })} />
            <Field label="الدخل الشهري (ريال)" value={profile.monthly_income} onChange={(v) => setProfile({ ...profile, monthly_income: v })} type="number" />
            <Field label="الالتزامات الشهرية (ريال)" value={profile.monthly_obligations} onChange={(v) => setProfile({ ...profile, monthly_obligations: v })} type="number" />
            <Field label="صافي الثروة (ريال)" value={profile.net_worth} onChange={(v) => setProfile({ ...profile, net_worth: v })} type="number" />
            <Field label="الاسم المستعار (اختياري — يظهر بدل اسمك للعموم)" value={profile.pseudonym} onChange={(v) => setProfile({ ...profile, pseudonym: v })} />
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div>
                <div className="text-sm font-bold">إظهار ملفي للعموم</div>
                <div className="text-xs text-muted-foreground">عند التفعيل يمكن لأي شخص رؤية ملفك عبر /u/الاسم.</div>
              </div>
              <input
                type="checkbox"
                checked={!!profile.is_public_profile}
                onChange={(e) => setProfile({ ...profile, is_public_profile: e.target.checked })}
                className="h-5 w-5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>نبذة عنك</Label>
              <Textarea rows={4} value={profile.bio ?? ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground font-bold">{saving ? "..." : "حفظ"}</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-400/30 bg-gradient-to-br from-cyan-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-cyan-500" />
              إعلاناتي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              أنشئ حملات إعلانية مستهدفة داخل المجتمع وأدر حملاتك السابقة وتحليلاتها من مكان واحد.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="gradient-primary text-primary-foreground font-bold">
                <Link to="/ads/new"><Plus className="h-4 w-4 me-1" /> إنشاء إعلان جديد</Link>
              </Button>
              <Button asChild variant="outline" className="font-bold">
                <Link to="/ads"><Megaphone className="h-4 w-4 me-1" /> إدارة إعلاناتي</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>العضوية والاشتراك</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              ترقية لحساب ممتاز بـ <strong>$5 شهرياً</strong> — إعلانات وتفاعل غير محدود + الصح الأزرق + خصم تلقائي شهري.
            </p>
            <Link to="/membership">
              <Button className="gradient-primary text-primary-foreground font-bold">إدارة العضوية</Button>
            </Link>
          </CardContent>
        </Card>

        <AliasSettingsCard />

        <FounderProjectsCard />

        <p className="text-xs text-muted-foreground text-center flex flex-wrap justify-center gap-3">
          <Link to="/wallet" className="underline">المحفظة</Link>
          <Link to="/messages" search={{ c: undefined }} className="underline">الرسائل</Link>
          <Link to="/referrals" className="underline">🎁 إحالاتي</Link>
          <Link to="/services" className="underline">مزودو الخدمات</Link>
          <Link to="/orders" className="underline">طلباتي</Link>
          <Link to="/support" className="underline">الدعم</Link>
        </p>

      </main>
      </WorkspaceShell>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
