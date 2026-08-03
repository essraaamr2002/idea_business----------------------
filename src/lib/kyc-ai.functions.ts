import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Submit a KYC application. Client first uploads document images + selfie to the
 * private `kyc-documents` bucket under <userId>/..., then calls this fn with the
 * storage paths. The server signs them, asks Gemini Vision (via Lovable AI
 * Gateway) to extract data + grade the match, then writes a kyc_verifications
 * row via service-role (to bypass the "clean insert" restrictive policy and
 * persist the AI verdict atomically).
 */

const Input = z.object({
  countryCode: z.string().min(2).max(3),
  documentType: z.enum(["passport", "national_id", "residence", "driver_license"]),
  documentFrontPath: z.string().min(3),
  documentBackPath: z.string().min(3).optional().nullable(),
  selfiePath: z.string().min(3),
  pledgeAccepted: z.boolean(),
  arbitrationAccepted: z.boolean(),
  pledgeFullName: z.string().min(2).max(120),
});

type AiVerdict = {
  extracted: {
    full_name: string | null;
    id_number: string | null;
    date_of_birth: string | null; // YYYY-MM-DD
    expiry_date: string | null;
    nationality: string | null;
    document_type: string | null;
    is_expired: boolean | null;
  };
  face_match_score: number; // 0-100
  liveness_score: number; // 0-100
  authenticity_score: number; // 0-100
  reasoning: string;
};

export const submitKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.pledgeAccepted || !data.arbitrationAccepted) {
      throw new Error("يجب الموافقة على التعهد والتحكيم");
    }

    // Ensure paths belong to this user
    for (const p of [data.documentFrontPath, data.documentBackPath, data.selfiePath]) {
      if (p && !p.startsWith(`${userId}/`)) throw new Error("مسار وثيقة غير صالح");
    }

    // Sign URLs (10 min) for the AI to fetch the images
    const signOne = async (path: string) => {
      const { data: s, error } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(path, 600);
      if (error || !s) throw new Error(`تعذّر توقيع الوثيقة: ${error?.message ?? path}`);
      return s.signedUrl;
    };
    const frontUrl = await signOne(data.documentFrontPath);
    const backUrl = data.documentBackPath ? await signOne(data.documentBackPath) : null;
    const selfieUrl = await signOne(data.selfiePath);

    // Call Lovable AI Gateway (Gemini Vision) — JSON output
    const verdict = await analyzeWithGemini({
      frontUrl,
      backUrl,
      selfieUrl,
      documentType: data.documentType,
      countryCode: data.countryCode,
    });

    // Decide
    const isExpired = verdict.extracted.is_expired === true;
    const autoApprove =
      verdict.face_match_score >= 90 &&
      verdict.liveness_score >= 80 &&
      verdict.authenticity_score >= 80 &&
      !isExpired;
    const autoReject =
      verdict.face_match_score < 55 ||
      verdict.liveness_score < 40 ||
      verdict.authenticity_score < 40 ||
      isExpired;
    const status = autoApprove ? "approved" : autoReject ? "rejected" : "pending";
    const aiDecision = autoApprove ? "approve" : autoReject ? "reject" : "review";
    const aiScore = Math.round(
      (verdict.face_match_score + verdict.liveness_score + verdict.authenticity_score) / 3,
    );

    // Insert via service-role to also store AI verdict atomically
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("kyc_verifications")
      .insert({
        user_id: userId,
        document_url: data.documentFrontPath,
        document_back_url: data.documentBackPath ?? null,
        selfie_url: data.selfiePath,
        country_code: data.countryCode,
        document_type: data.documentType,
        extracted_name: verdict.extracted.full_name,
        extracted_id_number: verdict.extracted.id_number,
        extracted_dob: verdict.extracted.date_of_birth,
        extracted_nationality: verdict.extracted.nationality,
        document_expiry: verdict.extracted.expiry_date,
        document_meta: JSON.parse(JSON.stringify(verdict.extracted)),
        face_match_score: verdict.face_match_score,
        liveness_score: verdict.liveness_score,
        authenticity_score: verdict.authenticity_score,
        ai_score: aiScore,
        ai_decision: aiDecision,
        ai_reasoning: verdict.reasoning,
        status,
        rejection_reason: status === "rejected" ? defaultRejectionReason(verdict, isExpired) : null,
        pledge_accepted: data.pledgeAccepted,
        arbitration_accepted: data.arbitrationAccepted,
        pledge_full_name: data.pledgeFullName,
        pledge_signed_at: new Date().toISOString(),
      })
      .select("id,status,ai_decision,ai_score,rejection_reason")
      .single();

    if (error) throw new Error(error.message);

    // Flip profile KYC fields on auto-approve
    if (status === "approved") {
      await supabaseAdmin
        .from("profiles")
        .update({ kyc_status: "verified" })
        .eq("id", userId);
    }

    return row;
  });

