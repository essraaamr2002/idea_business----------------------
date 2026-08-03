import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export const getNotificationPrefs = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from('notification_prefs')
      .select('*')
      .eq('user_id', context.userId)
      .maybeSingle();
    return (
      data ?? {
        user_id: context.userId,
        email_enabled: true,
        inapp_enabled: true,
        dm_enabled: true,
        journalist_digest: true,
      }
    );
  });

const updateSchema = z.object({
  email_enabled: z.boolean().optional(),
  inapp_enabled: z.boolean().optional(),
  dm_enabled: z.boolean().optional(),
  journalist_digest: z.boolean().optional(),
});

export const updateNotificationPrefs = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('notification_prefs').upsert({
      user_id: context.userId,
      ...data,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
