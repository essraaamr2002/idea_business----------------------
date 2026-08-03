import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const InteractSchema = z.object({
  businessId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  type: z.enum(['LIKE', 'REPOST', 'COMMENT']),
});

export const interactWithBusiness = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InteractSchema.parse(input))
  .handler(async ({ data }) => {
    return {
      status: 'SUCCESS' as const,
      message: `Interaction type: ${data.type} registered on IDEA BUSINESS: ${data.businessId}`,
    };
  });

const PromoteSchema = z.object({
  businessId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  budget: z.number().min(1).max(1_000_000),
});

export const promoteBusiness = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PromoteSchema.parse(input))
  .handler(async ({ data }) => {
    return {
      status: 'SUCCESS' as const,
      message: `Business ${data.businessId} is now promoted in the global community feed!`,
      budget: data.budget,
    };
  });
