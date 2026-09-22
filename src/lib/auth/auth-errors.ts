/**
 * AuraNER / NER-Route AI — Centralized Authentication Error Mapping
 * 
 * Maps Firebase Auth error codes to helpful, user-facing explanations.
 * Prevents raw exceptions (such as "auth/internal-error") from leaking to users,
 * while safely retaining actionable diagnostic advice for administrators.
 */

export interface AuthErrorDetails {
  code: string;
  userMessage: string;
  adminHint?: string;
}

/**
 * Extracts Firebase error code from an unknown error object.
 * Checks both err.code (standard Firebase) and regex matches inside err.message.
 */
export function extractAuthErrorCode(err: unknown): string | null {
  if (!err) return null;

  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === 'string' && code.startsWith('auth/')) {
      return code;
    }
  }

  if (err instanceof Error) {
    const match = err.message.match(/auth\/[a-z0-9-]+/i);
    if (match) {
      return match[0].toLowerCase();
    }
  }

  if (typeof err === 'string') {
    const match = err.match(/auth\/[a-z0-9-]+/i);
    if (match) {
      return match[0].toLowerCase();
    }
  }

  return null;
}

/**
 * Maps error codes to user-friendly messages based on authentication context.
 */
export function getReadableAuthError(
  err: unknown,
  context: 'google' | 'email' | 'phone' | 'general' = 'general'
): string {
  if (!err) return 'An unexpected error occurred during authentication.';

  const code = extractAuthErrorCode(err);

  switch (code) {
    // 1. Google OAuth & Popup Errors
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';

    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Please allow pop-ups for this site and try again.';

    case 'auth/cancelled-popup-request':
      return 'Sign-in window was closed because another authentication request was initiated.';

    case 'auth/internal-error':
      if (context === 'google') {
        return "Google Sign-In is unavailable or not enabled in Firebase Console for project 'ne-routeai-next'. Ensure Google provider is enabled under Authentication > Sign-in method and localhost is added to Authorized Domains.";
      }
      if (context === 'phone') {
        return 'Phone Authentication encountered an internal error. This may occur on localhost where reCAPTCHA domain verification fails. Phone OTP requires a deployed HTTPS domain.';
      }
      return 'Firebase Authentication encountered an internal service error. Please verify network connectivity and Firebase configuration.';

    case 'auth/configuration-not-found':
      return "Firebase Authentication configuration not found. Ensure the Google provider is fully configured in Firebase Console → Authentication → Sign-in method, including a valid Project Support Email and OAuth consent screen.";

    case 'auth/invalid-api-key':
      return 'The Firebase API key is invalid or does not match the project. Verify NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file matches the key from Firebase Console → Project Settings.';

    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in the Firebase Console. Add your current host (e.g., localhost) to Authentication > Settings > Authorized domains.';

    case 'auth/operation-not-allowed':
      if (context === 'google') {
        return "Google Sign-In provider is disabled in Firebase Console for project 'ne-routeai-next'. Enable it in Authentication > Sign-in method.";
      }
      if (context === 'phone') {
        return "Phone Authentication provider is disabled in Firebase Console for project 'ne-routeai-next'. Enable it in Authentication > Sign-in method.";
      }
      if (context === 'email') {
        return "Email/Password provider is disabled in Firebase Console for project 'ne-routeai-next'. Enable it in Authentication > Sign-in method.";
      }
      return 'This sign-in method is currently disabled in your Firebase project configuration.';

    // 2. Email & Password Errors
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'The email or password is incorrect.';

    case 'auth/user-not-found':
      return 'No account was found with this email address. Please check your spelling or register.';

    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact your organization administrator.';

    case 'auth/invalid-email':
      return 'Please enter a valid email address.';

    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';

    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';

    case 'auth/missing-password':
      return 'Please enter your password.';

    case 'auth/missing-email':
      return 'Please enter your email address.';

    // 3. Phone & SMS OTP Errors
    case 'auth/invalid-phone-number':
      return 'Enter a valid mobile phone number in international format (e.g., +91 98765 43210).';

    case 'auth/missing-phone-number':
      return 'Please provide a valid phone number.';

    case 'auth/invalid-verification-code':
      return 'The 6-digit verification code is incorrect. Please verify the code received via SMS.';

    case 'auth/code-expired':
      return 'The verification code has expired. Please request a new SMS code.';

    case 'auth/quota-exceeded':
      return 'The SMS verification quota has been exceeded for this project. Please try again later or contact support.';

    case 'auth/captcha-check-failed':
      return 'reCAPTCHA verification failed. Please refresh the page and try again.';

    // 4. Rate Limiting & Network Errors
    case 'auth/too-many-requests':
      return 'Too many failed sign-in attempts. Access temporarily locked for security. Please wait a few minutes and try again.';

    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and try again.';

    default: {
      if (err instanceof Error && err.message) {
        // Strip out any technical stack or internal identifiers
        const clean = err.message
          .replace(/^Firebase:\s*/i, '')
          .replace(/\(auth\/[a-z0-9-]+\)\.?/i, '')
          .trim();
        if (clean && clean.length > 5 && !clean.includes('apiKey') && !clean.includes('secret')) {
          return clean;
        }
      }
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
        const clean = (err as { message: string }).message
          .replace(/^Firebase:\s*/i, '')
          .replace(/\(auth\/[a-z0-9-]+\)\.?/i, '')
          .trim();
        if (clean && clean.length > 5 && !clean.includes('apiKey') && !clean.includes('secret')) {
          return clean;
        }
      }
      return 'Authentication failed. Please verify your credentials and try again.';
    }
  }
}

/**
 * Guarantees that any authentication error is converted into a safe, non-object string for JSX rendering.
 * Prevents "Objects are not valid as a React child (found: object with keys {code, message, requestId})"
 * and "[object Object]" rendering artifacts.
 */
export function safeAuthErrorMessage(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
      return (err as { message: string }).message;
    }
    if ('error' in err) {
      return safeAuthErrorMessage((err as { error: unknown }).error);
    }
    if ('code' in err && typeof (err as { code: unknown }).code === 'string') {
      return (err as { code: string }).code;
    }
  }
  return 'Authentication failed. Please verify your credentials and try again.';
}

/**
 * Safely logs diagnostic authentication errors in development without exposing credentials.
 */
export function safeLogAuthError(source: string, err: unknown): void {
  if (process.env.NODE_ENV === 'production') return;

  const code = extractAuthErrorCode(err);
  const message = err instanceof Error ? err.message : String(err);

  // Extract Firebase-specific customData for deeper diagnosis
  let customData: unknown = undefined;
  if (typeof err === 'object' && err !== null && 'customData' in err) {
    customData = (err as { customData: unknown }).customData;
  }

  // eslint-disable-next-line no-console
  console.warn(`[AuthDiagnostic:${source}]`, {
    code: code || 'UNKNOWN_AUTH_CODE',
    summary: message.substring(0, 300),
    ...(customData ? { customData } : {}),
  });
}
