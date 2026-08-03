// AI removed by user request. Stub server fns that return a friendly error.
import { createServerFn } from "@tanstack/react-start";

type AutofillResult = { ok: false; error: string; profile?: any };
type BioResult = { ok: false; error: string; bio?: string };

export const aiProfileAutofill = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as any)
  .handler(async (): Promise<AutofillResult> => ({ ok: false, error: "تم إيقاف ميزات الذكاء الاصطناعي على المنصة." }));

export const aiWriteBio = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as any)
  .handler(async (): Promise<BioResult> => ({ ok: false, error: "تم إيقاف ميزات الذكاء الاصطناعي على المنصة." }));
