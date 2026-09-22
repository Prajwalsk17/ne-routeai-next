'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mountain,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  Phone,
  Mail,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import {
  isFirebaseClientConfigured,
  ensureFirebaseClientConfigured,
  signInWithGoogle,
  signInWithGoogleRedirect,
  handleGoogleRedirectResult,
  signInWithEmail,
  setupRecaptcha,
  clearRecaptcha,
  sendPhoneOtp,
  confirmPhoneOtp,
  establishServerSession,
  subscribeToAuthState,
} from '@/lib/auth/firebase-client';
import { CountrySelector, DEFAULT_COUNTRY, normalizeToE164, validatePhoneNumber, type CountryInfo } from '@/components/auth/CountrySelector';
import { GoogleIcon } from '@/components/auth/GoogleIcon';
import { extractAuthErrorCode, getReadableAuthError, safeLogAuthError, safeAuthErrorMessage } from '@/lib/auth/auth-errors';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';

type AuthMethod = 'email' | 'phone';
type PhoneStep = 'number' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);

  // If already authenticated with real Firebase session, redirect to /dispatch
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      if (firebaseUser) {
        const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('ner_token'));
        if (hasToken) {
          router.replace('/dispatch');
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setSafeError(err: unknown) {
    if (!err) {
      setError(null);
      return;
    }
    setError(safeAuthErrorMessage(err));
  }

  const [redirectTarget, setRedirectTarget] = useState('/dispatch');

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone state
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(DEFAULT_COUNTRY);
  const [localPhoneNumber, setLocalPhoneNumber] = useState('');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('number');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isConfigured, setIsConfigured] = useState(() => isFirebaseClientConfigured());

  // Check configuration and handle redirect returns
  useEffect(() => {
    ensureFirebaseClientConfigured().then((configured) => {
      setIsConfigured(configured);
    });

    handleGoogleRedirectResult()
      .then(async (result) => {
        if (result?.idToken) {
          setLoading(true);
          const sessionRes = await establishServerSession(result.idToken);
          if (sessionRes.success) {
            handleAuthSuccess(sessionRes.user, sessionRes.token!);
          } else {
            setSafeError(sessionRes.error || 'Failed to authenticate Google session.');
            setLoading(false);
          }
        }
      })
      .catch((err) => {
        safeLogAuthError('GoogleRedirectResult', err);
        const readable = getReadableAuthError(err, 'google');
        const errCode = extractAuthErrorCode(err);
        setSafeError(process.env.NODE_ENV !== 'production' && errCode ? `[${errCode}] ${readable}` : readable);
      });
  }, []);

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      clearRecaptcha(recaptchaVerifierRef.current);
      recaptchaVerifierRef.current = null;
    };
  }, []);

  // Read redirect destination from query string safely
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const from = params.get('from');
      if (from && from.startsWith('/') && from !== '/login' && from !== '/signup') {
        setRedirectTarget(from);
      }
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  function handleAuthSuccess(user: any, token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ner_user', JSON.stringify(user));
      localStorage.setItem('ner_token', token);
      document.cookie = `ner_session=${token}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `ner_token=${token}; path=/; max-age=86400; SameSite=Lax`;
    }
    setUser(user, token);
    const destination =
      redirectTarget &&
      redirectTarget.startsWith('/') &&
      redirectTarget !== '/login' &&
      redirectTarget !== '/signup'
        ? redirectTarget
        : '/dispatch';
    router.push(destination);
  }

  // 1. Google Sign-In
  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const { idToken } = await signInWithGoogle();
      const sessionRes = await establishServerSession(idToken);
      if (!sessionRes.success) {
        setSafeError(sessionRes.error || 'Failed to authenticate Google session.');
        setLoading(false);
        return;
      }
      handleAuthSuccess(sessionRes.user, sessionRes.token!);
    } catch (err: unknown) {
      safeLogAuthError('GoogleSignIn', err);

      // Enhanced diagnostic: surface the real Firebase error in dev console
      if (process.env.NODE_ENV !== 'production' && typeof err === 'object' && err !== null) {
        const fbErr = err as { code?: string; message?: string; customData?: unknown };
        console.error('[GoogleSignIn Firebase Diagnostic]', {
          code: fbErr.code,
          message: fbErr.message,
          customData: fbErr.customData,
        });
      }

      const readable = getReadableAuthError(err, 'google');
      const errCode = extractAuthErrorCode(err);
      const displayError = process.env.NODE_ENV !== 'production' && errCode
        ? `[${errCode}] ${readable}`
        : readable;

      // If popup was blocked, offer redirect fallback automatically
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'auth/popup-blocked') {
        try {
          await signInWithGoogleRedirect();
          return;
        } catch (redirectErr) {
          safeLogAuthError('GoogleRedirectFallback', redirectErr);
        }
      }

      setSafeError(displayError);
      setLoading(false);
    }
  }

  // 2. Email + Password Sign-In
  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setSafeError('Please provide both work email address and password.');
      return;
    }

    setSafeError(null);
    setLoading(true);
    try {
      const { idToken } = await signInWithEmail(email, password);
      const sessionRes = await establishServerSession(idToken);
      if (!sessionRes.success) {
        setSafeError(sessionRes.error || 'Invalid credentials or session rejected.');
        setLoading(false);
        return;
      }
      handleAuthSuccess(sessionRes.user, sessionRes.token!);
    } catch (err: unknown) {
      safeLogAuthError('EmailSignIn', err);
      setSafeError(getReadableAuthError(err, 'email'));
      setLoading(false);
    }
  }

  // 3. Phone Number OTP: Send SMS
  async function handleSendPhoneOtp(e: React.FormEvent) {
    e.preventDefault();

    // Validate phone number according to selected country rules
    const validation = validatePhoneNumber(selectedCountry, localPhoneNumber);
    if (!validation.valid) {
      setSafeError(validation.error || 'Please enter a valid mobile number.');
      return;
    }

    const e164Phone = normalizeToE164(selectedCountry.dialCode, localPhoneNumber);

    setSafeError(null);
    setLoading(true);
    try {
      // Clear previous verifier instance to prevent duplication
      clearRecaptcha(recaptchaVerifierRef.current);
      recaptchaVerifierRef.current = null;

      recaptchaVerifierRef.current = setupRecaptcha('recaptcha-container', {
        onExpired: () => {
          setSafeError('reCAPTCHA verification expired. Please request a new verification code.');
          clearRecaptcha(recaptchaVerifierRef.current);
          recaptchaVerifierRef.current = null;
        },
      });
      const confirmation = await sendPhoneOtp(e164Phone, recaptchaVerifierRef.current);
      setConfirmationResult(confirmation);
      setPhoneStep('otp');
      setOtpDigits(['', '', '', '', '', '']);
      setCooldown(60);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 250);
    } catch (err: unknown) {
      safeLogAuthError('SendPhoneOtp', err);
      setSafeError(getReadableAuthError(err, 'phone'));
      clearRecaptcha(recaptchaVerifierRef.current);
      recaptchaVerifierRef.current = null;
    } finally {
      setLoading(false);
    }
  }

  // 4. Phone Number OTP: Verify Code
  async function handleVerifyPhoneOtp(codeOverride?: string) {
    const code = (codeOverride || otpDigits.join('')).trim();
    if (code.length !== 6) {
      setSafeError('Please enter the full 6-digit SMS verification code.');
      return;
    }

    if (!confirmationResult) {
      setSafeError('SMS session has expired. Please request a new verification code.');
      setPhoneStep('number');
      return;
    }

    setSafeError(null);
    setLoading(true);
    try {
      const { idToken } = await confirmPhoneOtp(confirmationResult, code);
      const sessionRes = await establishServerSession(idToken);
      if (!sessionRes.success) {
        setSafeError(sessionRes.error || 'Failed to authenticate phone session.');
        setLoading(false);
        return;
      }
      handleAuthSuccess(sessionRes.user, sessionRes.token!);
    } catch (err: unknown) {
      safeLogAuthError('ConfirmPhoneOtp', err);
      setSafeError(getReadableAuthError(err, 'phone'));
      setLoading(false);
    }
  }

  function handleOtpDigitChange(index: number, val: string) {
    // Handle paste of complete 6-digit code
    if (val.length > 1) {
      const cleanPasted = val.replace(/\D/g, '').slice(0, 6);
      if (cleanPasted.length > 0) {
        const nextDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          nextDigits[i] = cleanPasted[i] || '';
        }
        setOtpDigits(nextDigits);
        const nextFocusIndex = Math.min(cleanPasted.length, 5);
        otpInputRefs.current[nextFocusIndex]?.focus();
        if (cleanPasted.length === 6) {
          handleVerifyPhoneOtp(cleanPasted);
        }
      }
      return;
    }

    if (!/^\d*$/.test(val)) return;
    const nextDigits = [...otpDigits];
    nextDigits[index] = val.slice(-1);
    setOtpDigits(nextDigits);

    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
    if (nextDigits.every((d) => d !== '')) {
      handleVerifyPhoneOtp(nextDigits.join(''));
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="min-h-screen flex bg-[#080C0A] text-white">
      {/* Invisible container for Firebase reCAPTCHA verification */}
      <div id="recaptcha-container" />

      {/* Left Column: Brand & Security Overview */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:flex flex-1 flex-col justify-center px-16 bg-gradient-to-br from-orchid/[0.08] via-transparent to-teal/[0.05] border-r border-white/5"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orchid/15 border border-orchid/30 flex items-center justify-center text-orchid shadow-lg shadow-orchid/10">
            <Mountain className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            NER-Route<span className="text-teal">AI</span>
          </h1>
        </div>

        <p className="text-xl text-mist-dim mt-8 leading-relaxed max-w-md font-medium">
          AI-Powered Smart Logistics &amp; Dynamic Hazard Intelligence for Northeast India
        </p>

        <div className="mt-10 space-y-4 max-w-md">
          {[
            { dot: 'bg-safe', title: 'Cryptographic Authentication', text: 'Firebase RS256 token verification with multi-provider identity' },
            { dot: 'bg-orchid', title: 'Real-Time Hazard Intelligence', text: 'Landslide, flood, and road blockage radar with <5km proximity alerts' },
            { dot: 'bg-teal', title: 'Dynamic Recalculation Engine', text: 'Automated detours across Assam, Meghalaya, Arunachal & NER highways' },
            { dot: 'bg-amber', title: 'Multi-Tenant Isolation', text: 'Cross-state organizational governance and strict RBAC authorization' },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className={`w-2.5 h-2.5 rounded-full ${f.dot} mt-1 shrink-0`} />
              <div>
                <div className="text-xs font-semibold text-white">{f.title}</div>
                <div className="text-xs text-mist-muted mt-0.5">{f.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-xs text-mist-muted flex items-center gap-2">
          <ShieldCheck size={16} className="text-safe" />
          <span>FIPS-compliant end-to-end token verification active</span>
        </div>
      </motion.div>

      {/* Right Column: Authentication Card */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex items-center justify-center p-6 md:p-10"
      >
        <div className="w-full max-w-md bg-[#111A14] backdrop-blur-2xl rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl shadow-black/80">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Sign In</h2>
              <p className="text-mist-muted mt-1 text-xs">NER Logistics Command Platform</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orchid/15 border border-orchid/20 flex items-center justify-center text-orchid">
              <ShieldCheck size={20} />
            </div>
          </div>

          {/* Configuration Warning if Firebase Credentials Absent */}
          {!isConfigured && (
            <div className="mb-6 p-4 rounded-xl bg-amber/10 border border-amber/30 text-amber-light text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-amber">
                <AlertTriangle size={16} /> Firebase Configuration Missing
              </div>
              <p className="text-mist-dim leading-relaxed">
                Client environment variables for Firebase are not loaded. Set <code className="text-white bg-black/40 px-1 py-0.5 rounded">NEXT_PUBLIC_FIREBASE_API_KEY</code> and <code className="text-white bg-black/40 px-1 py-0.5 rounded">NEXT_PUBLIC_FIREBASE_PROJECT_ID</code> in <code className="text-white">.env.local</code>.
              </p>
            </div>
          )}

          {/* Error Alert */}
          {error && typeof error === 'string' && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-danger/10 border border-danger/30 text-danger-light text-xs leading-relaxed flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-danger mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* 1. Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || !isConfigured}
            aria-label="Continue with Google"
            className="w-full py-3 px-4 rounded-xl bg-[#0B130F] hover:bg-[#14221B] border border-white/20 hover:border-orchid/50 text-[#F8FAFC] font-semibold text-sm flex items-center justify-center gap-3 transition-all mb-6 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orchid active:scale-[0.99]"
          >
            <GoogleIcon className="w-5 h-5 shrink-0" />
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-white/10" />
            <span className="px-3 text-[0.7rem] text-mist-muted font-bold uppercase tracking-wider">or sign in with</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          {/* Authentication Method Tabs */}
          <div className="flex p-1 bg-[#080C0A] rounded-xl border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => { setAuthMethod('email'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'email' ? 'bg-orchid text-white shadow-md shadow-orchid/30' : 'text-mist-muted hover:text-white'
              }`}
            >
              <Mail size={14} /> Work Email
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('phone'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'phone' ? 'bg-teal text-white shadow-md shadow-teal/30' : 'text-mist-muted hover:text-white'
              }`}
            >
              <Phone size={14} /> Phone OTP
            </button>
          </div>

          {/* 2. Email + Password Form */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-mist mb-1.5">Work Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dispatcher@ner-routeai.in"
                  required
                  autoComplete="email"
                  disabled={loading || !isConfigured}
                  className="w-full px-4 py-3 rounded-xl bg-[#0B130F] border border-white/20 text-[#F8FAFC] placeholder:text-mist-muted text-sm font-medium focus:border-orchid focus:ring-2 focus:ring-orchid focus:outline-none transition-colors caret-orchid disabled:opacity-50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-mist">Password</label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    disabled={loading || !isConfigured}
                    className="w-full px-4 py-3 rounded-xl bg-[#0B130F] border border-white/20 text-[#F8FAFC] placeholder:text-mist-muted text-sm font-medium focus:border-orchid focus:ring-2 focus:ring-orchid focus:outline-none transition-colors pr-12 caret-orchid disabled:opacity-50"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-mist-dim hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isConfigured}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orchid to-teal hover:opacity-95 text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orchid/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 focus:outline-none focus:ring-2 focus:ring-orchid"
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <LogIn size={18} />}
                Sign In with Email
              </button>
            </form>
          )}

          {/* 3. Phone Number + SMS OTP Form */}
          {authMethod === 'phone' && (
            <div className="space-y-4">
              {phoneStep === 'number' ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-mist mb-1.5">Mobile Phone Number</label>
                    <div className="flex gap-2">
                      <CountrySelector
                        selected={selectedCountry}
                        onSelect={setSelectedCountry}
                        disabled={loading || !isConfigured}
                      />
                      <input
                        type="tel"
                        value={localPhoneNumber}
                        onChange={(e) => setLocalPhoneNumber(e.target.value)}
                        placeholder={selectedCountry.formatPlaceholder}
                        required
                        autoComplete="tel-national"
                        disabled={loading || !isConfigured}
                        className="flex-1 px-4 py-3 rounded-xl bg-[#0B130F] border border-white/20 text-[#F8FAFC] placeholder:text-mist-muted text-sm font-medium focus:border-teal focus:ring-2 focus:ring-teal focus:outline-none transition-colors caret-teal disabled:opacity-50"
                      />
                    </div>
                    <p className="text-[0.7rem] text-mist-muted mt-1.5">
                      Selected E.164: <code className="text-teal font-mono">{normalizeToE164(selectedCountry.dialCode, localPhoneNumber) || selectedCountry.dialCode}</code>
                    </p>
                    {process.env.NODE_ENV !== 'production' && (
                      <p className="text-[0.68rem] text-amber-light/80 mt-1 leading-snug">
                        Local Dev: Real SMS requires deployed HTTPS domain. On localhost, use test phone numbers configured in Firebase Console.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !isConfigured}
                    className="w-full py-3.5 rounded-xl bg-teal text-[#080C0A] font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal-light transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal/20 focus:outline-none focus:ring-2 focus:ring-teal"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : <Phone size={18} />}
                    Send SMS Verification Code
                  </button>
                </form>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-mist">
                        6-Digit Code sent to {normalizeToE164(selectedCountry.dialCode, localPhoneNumber)}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneStep('number');
                          setError(null);
                        }}
                        className="text-xs text-teal hover:underline font-semibold flex items-center gap-1"
                      >
                        <ArrowLeft size={12} /> Edit Number
                      </button>
                    </div>

                    <div className="flex justify-between gap-1.5 sm:gap-2">
                      {otpDigits.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpInputRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          disabled={loading}
                          aria-label={`Verification code digit ${i + 1}`}
                          className="w-11 h-12 sm:w-12 sm:h-12 text-center text-lg font-bold font-mono rounded-xl bg-[#0B130F] border border-white/20 text-[#F8FAFC] focus:border-teal focus:ring-2 focus:ring-teal focus:outline-none transition-all caret-teal"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleVerifyPhoneOtp()}
                    disabled={loading || otpDigits.some((d) => !d)}
                    className="w-full py-3.5 rounded-xl bg-teal text-[#080C0A] font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal-light transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal/20 focus:outline-none focus:ring-2 focus:ring-teal"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    Verify &amp; Continue
                  </button>

                  <div className="text-center text-xs text-mist-muted">
                    {cooldown > 0 ? (
                      <span>Resend code in <strong className="text-white">{cooldown}s</strong></span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleSendPhoneOtp(e as any)}
                        className="text-teal hover:underline font-semibold"
                      >
                        Resend Verification Code
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 text-center text-xs text-mist-muted">
            Don&apos;t have an enterprise account?{' '}
            <Link href="/signup" className="text-orchid hover:underline font-bold">
              Create account
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
