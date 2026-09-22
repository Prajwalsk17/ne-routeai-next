'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mountain,
  UserPlus,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import {
  isFirebaseClientConfigured,
  ensureFirebaseClientConfigured,
  signInWithGoogle,
  signInWithGoogleRedirect,
  handleGoogleRedirectResult,
  signUpWithEmail,
  establishServerSession,
  subscribeToAuthState,
} from '@/lib/auth/firebase-client';
import { extractAuthErrorCode, getReadableAuthError, safeLogAuthError, safeAuthErrorMessage } from '@/lib/auth/auth-errors';
import { GoogleIcon } from '@/components/auth/GoogleIcon';

export default function SignupPage() {
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

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('DISPATCHER');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setSafeError(err: unknown) {
    if (!err) {
      setError(null);
      return;
    }
    setError(safeAuthErrorMessage(err));
  }

  const [isConfigured, setIsConfigured] = useState(() => isFirebaseClientConfigured());

  useEffect(() => {
    ensureFirebaseClientConfigured().then((configured) => {
      setIsConfigured(configured);
    });

    handleGoogleRedirectResult()
      .then(async (result) => {
        if (result?.idToken) {
          setLoading(true);
          const sessionRes = await establishServerSession(result.idToken, {
            name: result.user.displayName || undefined,
            role: 'DISPATCHER',
          });
          if (sessionRes.success) {
            handleAuthSuccess(sessionRes.user, sessionRes.token!);
          } else {
            setSafeError(sessionRes.error || 'Failed to authenticate Google account.');
            setLoading(false);
          }
        }
      })
      .catch((err) => {
        safeLogAuthError('GoogleSignUpRedirect', err);
        const readable = getReadableAuthError(err, 'google');
        const errCode = extractAuthErrorCode(err);
        setSafeError(process.env.NODE_ENV !== 'production' && errCode ? `[${errCode}] ${readable}` : readable);
      });
  }, []);

  const passwordStrength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strength = passwordStrength(password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-danger', 'bg-amber', 'bg-info', 'bg-safe'][strength];

  function handleAuthSuccess(user: any, token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ner_user', JSON.stringify(user));
      localStorage.setItem('ner_token', token);
      document.cookie = `ner_session=${token}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `ner_token=${token}; path=/; max-age=86400; SameSite=Lax`;
    }
    setUser(user, token);
    router.push('/dispatch');
  }

  async function handleGoogleSignUp() {
    setError(null);
    setLoading(true);
    try {
      const { idToken, user } = await signInWithGoogle();
      const sessionRes = await establishServerSession(idToken, {
        name: user.displayName || name || undefined,
        role,
      });
      if (!sessionRes.success) {
        setSafeError(sessionRes.error || 'Failed to authenticate Google account.');
        setLoading(false);
        return;
      }
      handleAuthSuccess(sessionRes.user, sessionRes.token!);
    } catch (err: unknown) {
      safeLogAuthError('GoogleSignUp', err);
      if (process.env.NODE_ENV !== 'production' && typeof err === 'object' && err !== null) {
        const fbErr = err as { code?: string; message?: string; customData?: unknown };
        console.error('[GoogleSignUp Firebase Diagnostic]', {
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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setSafeError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setSafeError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setSafeError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setSafeError(null);

    try {
      const { idToken } = await signUpWithEmail(email, password);
      const sessionRes = await establishServerSession(idToken, {
        name: name.trim(),
        role,
      });
      if (!sessionRes.success) {
        setSafeError(sessionRes.error || 'Failed to establish verified session.');
        setLoading(false);
        return;
      }
      handleAuthSuccess(sessionRes.user, sessionRes.token!);
    } catch (err: unknown) {
      safeLogAuthError('EmailSignUp', err);
      setSafeError(getReadableAuthError(err, 'email'));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#080C0A] text-white">
      {/* Left Column: Branding */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:flex flex-1 flex-col justify-center px-16 bg-gradient-to-br from-orchid/[0.08] via-transparent to-teal/[0.05] border-r border-white/5"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal/15 border border-teal/30 flex items-center justify-center text-teal shadow-lg shadow-teal/10">
            <Mountain className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            NER-Route<span className="text-teal">AI</span>
          </h1>
        </div>

        <p className="text-xl text-mist-dim mt-8 leading-relaxed max-w-md font-medium">
          Enterprise Smart Logistics, Dispatch, and Dynamic Risk Platform for Northeast India
        </p>

        <div className="mt-10 space-y-4 max-w-md">
          {[
            { dot: 'bg-safe', title: 'Official Agency Verification', text: 'Government and relief enterprise registration for Northeast corridors' },
            { dot: 'bg-orchid', title: 'Spatial Tenant Isolation', text: 'PostgreSQL + PostGIS multi-tenant partition across 8 NER states' },
            { dot: 'bg-teal', title: 'Cryptographic Token Security', text: 'Firebase RS256 authentication with Google JWKS signature validation' },
            { dot: 'bg-amber', title: 'Disaster Coordination Hub', text: 'Unified cross-agency hazard triage and real-time fleet synchronization' },
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
      </motion.div>

      {/* Right Column: Registration Form */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex items-center justify-center p-6 md:p-10"
      >
        <div className="w-full max-w-lg bg-[#111A14] backdrop-blur-2xl rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl shadow-black/80">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Register Organization</h2>
              <p className="text-mist-muted mt-1 text-xs">Join the Northeast Logistics Network</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal/15 border border-teal/20 flex items-center justify-center text-teal">
              <UserPlus size={20} />
            </div>
          </div>

          {!isConfigured && (
            <div className="mb-6 p-4 rounded-xl bg-amber/10 border border-amber/30 text-amber-light text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-amber">
                <AlertTriangle size={16} /> Firebase Not Configured
              </div>
              <p className="text-mist-dim leading-relaxed">
                Client environment variables for Firebase are not loaded. Set <code className="text-white bg-black/40 px-1 py-0.5 rounded">NEXT_PUBLIC_FIREBASE_API_KEY</code> and <code className="text-white bg-black/40 px-1 py-0.5 rounded">NEXT_PUBLIC_FIREBASE_PROJECT_ID</code>.
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

          {/* Google Sign-Up */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading || !isConfigured}
            aria-label="Continue with Google"
            className="w-full py-3 px-4 rounded-xl bg-[#0B130F] hover:bg-[#14221B] border border-white/20 hover:border-teal/50 text-[#F8FAFC] font-semibold text-sm flex items-center justify-center gap-3 transition-all mb-6 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal active:scale-[0.99]"
          >
            <GoogleIcon className="w-5 h-5 shrink-0" />
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-white/10" />
            <span className="px-3 text-[0.7rem] text-mist-muted font-bold uppercase tracking-wider">or register with email</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-mist mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Hemanta Sarma"
                required
                autoComplete="name"
                disabled={loading || !isConfigured}
                className="w-full px-4 py-3 rounded-xl bg-[#0B130F] border border-white/20 text-[#F8FAFC] placeholder:text-mist-muted text-sm font-medium focus:border-teal focus:ring-2 focus:ring-teal focus:outline-none transition-colors caret-teal disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-mist mb-1.5">Official Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@assam.gov.in"
                required
                autoComplete="email"
                disabled={loading || !isConfigured}
                className="w-full px-4 py-3 rounded-xl bg-[#0B130F] border border-white/20 text-[#F8FAFC] placeholder:text-mist-muted text-sm font-medium focus:border-teal focus:ring-2 focus:ring-teal focus:outline-none transition-colors caret-teal disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-mist mb-1.5">Operational Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading || !isConfigured}
                className="w-full px-4 py-3 rounded-xl bg-[#0B130F] border border-white/20 text-[#F8FAFC] text-sm font-medium focus:border-teal focus:ring-2 focus:ring-teal focus:outline-none transition-colors disabled:opacity-50"
              >
                <option value="DISPATCHER">Operations Dispatcher (Live Convoy &amp; Routing)</option>
                <option value="LOGISTICS_MANAGER">Logistics Manager (Fleet &amp; Analytics)</option>
                <option value="DRIVER">Field Driver (Mobile Navigation &amp; Transit)</option>
                <option value="ORG_ADMIN">Organization Administrator (Personnel &amp; Facilities)</option>
                <option value="VIEWER">Read-Only Viewer (Auditing &amp; Monitoring)</option>
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-mist mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="new-password"
                    disabled={loading || !isConfigured}
                    className="w-full px-4 py-3 rounded-xl bg-[#0B130F] border border-white/20 text-[#F8FAFC] placeholder:text-mist-muted text-sm font-medium focus:border-teal focus:ring-2 focus:ring-teal focus:outline-none transition-colors pr-12 caret-teal disabled:opacity-50"
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

              <div>
                <label className="block text-xs font-bold text-mist mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="new-password"
                    disabled={loading || !isConfigured}
                    className="w-full px-4 py-3 rounded-xl bg-[#0B130F] border border-white/20 text-[#F8FAFC] placeholder:text-mist-muted text-sm font-medium focus:border-teal focus:ring-2 focus:ring-teal focus:outline-none transition-colors pr-12 caret-teal disabled:opacity-50"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-mist-dim hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {password && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[#0B130F] rounded-full overflow-hidden flex gap-1 border border-white/10">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 h-full rounded-full transition-colors ${
                        i <= strength ? strengthColor : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[0.7rem] text-mist-muted font-bold">{strengthLabel}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isConfigured}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal to-orchid hover:opacity-95 text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-teal/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 focus:outline-none focus:ring-2 focus:ring-teal"
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <UserPlus size={18} />}
              Create Enterprise Account
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-mist-muted">
            Already registered?{' '}
            <Link href="/login" className="text-teal hover:underline font-bold">
              Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
