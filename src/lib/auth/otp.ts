import { getServiceSupabase } from '@/lib/db/supabase';
import { generateOTP as localGenerateOTP, verifyOTP as localVerifyOTP } from '@/lib/db';

export type OtpChannel = 'email' | 'phone';
export type OtpPurpose = 'login' | 'signup' | 'recovery';

interface RateLimitEntry {
  lastSentAt: number;
  attempts: number;
  windowStart: number;
}

const rateLimitCache = new Map<string, RateLimitEntry>();
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Requests an OTP for an email or phone number.
 * Never returns the plaintext code in production.
 */
export async function requestOtp(
  identifier: string,
  channel: OtpChannel = 'email',
  purpose: OtpPurpose = 'login'
): Promise<{ success: boolean; error?: string; cooldownRemaining?: number }> {
  const normalizedId = identifier.trim().toLowerCase();
  const now = Date.now();

  // Rate Limiting Check
  const rateInfo = rateLimitCache.get(normalizedId);
  if (rateInfo) {
    const elapsed = now - rateInfo.lastSentAt;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        success: false,
        error: `Please wait ${remainingSeconds} seconds before requesting a new code.`,
        cooldownRemaining: remainingSeconds,
      };
    }
  }

  // 1. Supabase Auth OTP (Email / SMS)
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      if (channel === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: normalizedId,
          options: { shouldCreateUser: purpose === 'signup' },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: normalizedId,
        });
        if (error) throw error;
      }

      rateLimitCache.set(normalizedId, {
        lastSentAt: now,
        attempts: 0,
        windowStart: now,
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deliver OTP';
      return { success: false, error: msg };
    }
  }

  // 2. Development / Local Fallback
  const code = localGenerateOTP(normalizedId, purpose);
  if (process.env.NODE_ENV !== 'production') {
    // Securely logged only to local server console — NEVER sent in API JSON
    console.log(`\n========================================`);
    console.log(`🔐 [LOCAL DEV AUTH] Verification Code`);
    console.log(`Target:  ${normalizedId} (${channel})`);
    console.log(`Purpose: ${purpose.toUpperCase()}`);
    console.log(`Code:    >>> ${code} <<<`);
    console.log(`========================================\n`);
  }

  rateLimitCache.set(normalizedId, {
    lastSentAt: now,
    attempts: 0,
    windowStart: now,
  });

  return { success: true };
}

/**
 * Validates a submitted OTP code with brute-force protection.
 */
export async function verifyOtpCode(
  identifier: string,
  code: string,
  channel: OtpChannel = 'email',
  purpose: OtpPurpose = 'login'
): Promise<{ success: boolean; error?: string; session?: unknown }> {
  const normalizedId = identifier.trim().toLowerCase();
  const trimmedCode = code.trim();
  const now = Date.now();

  // Brute-force protection
  let rateInfo = rateLimitCache.get(normalizedId);
  if (!rateInfo) {
    rateInfo = { lastSentAt: now, attempts: 0, windowStart: now };
    rateLimitCache.set(normalizedId, rateInfo);
  }

  if (now - rateInfo.windowStart > ATTEMPT_WINDOW_MS) {
    rateInfo.attempts = 0;
    rateInfo.windowStart = now;
  }

  rateInfo.attempts++;
  if (rateInfo.attempts > MAX_ATTEMPTS) {
    return {
      success: false,
      error: 'Too many failed verification attempts. Please request a new code.',
    };
  }

  // 1. Supabase Auth Verification
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      const verifyParams =
        channel === 'email'
          ? {
              email: normalizedId,
              token: trimmedCode,
              type: (purpose === 'signup' ? 'signup' : 'email') as 'signup' | 'email',
            }
          : {
              phone: normalizedId,
              token: trimmedCode,
              type: 'sms' as const,
            };

      const { data, error } = await supabase.auth.verifyOtp(verifyParams);

      if (error || !data.session) {
        return { success: false, error: 'Invalid or expired verification code.' };
      }

      rateLimitCache.delete(normalizedId);
      return { success: true, session: data.session };
    } catch {
      return { success: false, error: 'Verification service error.' };
    }
  }

  // 2. Local Fallback Verification
  const isValid = localVerifyOTP(normalizedId, trimmedCode, purpose);
  if (!isValid) {
    return { success: false, error: 'Invalid or expired verification code.' };
  }

  rateLimitCache.delete(normalizedId);
  return { success: true };
}
