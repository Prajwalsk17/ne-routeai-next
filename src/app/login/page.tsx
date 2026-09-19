'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mountain, LogIn, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowLeft, RefreshCw, Zap, UserCheck, Shield } from 'lucide-react';
import { useStore } from '@/lib/store';

type Phase = 'credentials' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useStore(s => s.setUser);
  const [phase, setPhase] = useState<Phase>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpPreview, setOtpPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [redirectTarget, setRedirectTarget] = useState('/dashboard');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Capture 'from' URL parameter safely on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const from = params.get('from');
      if (from) setRedirectTarget(from);
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  function persistAuthAndRedirect(user: any, token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ner_user', JSON.stringify(user));
      localStorage.setItem('ner_token', token);
      document.cookie = `ner_token=${token}; path=/; max-age=86400; SameSite=Lax`;
    }
    setUser(user, token);
    window.location.href = redirectTarget;
  }

  async function handleLogin(e?: React.FormEvent, autoVerify = false) {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password, auto_verify: autoVerify }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed.');
        setLoading(false);
        return;
      }

      if (data.requires_verification === false && data.token) {
        persistAuthAndRedirect(data.user, data.token);
        return;
      }

      if (data.requires_verification) {
        setOtpPreview(data.otp_preview || '');
        setPhase('otp');
        setResendCooldown(30);
        setTimeout(() => otpRefs.current[0]?.focus(), 300);
      }
    } catch {
      setError('Connection error. Please check your network and try again.');
    }
    setLoading(false);
  }

  async function handleVerifyOtp(codeToVerify?: string) {
    const code = (codeToVerify || otp.join('')).trim();
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code, purpose: 'login' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed. Please check the code.');
        setLoading(false);
        return;
      }
      persistAuthAndRedirect(data.user, data.token);
    } catch {
      setError('Connection error during verification.');
      setLoading(false);
    }
  }

  function handleAutoFillOtp(codeStr: string) {
    const digits = codeStr.trim().slice(0, 6).split('');
    const newOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < 6; i++) newOtp[i] = digits[i] || '';
    setOtp(newOtp);
    handleVerifyOtp(codeStr.trim());
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, purpose: 'login' }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpPreview(data.otp_preview || '');
        setOtp(['', '', '', '', '', '']);
        setResendCooldown(30);
        otpRefs.current[0]?.focus();
      } else {
        setError(data.error || 'Resend failed.');
      }
    } catch {
      setError('Connection error.');
    }
    setLoading(false);
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'Enter') {
      const code = otp.join('');
      if (code.length === 6) handleVerifyOtp();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || '';
    setOtp(newOtp);
    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    } else {
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  }

  function fillDemoCredentials(demoEmail: string, demoPw: string) {
    setEmail(demoEmail);
    setPassword(demoPw);
    setError('');
  }

  return (
    <div className="min-h-screen flex bg-forest-900">
      {/* Left — Branding */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:flex flex-1 flex-col justify-center px-16 bg-gradient-to-br from-orchid/[0.08] to-teal/[0.05]"
      >
        <div className="flex items-center gap-4">
          <Mountain className="w-14 h-14 text-orchid" />
          <h1 className="text-3xl font-black text-white">
            NER-Route<span className="text-safe">AI</span>
          </h1>
        </div>
        <p className="text-xl text-mist-dim mt-8 leading-relaxed max-w-md">
          AI-Powered Smart Logistics &amp; Dynamic Hazard Intelligence for Northeast India
        </p>
        <div className="mt-10 space-y-4">
          {[
            { dot: 'bg-safe', text: 'Resilient 2-Factor Authentication with Live Token Sync' },
            { dot: 'bg-orchid', text: 'Real-time hazard detection & advancing alert proximity (<5km)' },
            { dot: 'bg-teal', text: 'Turn-by-turn dynamic road detour recalculation' },
            { dot: 'bg-amber', text: 'Verified emergency safe haven discovery across 8 NER states' },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-3 text-mist-dim text-sm">
              <span className={`w-2 h-2 rounded-full ${f.dot}`} />
              {f.text}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Right — Auth Form */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex items-center justify-center p-6 md:p-10"
      >
        <div className="w-full max-w-md glass-heavy rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl">
          <AnimatePresence mode="wait">
            {/* PHASE 1: Credentials */}
            {phase === 'credentials' && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">Sign In</h2>
                    <p className="text-mist-muted mt-1 text-sm">Access the NER Logistics Command Platform</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-orchid/15 flex items-center justify-center text-orchid">
                    <Shield size={20} />
                  </div>
                </div>

                {/* Demo Quick Fills */}
                <div className="mt-5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <p className="text-[0.7rem] font-bold tracking-wider text-mist-muted uppercase mb-2">
                    ⚡ Quick Demo Accounts
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => fillDemoCredentials('operator@ner-routeai.in', 'operator123')}
                      className="px-2.5 py-1.5 rounded-lg bg-teal/10 hover:bg-teal/20 text-teal border border-teal/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-left truncate"
                    >
                      <UserCheck size={13} /> Operator Demo
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoCredentials('admin@ner-routeai.in', 'admin123')}
                      className="px-2.5 py-1.5 rounded-lg bg-orchid/10 hover:bg-orchid/20 text-orchid-light border border-orchid/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-left truncate"
                    >
                      <Shield size={13} /> Officer Demo
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger-light text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <form onSubmit={e => handleLogin(e, false)} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-sm text-mist-dim mb-1.5 font-medium">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="operator@ner-routeai.in"
                      required
                      className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white placeholder-mist-muted text-sm focus:border-orchid/50 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-mist-dim mb-1.5 font-medium">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white placeholder-mist-muted text-sm focus:border-orchid/50 focus:outline-none transition-colors pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-muted hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-lg bg-gradient-to-r from-orchid to-teal text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orchid/25 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="ai-spinner !w-5 !h-5 !border-2" />
                      ) : (
                        <>
                          <LogIn size={18} /> Sign In with 2FA
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={loading || !email.trim() || !password.trim()}
                      onClick={() => handleLogin(undefined, true)}
                      className="w-full py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-mist-dim hover:text-white border border-white/[0.08] text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                    >
                      <Zap size={14} className="text-amber" /> Direct One-Click Sign In (Bypass OTP)
                    </button>
                  </div>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.08]" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-forest-900 px-4 text-mist-muted text-xs">New to NER-RouteAI?</span>
                  </div>
                </div>

                <Link
                  href="/signup"
                  className="w-full py-3 rounded-lg border border-orchid/30 text-orchid-light font-semibold text-sm flex items-center justify-center gap-2 hover:bg-orchid/[0.08] transition-all"
                >
                  Create an Account
                </Link>

                <button
                  onClick={() => router.push('/')}
                  className="w-full mt-4 text-center text-mist-muted text-xs hover:text-orchid transition-colors"
                >
                  ← Back to landing page
                </button>
              </motion.div>
            )}

            {/* PHASE 2: OTP Verification */}
            {phase === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
              >
                <button
                  onClick={() => {
                    setPhase('credentials');
                    setError('');
                    setOtp(['', '', '', '', '', '']);
                  }}
                  className="flex items-center gap-1 text-mist-muted text-sm hover:text-white transition-colors mb-6"
                >
                  <ArrowLeft size={16} /> Back to Sign In
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-orchid/20 flex items-center justify-center">
                    <ShieldCheck size={24} className="text-orchid" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">Verify Your Identity</h2>
                    <p className="text-mist-muted text-xs">
                      Enter the 6-digit code sent to <span className="text-orchid-light font-medium">{email}</span>
                    </p>
                  </div>
                </div>

                {/* OTP Preview Banner with 1-Click Auto-Fill */}
                {otpPreview && (
                  <div className="mb-5 p-4 rounded-xl bg-safe/[0.08] border border-safe/30 text-center">
                    <p className="text-xs text-safe font-semibold mb-1.5 flex items-center justify-center gap-1.5">
                      📧 <span>Verification Code Delivered</span>
                    </p>
                    <div
                      onClick={() => handleAutoFillOtp(otpPreview)}
                      className="cursor-pointer group hover:bg-safe/[0.12] transition-colors py-2 px-3 rounded-lg border border-dashed border-safe/40"
                      title="Click to automatically fill and verify this code"
                    >
                      <p className="text-3xl font-black font-mono text-safe tracking-[0.45em] group-hover:scale-105 transition-transform">
                        {otpPreview}
                      </p>
                      <p className="text-[0.7rem] text-safe/80 font-medium mt-1">
                        👆 Click anywhere on code to Auto-Fill &amp; Verify
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-4 px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger-light text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                {/* 6-Digit OTP Inputs */}
                <div className="flex gap-2.5 justify-center mb-6" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => {
                        otpRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-14 md:w-12 md:h-14 text-center text-xl font-bold font-mono text-white rounded-lg bg-forest-200/60 border border-white/10 focus:border-orchid/60 focus:outline-none transition-colors"
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full py-3.5 rounded-lg bg-gradient-to-r from-orchid to-teal text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orchid/25 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span className="ai-spinner !w-5 !h-5 !border-2" />
                  ) : (
                    <>
                      <ShieldCheck size={18} /> Verify Code &amp; Launch
                    </>
                  )}
                </button>

                {otpPreview && (
                  <button
                    type="button"
                    onClick={() => handleAutoFillOtp(otpPreview)}
                    disabled={loading}
                    className="w-full mt-2.5 py-2.5 rounded-lg bg-safe/10 hover:bg-safe/20 text-safe border border-safe/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Zap size={14} /> Auto-Fill &amp; Submit ({otpPreview})
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="w-full mt-4 py-2.5 rounded-lg border border-white/[0.08] text-mist-dim text-xs flex items-center justify-center gap-2 hover:bg-white/[0.04] transition-all disabled:opacity-40"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Verification Code'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
