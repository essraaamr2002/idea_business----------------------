import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText } from "ai";

type AiDecision = "approve" | "review" | "reject";

type AiResult = {
  score: number;
  decision: AiDecision;
  reasoning: string;
};

type AiContentPart = { type: "text"; text: string } | { type: "image"; image: string };

const KycInput = z.object({
  documentPath: z.string().min(1),
  selfiePath: z.string().min(1).optional(),
  documentType: z.enum(["national_id", "passport", "driver_license"]).optional(),
  pledgeAccepted: z.boolean().optional(),
  arbitrationAccepted: z.boolean().optional(),
  pledgeFullName: z.string().trim().min(2).max(120).optional(),
  signaturePath: z.string().min(1).optional(),
  livenessChallenge: z
    .object({
      questions: z.array(z.string()).max(10),
      answers: z.array(z.string()).max(10),
      durationMs: z.number().int().nonnegative().optional(),
      framesCount: z.number().int().nonnegative().optional(),
      capturedLive: z.boolean().optional(),
    })
    .optional(),
});

const normalizeAiResult = (value: unknown): AiResult => {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawDecision = row.decision;
  const decision: AiDecision =
    rawDecision === "approve" || rawDecision === "review" || rawDecision === "reject"
      ? rawDecision
      : "review";
  const rawScore = Number(row.score);

  return {
    score: Math.max(0, Math.min(1, Number.isFinite(rawScore) ? rawScore : 0)),
    decision,
    reasoning: String(row.reasoning || "تم تحليل الوثيقة والصورة الشخصية"),
  };
};

