import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkIsAdminOrSeo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isSeo } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "seo",
    });
    return { isAdmin: !!isAdmin, isSeo: !!isSeo };
  });
