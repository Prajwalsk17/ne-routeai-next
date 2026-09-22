import { getCurrentFirebaseUser } from '@/lib/auth/firebase-client';

/**
 * Authenticated fetch wrapper — automatically adds JWT Bearer token
 * Uses fresh Firebase ID token if signed in, falling back to local session token.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = typeof window !== 'undefined' ? localStorage.getItem('ner_token') || '' : '';

  if (typeof window !== 'undefined') {
    try {
      const user = getCurrentFirebaseUser();
      if (user) {
        const freshIdToken = await user.getIdToken();
        if (freshIdToken) {
          token = freshIdToken;
        }
      }
    } catch {
      // Fallback to stored token
    }
  }

  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  return fetch(url, { ...options, headers });
}