export const verifyKycWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => KycInput.parse(input))
  .handler(async ({ data, context }) => {
    const expectedPrefix = `${context.userId}/`;
    if (!data.documentPath.startsWith(expectedPrefix)) {
      throw new Error("Forbidden: document does not belong to you");
    }
    if (data.selfiePath && !data.selfiePath.startsWith(expectedPrefix)) {
      throw new Error("Forbidden: selfie does not belong to you");
    }
    if (data.signaturePath && !data.signaturePath.startsWith(expectedPrefix)) {
      throw new Error("Forbidden: signature does not belong to you");
    }
    // Enforce pledge requirements when supplied (new flow)
    if (data.signaturePath || data.pledgeAccepted || data.arbitrationAccepted) {
      if (!data.pledgeAccepted || !data.arbitrationAccepted || !data.signaturePath || !data.pledgeFullName) {
        throw new Error("يجب قبول التعهد والتحكيم وكتابة الاسم الكامل والتوقيع");
      }
    }
    if (data.livenessChallenge && data.livenessChallenge.capturedLive === false) {
      throw new Error("صورة السيلفي يجب أن تُلتقط من الكاميرا الحية");
    }


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: docSigned } = await supabaseAdmin.storage
      .from("kyc-documents")
      .createSignedUrl(data.documentPath, 300);
    const docUrl = docSigned?.signedUrl;
    if (!docUrl) throw new Error("لم يتم العثور على الوثيقة");

    let selfieUrl: string | undefined;
    if (data.selfiePath) {
      const { data: signedSelfie } = await supabaseAdmin.storage
        .from("kyc-documents")
        .createSignedUrl(data.selfiePath, 300);
      selfieUrl = signedSelfie?.signedUrl;
    }

    const docTypeLabel =
      data.documentType === "passport"
        ? "جواز سفر"
        : data.documentType === "driver_license"
          ? "رخصة قيادة"
          : "بطاقة هوية وطنية";

    let parsed: AiResult | null = null;
    let engine: "faceonlive" | "gemini" = "gemini";
    let extraMeta: Record<string, unknown> = {};

    // -------- Engine 1: FaceOnLive IDKit (preferred when configured) --------
    try {
      const fol = await import("./faceonlive.server");
      if (fol.isFaceOnLiveConfigured() && selfieUrl) {
        engine = "faceonlive";
        const [docB64, selfieB64] = await Promise.all([
          fol.fetchUrlAsBase64(docUrl),
          fol.fetchUrlAsBase64(selfieUrl),
        ]);

        const recognition = await fol.recognizeIdDocument(docB64);
        const portraitB64 = recognition.image?.portrait || null;

        const [liveness, faceCompare, docLiveness] = await Promise.all([
          fol.checkFaceLiveness(selfieB64).catch((e) => {
            console.warn("[faceonlive liveness]", e);
            return null;
          }),
          portraitB64
            ? fol.compareFaces(portraitB64, selfieB64).catch((e) => {
                console.warn("[faceonlive compare]", e);
                return null;
              })
            : Promise.resolve(null),
          fol.checkDocumentLiveness(docB64).catch((e) => {
            console.warn("[faceonlive doc-liveness]", e);
            return null;
          }),
        ]);

        const docValid = recognition.ocr?.validState === 1;
        const docScore = Math.max(0, Math.min(1, Number(recognition.score ?? 0.5)));
        const livenessOk = liveness ? liveness.is_live && liveness.liveness_score >= 0.5 : false;
        const similarity = faceCompare ? Number(faceCompare.similarity ?? 0) : 0;
        const faceMatchOk = similarity >= 0.6;
        const docLiveOk = docLiveness ? docLiveness.is_live : true;

        // weighted overall confidence
        const score = Math.max(
          0,
          Math.min(
            1,
            0.30 * (docValid ? 1 : docScore) +
              0.30 * (liveness ? liveness.liveness_score : 0.4) +
              0.30 * (faceCompare ? similarity : 0.4) +
              0.10 * (docLiveOk ? 1 : 0),
          ),
        );

        let decision: AiDecision = "review";
        let reasoning = "";
        if (!liveness || !faceCompare) {
          decision = "review";
          reasoning = "تعذر تشغيل كل فحوصات FaceOnLive؛ يلزم مراجعة بشرية";
        } else if (livenessOk && faceMatchOk && docLiveOk && (docValid || docScore >= 0.5)) {
          decision = "approve";
          reasoning = `وثيقة ${recognition.documentName ?? docTypeLabel} مقروءة • حيوية الوجه ${(liveness.liveness_score * 100).toFixed(0)}% • تطابق الوجه ${(similarity * 100).toFixed(0)}%`;
        } else if (!docLiveOk || similarity < 0.35 || (liveness && liveness.liveness_score < 0.25)) {
          decision = "reject";
          reasoning = !docLiveOk
            ? "كشف FaceOnLive محاولة تزوير على الوثيقة"
            : similarity < 0.35
              ? "صورة السيلفي لا تطابق صورة الوثيقة"
              : "فشل اختبار حيوية الوجه";
        } else {
          decision = "review";
          reasoning = `النتائج غير حاسمة • حيوية ${(liveness.liveness_score * 100).toFixed(0)}% • تطابق ${(similarity * 100).toFixed(0)}%`;
        }

        parsed = { score, decision, reasoning };
        extraMeta = {
          engine: "faceonlive",
          document_type: recognition.documentName,
          document_country: recognition.countryName,
          ocr_name: recognition.ocr?.name,
          ocr_id_number: recognition.ocr?.identityCardNumber,
          ocr_dob: recognition.ocr?.dateOfBirth,
          ocr_expiry: (recognition.ocr as any)?.dateOfExpiry ?? (recognition.ocr as any)?.expiryDate ?? null,
          liveness_score: liveness?.liveness_score,
          face_similarity: faceCompare?.similarity,
          doc_liveness: docLiveness?.is_live ?? null,
        };
      }
    } catch (error) {
      console.warn("[kyc faceonlive] falling back to Gemini:", error);
      parsed = null;
    }

    // -------- Engine 2: Lovable AI Gateway (Gemini Vision) fallback --------
    if (!parsed) {
      engine = "gemini";
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
      const gateway = createLovableAiGatewayProvider(apiKey);

      const systemPrompt = `أنت نظام تحقق هوية متقدم ومتسامح مع اختلاف أشكال البطاقات العربية والعالمية.
المهمة: تحليل ${docTypeLabel} مرفقة${selfieUrl ? " ومقارنتها بصورة السيلفي" : ""}.

تدريب محاكاة داخلي قبل الحكم:
- بطاقة صحيحة قد تكون عربية/إنجليزية، أفقية/عمودية، فيها انعكاس خفيف، زوايا غير مثالية، أو حواف مقصوصة قليلاً.
- جواز السفر قد يظهر صفحة البيانات فقط أو جزء MRZ. اقبل إذا ظهرت صورة الوجه وبيانات هوية كافية.
- رخصة القيادة تختلف حسب الدولة. عاملها كوثيقة رسمية إذا ظهر اسم أو صورة أو رقم أو تاريخ أو شعار حكومي.
- السيلفي قد تختلف الإضاءة أو زاوية الوجه قليلاً عن الوثيقة.

سياسة القرار:
- approve: وثيقة رسمية قابلة للقراءة + وجه في السيلفي مع تطابق معقول.
- review: ضبابية جداً أو لا يمكن استخراج هوية.
- reject: تزوير واضح أو وثيقة غير هوية أو عدم تطابق وجه شديد.

أجب بصيغة JSON صارمة فقط: {"score":0..1,"decision":"approve|review|reject","reasoning":"سبب عربي مختصر","name":"الاسم كما يظهر","id_number":"رقم الوثيقة","expiry":"YYYY-MM-DD أو فارغ","is_damaged":false}.
- إذا الوثيقة تالفة/ممزقة/مطموسة بشكل لا يسمح بقراءة البيانات: decision=reject و is_damaged=true.
- إذا تاريخ الانتهاء قبل اليوم: decision=reject.`;


      const contentParts: AiContentPart[] = [
        { type: "text", text: `حلّل هذه الوثيقة بصفتها ${docTypeLabel}:` },
        { type: "image", image: docUrl },
      ];
      if (selfieUrl) {
        contentParts.push({ type: "text", text: "وقارنها بالسيلفي التالية:" });
        contentParts.push({ type: "image", image: selfieUrl });
      }

      for (const model of ["google/gemini-2.5-pro", "google/gemini-3-flash-preview"] as const) {
        try {
          const { text } = await generateText({
            model: gateway(model),
            system: systemPrompt,
            messages: [{ role: "user", content: contentParts }],
          });
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          const raw = JSON.parse(jsonMatch ? jsonMatch[0] : text);
          parsed = normalizeAiResult(raw);
          extraMeta = {
            engine: "gemini",
            ocr_name: raw?.name ?? null,
            ocr_id_number: raw?.id_number ?? null,
            ocr_expiry: raw?.expiry ?? null,
            is_damaged: raw?.is_damaged ?? false,
          };
          break;
        } catch (error) {
          console.warn("[kyc ai model fallback]", model, error);
          parsed = null;
        }
      }

      if (!parsed) {
        parsed = {
          score: 0.62,
          decision: "review",
          reasoning:
            "تعذر على الذكاء الاصطناعي قراءة الصور بدقة؛ أعد المحاولة بصورة أوضح قبل المراجعة البشرية",
        };
        extraMeta = { engine: "gemini" };
      }
    }

    // Parse expiry & damage signals
    const expiryRaw = (extraMeta.ocr_expiry as string | null) || null;
    let expiryDate: string | null = null;
    let docExpired = false;
    if (expiryRaw && /^\d{4}-\d{2}-\d{2}$/.test(expiryRaw)) {
      expiryDate = expiryRaw;
      const exp = new Date(expiryRaw + "T00:00:00Z").getTime();
      if (!Number.isNaN(exp) && exp < Date.now()) docExpired = true;
    }
    const isDamaged = Boolean((extraMeta as any).is_damaged);

    // Auto-approval policy: approve by default. Only reject on hard signals
    // (explicit fraud / damaged / expired). Removed human-review path so KYC
    // requests are accepted automatically.
    let status: "approved" | "rejected" | "review" =
      parsed.decision === "reject" && parsed.score >= 0.75 ? "rejected" : "approved";

    if (docExpired || isDamaged) {
      status = "rejected";
      parsed.decision = "reject";
      parsed.reasoning = docExpired
        ? `الوثيقة منتهية الصلاحية (${expiryRaw}) — يلزم تجديدها قبل التحقق`
        : "الوثيقة تالفة/غير مقروءة — يلزم تصوير وثيقة سليمة";
    }

    // Annotate reasoning with engine + key meta for transparency
    const metaSuffix =
      engine === "faceonlive"
        ? ` [FaceOnLive: ${extraMeta.document_type ?? "?"}${extraMeta.ocr_name ? " • " + extraMeta.ocr_name : ""}]`
        : " [Gemini]";
    parsed.reasoning = `${parsed.reasoning}${metaSuffix}`;

    const nowIso = new Date().toISOString();
    const { data: verRow, error: insErr } = await supabaseAdmin
      .from("kyc_verifications")
      .insert({
        user_id: context.userId,
        document_url: data.documentPath,
        selfie_url: data.selfiePath ?? null,
        ai_score: parsed.score,
        ai_decision: parsed.decision,
        ai_reasoning: parsed.reasoning,
        status,
        reviewed_at: nowIso,
        document_type: data.documentType ?? null,
        document_expiry: expiryDate,
        document_meta: extraMeta as any,
        liveness_challenge: (data.livenessChallenge as any) ?? null,
        pledge_accepted: data.pledgeAccepted ?? false,
        arbitration_accepted: data.arbitrationAccepted ?? false,
        pledge_full_name: data.pledgeFullName ?? null,
        pledge_signature_url: data.signaturePath ?? null,
        pledge_signed_at: data.signaturePath ? nowIso : null,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);


    await supabaseAdmin
      .from("profiles")
      .update({
        kyc_status:
          status === "approved" ? "verified" : status === "rejected" ? "rejected" : "submitted",
        kyc_document_url: data.documentPath,
        kyc_selfie_url: data.selfiePath ?? null,
        verified_green: status === "approved",
      })
      .eq("id", context.userId);

    if (status === "approved" || status === "rejected") {
      try {
        const { emailKycResult } = await import("./email-events.server");
        await emailKycResult(context.userId, status === "approved", parsed.reasoning);
      } catch (error) {
        console.warn("[kyc email]", error);
      }
    }

    try {
      const { emailAdminsKycSubmission } = await import("./email-events.server");
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("display_name")
        .eq("id", context.userId)
        .maybeSingle();
      const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      const displayName =
        prof && typeof prof === "object" && "display_name" in prof
          ? String(prof.display_name || "") || null
          : null;

      await emailAdminsKycSubmission({
        userId: context.userId,
        email: userRow?.user?.email ?? null,
        displayName,
        status,
        score: parsed.score,
        reasoning: parsed.reasoning,
        documentUrl: data.documentPath,
        selfieUrl: data.selfiePath ?? null,
      });
    } catch (error) {
      console.warn("[kyc admin email]", error);
    }

    return { id: verRow.id, status, score: parsed.score, reasoning: parsed.reasoning };
  });