function defaultRejectionReason(v: AiVerdict, expired: boolean): string {
  if (expired) return "الوثيقة منتهية الصلاحية";
  if (v.face_match_score < 55) return "الوجه لا يطابق الوثيقة";
  if (v.liveness_score < 40) return "فشل التحقق من الحيوية — يرجى المحاولة مجدداً";
  if (v.authenticity_score < 40) return "يبدو أن الوثيقة تم التلاعب بها";
  return "تعذّر التحقق التلقائي — يرجى إعادة المحاولة";
}

async function analyzeWithGemini(args: {
  frontUrl: string;
  backUrl: string | null;
  selfieUrl: string;
  documentType: string;
  countryCode: string;
}): Promise<AiVerdict> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const sys = `أنت محلل KYC. لديك صور وثيقة هوية وصورة سيلفي. مهمتك:
1) استخراج بيانات الوثيقة (OCR) بدقة، باللغة الأصلية.
2) مقارنة وجه السيلفي بوجه الوثيقة وإعطاء درجة تطابق 0-100.
3) تقدير ما إذا كانت السيلفي حية (ليست صورة لصورة، شاشة، أو قناع) — درجة 0-100.
4) تقدير أصالة الوثيقة (وضوح، اتساق، علامات تلاعب) — درجة 0-100.
أعد JSON صارمًا فقط بدون نص إضافي.`;

  const userText = `نوع الوثيقة: ${args.documentType}. الدولة: ${args.countryCode}.
أعد JSON بهذا الشكل بالضبط:
{
  "extracted": {
    "full_name": string|null,
    "id_number": string|null,
    "date_of_birth": "YYYY-MM-DD"|null,
    "expiry_date": "YYYY-MM-DD"|null,
    "nationality": string|null,
    "document_type": string|null,
    "is_expired": boolean|null
  },
  "face_match_score": number,
  "liveness_score": number,
  "authenticity_score": number,
  "reasoning": string
}`;

  const content: Array<Record<string, unknown>> = [
    { type: "text", text: userText },
    { type: "image_url", image_url: { url: args.frontUrl } },
  ];
  if (args.backUrl) content.push({ type: "image_url", image_url: { url: args.backUrl } });
  content.push({ type: "image_url", image_url: { url: args.selfieUrl } });

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: sys },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`AI Gateway ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: Partial<AiVerdict> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    // fallback: extract first {...}
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
  }

  const num = (v: unknown, d = 0) =>
    typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(100, v)) : d;

  return {
    extracted: {
      full_name: parsed.extracted?.full_name ?? null,
      id_number: parsed.extracted?.id_number ?? null,
      date_of_birth: parsed.extracted?.date_of_birth ?? null,
      expiry_date: parsed.extracted?.expiry_date ?? null,
      nationality: parsed.extracted?.nationality ?? null,
      document_type: parsed.extracted?.document_type ?? null,
      is_expired: parsed.extracted?.is_expired ?? null,
    },
    face_match_score: num(parsed.face_match_score),
    liveness_score: num(parsed.liveness_score),
    authenticity_score: num(parsed.authenticity_score),
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning.slice(0, 1000) : "",
  };
}

/* Fetch latest KYC for current user */
export const getMyKyc = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("kyc_verifications")
      .select(
        "id,status,ai_decision,ai_score,rejection_reason,face_match_score,liveness_score,authenticity_score,country_code,document_type,extracted_name,extracted_nationality,document_expiry,created_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
