import { describe, it, expect } from 'vitest';
import { extractAuthErrorCode, getReadableAuthError } from '../auth/auth-errors';
import { normalizeToE164, validatePhoneNumber, COUNTRIES, DEFAULT_COUNTRY } from '@/components/auth/CountrySelector';

describe('Authentication Error Mapping Engine', () => {
  describe('extractAuthErrorCode', () => {
    it('extracts error code from standard Firebase error object', () => {
      const err = { code: 'auth/internal-error', message: 'Internal error occurred' };
      expect(extractAuthErrorCode(err)).toBe('auth/internal-error');
    });

    it('extracts error code embedded in error message string', () => {
      const err = new Error('Firebase: Error (auth/invalid-credential).');
      expect(extractAuthErrorCode(err)).toBe('auth/invalid-credential');
    });

    it('handles uppercase or mixed-case error codes', () => {
      const err = new Error('Firebase: (auth/POPUP-CLOSED-BY-USER)');
      expect(extractAuthErrorCode(err)).toBe('auth/popup-closed-by-user');
    });

    it('returns null for unrelated errors', () => {
      const err = new Error('Database connection failed');
      expect(extractAuthErrorCode(err)).toBeNull();
    });
  });

  describe('getReadableAuthError', () => {
    it('translates auth/internal-error in Google context to actionable Firebase Console instructions', () => {
      const err = new Error('Firebase: Error (auth/internal-error).');
      const msg = getReadableAuthError(err, 'google');
      expect(msg).toContain("Google Sign-In is unavailable or not enabled in Firebase Console for project 'ne-routeai-next'");
      expect(msg).toContain('Authentication > Sign-in method');
      expect(msg).toContain('Authorized Domains');
    });

    it('translates auth/popup-closed-by-user', () => {
      const err = { code: 'auth/popup-closed-by-user' };
      expect(getReadableAuthError(err)).toBe('Google sign-in was cancelled.');
    });

    it('translates auth/popup-blocked', () => {
      const err = { code: 'auth/popup-blocked' };
      expect(getReadableAuthError(err)).toContain('Your browser blocked the Google sign-in window');
    });

    it('translates auth/invalid-credential', () => {
      const err = { code: 'auth/invalid-credential' };
      expect(getReadableAuthError(err)).toBe('The email or password is incorrect.');
    });

    it('translates auth/wrong-password', () => {
      const err = { code: 'auth/wrong-password' };
      expect(getReadableAuthError(err)).toBe('The email or password is incorrect.');
    });

    it('translates auth/user-not-found', () => {
      const err = { code: 'auth/user-not-found' };
      expect(getReadableAuthError(err)).toContain('No account was found with this email address');
    });

    it('translates auth/user-disabled', () => {
      const err = { code: 'auth/user-disabled' };
      expect(getReadableAuthError(err)).toContain('This account has been disabled');
    });

    it('translates auth/too-many-requests', () => {
      const err = { code: 'auth/too-many-requests' };
      expect(getReadableAuthError(err)).toContain('Too many failed sign-in attempts');
    });

    it('translates auth/invalid-phone-number', () => {
      const err = { code: 'auth/invalid-phone-number' };
      expect(getReadableAuthError(err, 'phone')).toContain('Enter a valid mobile phone number');
    });

    it('translates auth/invalid-verification-code', () => {
      const err = { code: 'auth/invalid-verification-code' };
      expect(getReadableAuthError(err, 'phone')).toContain('The 6-digit verification code is incorrect');
    });

    it('translates auth/code-expired', () => {
      const err = { code: 'auth/code-expired' };
      expect(getReadableAuthError(err, 'phone')).toContain('The verification code has expired');
    });

    it('translates auth/network-request-failed', () => {
      const err = { code: 'auth/network-request-failed' };
      expect(getReadableAuthError(err)).toBe('Network error. Check your internet connection and try again.');
    });

    it('provides safe fallback without leaking credentials or stack traces', () => {
      const err = new Error('Firebase: Some internal error with secret_api_key_123');
      const msg = getReadableAuthError(err);
      expect(msg).not.toContain('secret_api_key_123');
      expect(msg).toBe('Authentication failed. Please verify your credentials and try again.');
    });
  });
});

describe('Phone Number Normalization & Validation', () => {
  it('normalizes Indian phone number to E.164', () => {
    const res = normalizeToE164('+91', '98765 43210');
    expect(res).toBe('+919876543210');
  });

  it('handles country code without leading plus sign', () => {
    const res = normalizeToE164('91', '9876543210');
    expect(res).toBe('+919876543210');
  });

  it('strips leading zero from local phone number', () => {
    const res = normalizeToE164('+91', '09876543210');
    expect(res).toBe('+919876543210');
  });

  it('strips spaces, dashes, and parentheses', () => {
    const res = normalizeToE164('+1', '(202) 555-0123');
    expect(res).toBe('+12025550123');
  });

  it('validates correct Indian 10-digit mobile number', () => {
    const val = validatePhoneNumber(DEFAULT_COUNTRY, '9876543210');
    expect(val.valid).toBe(true);
    expect(val.error).toBeUndefined();
  });

  it('rejects Indian mobile number with less than 10 digits', () => {
    const val = validatePhoneNumber(DEFAULT_COUNTRY, '987654321');
    expect(val.valid).toBe(false);
    expect(val.error).toContain('must be exactly 10 digits');
  });

  it('rejects Indian mobile number not starting with 6, 7, 8, or 9', () => {
    const val = validatePhoneNumber(DEFAULT_COUNTRY, '5555555555');
    expect(val.valid).toBe(false);
    expect(val.error).toContain('must start with 6, 7, 8, or 9');
  });

  it('validates international country from catalog', () => {
    const usCountry = COUNTRIES.find((c) => c.code === 'US')!;
    expect(validatePhoneNumber(usCountry, '2025550123').valid).toBe(true);
  });
});
