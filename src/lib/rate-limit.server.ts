/**
 * Server-side rate limit helper. Call from createServerFn handlers to throttle
 * sensitive actions per user. Uses the public.check_rate_limit() Postgres
 * function which records each attempt and raises 42901 when exceeded.
 *
 * Usage:
 *   await checkRateLimit(supabase, "withdraw", 5, 3600); // 5 per hour
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export class RateLimitError extends Error {
  constructor(action: string) {
    super(`rate_limit_exceeded:${action}`);
    this.name = "RateLimitError";
  }
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  action: string,
  maxCount: number,
  windowSeconds: number,
): Promise<void> {
  const { error } = await supabase.rpc("check_rate_limit", {
    _action: action,
    _max_count: maxCount,
    _window_seconds: windowSeconds,
  });
  if (error) {
    if (error.code === "42901" || /rate_limit_exceeded/i.test(error.message)) {
      throw new RateLimitError(action);
    }
    throw error;
  }
}

/**
 * Standard limits per sensitive action.
 */
export const RATE_LIMITS = {
  login: { max: 10, window: 900 }, // 10 per 15min
  forgot_password: { max: 3, window: 3600 }, // 3 per hour
  withdraw_request: { max: 5, window: 3600 },
  transfer_send: { max: 30, window: 3600 },
  trade_buy: { max: 60, window: 3600 },
  kyc_submit: { max: 5, window: 86400 }, // 5 per day
  ai_generate: { max: 30, window: 3600 },
} as const;
