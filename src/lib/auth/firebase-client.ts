/**
 * AuraNER / NER-Route AI — Production Firebase Client Authentication Adapter
 * 
 * Supports:
 * 1. Google Sign-In (OAuth popup / redirect)
 * 2. Email + Password (Standard credentials)
 * 3. Phone Number + SMS OTP (Firebase Phone Auth with reCAPTCHA)
 * 
 * Invariants:
 * - Zero fake users / zero convenience bypasses
 * - Obtains cryptographically verifiable Firebase RS256 ID Token
 * - Synchronizes with server-side session via /api/auth/session (HTTP-Only Cookie)
 * - Safe failure states when environment variables are not configured
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  ConfirmationResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

export interface FirebaseClientConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

let _firebaseApp: FirebaseApp | null = null;
let _firebaseAuth: Auth | null = null;
let _runtimeConfig: FirebaseClientConfig | null = null;

export function getFirebaseConfig(): FirebaseClientConfig {
  const envProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const canonicalProjectId = 'ne-routeai-next';
  const resolvedProjectId =
    _runtimeConfig?.projectId ||
    (envProjectId && envProjectId !== 'auraner-dev-local' ? envProjectId : canonicalProjectId);

  return {
    apiKey: _runtimeConfig?.apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:
      _runtimeConfig?.authDomain ||
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
      `${resolvedProjectId}.firebaseapp.com`,
    projectId: resolvedProjectId,
    storageBucket:
      _runtimeConfig?.storageBucket ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      `${resolvedProjectId}.firebasestorage.app`,
    messagingSenderId: _runtimeConfig?.messagingSenderId || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: _runtimeConfig?.appId || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: _runtimeConfig?.measurementId || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

export function isFirebaseClientConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId);
}

/**
 * Proactively verifies Firebase configuration, attempting runtime fetch fallback
 * if client-bundle build-time environment inlining was incomplete.
 */
export async function ensureFirebaseClientConfigured(): Promise<boolean> {
  if (isFirebaseClientConfigured()) return true;
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/auth/firebase-config');
      if (res.ok) {
        const data = await res.json();
        if (data.configured && data.config) {
          _runtimeConfig = data.config;
          return true;
        }
      }
    } catch {
      // Best-effort network fallback
    }
  }
  return isFirebaseClientConfigured();
}

export function getFirebaseAuth(): Auth {
  if (_firebaseAuth) return _firebaseAuth;

  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    throw new Error(
      'Firebase Authentication is not configured. Please set NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID.'
    );
  }

  if (getApps().length > 0) {
    _firebaseApp = getApp();
  } else {
    _firebaseApp = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });
  }

  _firebaseAuth = getAuth(_firebaseApp);
  return _firebaseAuth;
}

/**
 * Signs in via Google OAuth Popup
 */
export async function signInWithGoogle(): Promise<{ idToken: string; user: FirebaseUser }> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken(true);
  return { idToken, user: result.user };
}

/**
 * Signs in via Google OAuth Redirect (for environments where popups are blocked)
 */
export async function signInWithGoogleRedirect(): Promise<void> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithRedirect(auth, provider);
}

/**
 * Resolves redirect result for Google OAuth redirect flow
 */
export async function handleGoogleRedirectResult(): Promise<{ idToken: string; user: FirebaseUser } | null> {
  const auth = getFirebaseAuth();
  const result = await getRedirectResult(auth);
  if (!result || !result.user) return null;
  const idToken = await result.user.getIdToken(true);
  return { idToken, user: result.user };
}

/**
 * Signs in via Email and Password
 */
export async function signInWithEmail(
  email: string,
  pass: string
): Promise<{ idToken: string; user: FirebaseUser }> {
  const auth = getFirebaseAuth();
  const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const idToken = await result.user.getIdToken(true);
  return { idToken, user: result.user };
}

/**
 * Registers a new user via Email and Password
 */
export async function signUpWithEmail(
  email: string,
  pass: string
): Promise<{ idToken: string; user: FirebaseUser }> {
  const auth = getFirebaseAuth();
  const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  const idToken = await result.user.getIdToken(true);
  return { idToken, user: result.user };
}

/**
 * Initializes reCAPTCHA for Phone Authentication
 */
export function setupRecaptcha(
  containerId: string,
  callbacks?: {
    onSuccess?: (response: unknown) => void;
    onExpired?: () => void;
  }
): RecaptchaVerifier {
  const auth = getFirebaseAuth();
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: (response: unknown) => {
      callbacks?.onSuccess?.(response);
    },
    'expired-callback': () => {
      callbacks?.onExpired?.();
    },
  });
}

/**
 * Safely clears an existing reCAPTCHA verifier instance and resets the DOM container
 */
export function clearRecaptcha(verifier: RecaptchaVerifier | null, containerId = 'recaptcha-container'): void {
  if (verifier) {
    try {
      verifier.clear();
    } catch {
      // Ignore clear error
    }
  }
  if (typeof document !== 'undefined') {
    const el = document.getElementById(containerId);
    if (el) {
      el.innerHTML = '';
    }
  }
}

/**
 * Sends Phone SMS OTP code
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  return signInWithPhoneNumber(auth, phoneNumber.trim(), verifier);
}

/**
 * Verifies submitted SMS OTP code
 */
export async function confirmPhoneOtp(
  confirmation: ConfirmationResult,
  otpCode: string
): Promise<{ idToken: string; user: FirebaseUser }> {
  const result = await confirmation.confirm(otpCode.trim());
  const idToken = await result.user.getIdToken(true);
  return { idToken, user: result.user };
}

/**
 * Subscribes to Firebase Auth state changes
 */
export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void): () => void {
  if (!isFirebaseClientConfigured()) {
    return () => {};
  }
  try {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, callback);
  } catch {
    return () => {};
  }
}

/**
 * Returns current Firebase User if signed in
 */
export function getCurrentFirebaseUser(): FirebaseUser | null {
  if (!isFirebaseClientConfigured()) return null;
  try {
    const auth = getFirebaseAuth();
    return auth.currentUser;
  } catch {
    return null;
  }
}

/**
 * Exchanges Firebase ID Token with server-side /api/auth/session to create HTTP-Only cookie
 */
export async function establishServerSession(
  idToken: string,
  metadata?: { name?: string; role?: string; organizationId?: string }
): Promise<{
  success: boolean;
  user?: any;
  token?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, ...metadata }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const normalizedError =
        typeof data.error === 'string'
          ? data.error
          : data.error && typeof data.error === 'object' && 'message' in data.error && typeof data.error.message === 'string'
          ? data.error.message
          : 'Failed to establish server session.';
      return { success: false, error: normalizedError };
    }

    return {
      success: true,
      user: data.data.user,
      token: data.data.token,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error during session establishment.',
    };
  }
}

/**
 * Signs out from client Firebase instance
 */
export async function signOutFirebase(): Promise<void> {
  try {
    if (isFirebaseClientConfigured()) {
      const auth = getFirebaseAuth();
      await firebaseSignOut(auth);
    }
  } catch {
    // Best-effort sign-out
  }
}
