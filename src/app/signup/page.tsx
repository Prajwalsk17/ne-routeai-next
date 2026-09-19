'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mountain, UserPlus, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

type Phase = 'form' | 'otp';

export default function SignupPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('operator');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpPreview, setOtpPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirmPassword) { setError('All fields are required.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, name: name.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Signup failed.'); setLoading(false); return; }
      if (data.requires_verification) {
        setOtpPreview(data.otp_preview || '');
        setPhase('otp');
        setResendCooldown(30);
        setTimeout(() => otpRefs.current[0]?.focus(), 300);
      }
    } catch { setError('Connection error.'); }
    setLoading(false);
  }

  function persistAuthAndRedirect(user: any, token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ner_user', JSON.stringify(user));
      localStorage.setItem('ner_token', token);
      document.cookie = `ner_token=${token}; path=/; max-age=86400; SameSite=Lax`;
    }
    window.location.href = '/dashboard';
  }

  async function handleVerifyOtp(codeToVerify?: string) {
    const code = (codeToVerify || otp.join('')).trim();
    if (code.length !== 6) { setError('Enter the complete 6-digit code.'); return; }
    setLoading(true); setError('');
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code, purpose: 'signup' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Verification failed.'); setLoading(false); return; }
      persistAuthAndRedirect(data.user, data.token);
    } catch { setError('Connection error.'); }
    setLoading(false);
  }

  function handleAutoFillOtp(codeStr: string) {
    const digits = codeStr.trim().slice(0, 6).split('');
    const n = ['', '', '', '', '', ''];
    for (let i = 0; i < digits.length; i++) n[i] = digits[i] || '';
    setOtp(n);
    handleVerifyOtp(codeStr.trim());
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setLoading(true); setError('');
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, purpose: 'signup' }),
      });
      const data = await res.json();
      if (res.ok) { setOtpPreview(data.otp_preview || ''); setOtp(['','','','','','']); setResendCooldown(30); otpRefs.current[0]?.focus(); }
      else { setError(data.error || 'Resend failed.'); }
    } catch { setError('Connection error.'); }
    setLoading(false);
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const n = [...otp]; n[index] = value.slice(-1); setOtp(n);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }
  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'Enter' && otp.join('').length === 6) handleVerifyOtp();
  }
  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!p) return;
    const n = [...otp]; for (let i = 0; i < 6; i++) n[i] = p[i] || ''; setOtp(n);
    if (p.length === 6) {
      handleVerifyOtp(p);
    } else {
      otpRefs.current[Math.min(p.length, 5)]?.focus();
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left */}
      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="hidden lg:flex flex-1 flex-col justify-center px-16 bg-gradient-to-br from-teal/[0.08] to-orchid/[0.05]">
        <div className="flex items-center gap-4">
          <Mountain className="w-14 h-14 text-orchid" />
          <h1 className="text-3xl font-black text-white">NER-Route<span className="text-safe">AI</span></h1>
        </div>
        <p className="text-xl text-mist-dim mt-8 leading-relaxed max-w-md">Join the platform powering smart logistics across Northeast India</p>
        <div className="mt-10 space-y-5">
          {[
            { icon: '🔒', text: 'Secure two-factor verification' },
            { icon: '📊', text: 'Access 6 AI-powered analysis engines' },
            { icon: '🗺️', text: 'Real-time route optimization' },
            { icon: '⚡', text: 'Instant emergency dispatch' },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-3 text-mist-dim text-sm">
              <span className="text-lg">{f.icon}</span>{f.text}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Right */}
      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md glass-heavy rounded-3xl p-10">
          <AnimatePresence mode="wait">
            {phase === 'form' && (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-extrabold text-white">Create Account</h2>
                <p className="text-mist-muted mt-2 text-sm">Register to access the command center</p>

                {error && <div className="mt-4 px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger-light text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}

                <form onSubmit={handleSignup} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm text-mist-dim mb-2 font-medium">Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" required
                      className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white placeholder-mist-muted text-sm focus:border-teal/50 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm text-mist-dim mb-2 font-medium">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your.email@domain.com" required
                      className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white placeholder-mist-muted text-sm focus:border-teal/50 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm text-mist-dim mb-2 font-medium">Role</label>
                    <select value={role} onChange={e => setRole(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-teal/50 focus:outline-none">
                      <option value="operator">Logistics Operator</option>
                      <option value="officer">Government Officer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-mist-dim mb-2 font-medium">Password</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required
                        className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white placeholder-mist-muted text-sm focus:border-teal/50 focus:outline-none transition-colors pr-12" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-muted hover:text-white transition-colors">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {password && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex gap-1 flex-1">{[1,2,3,4].map(i => <div key={i} className={`h-1 flex-1 rounded ${i <= strength ? strengthColor : 'bg-white/10'}`} />)}</div>
                        <span className={`text-xs ${strength >= 3 ? 'text-safe' : strength >= 2 ? 'text-amber' : 'text-danger'}`}>{strengthLabel}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-mist-dim mb-2 font-medium">Confirm Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required
                      className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white placeholder-mist-muted text-sm focus:border-teal/50 focus:outline-none transition-colors" />
                    {confirmPassword && password !== confirmPassword && <p className="text-xs text-danger mt-1">Passwords do not match</p>}
                    {confirmPassword && password === confirmPassword && <p className="text-xs text-safe mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Passwords match</p>}
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 rounded-lg bg-gradient-to-r from-teal to-orchid text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-teal/25 transition-all disabled:opacity-50">
                    {loading ? <span className="ai-spinner !w-5 !h-5 !border-2" /> : <><UserPlus size={18} /> Create Account</>}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <span className="text-mist-muted text-sm">Already have an account? </span>
                  <Link href="/login" className="text-orchid-light text-sm font-semibold hover:text-orchid transition-colors">Sign In</Link>
                </div>
              </motion.div>
            )}

            {/* OTP Phase */}
            {phase === 'otp' && (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <button onClick={() => { setPhase('form'); setError(''); setOtp(['','','','','','']); }}
                  className="flex items-center gap-1 text-mist-muted text-sm hover:text-white transition-colors mb-6"><ArrowLeft size={16} /> Back</button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-teal/20 flex items-center justify-center"><ShieldCheck size={24} className="text-teal" /></div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">Verify Your Email</h2>
                    <p className="text-mist-muted text-sm">Code sent to <span className="text-teal font-medium">{email}</span></p>
                  </div>
                </div>

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

                {error && <div className="mb-4 px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger-light text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}

                <div className="flex gap-3 justify-center mb-6" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={el => { otpRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1}
                      value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold font-mono text-white rounded-lg bg-forest-200/60 border border-white/10 focus:border-teal/50 focus:outline-none transition-colors" />
                  ))}
                </div>

                <button onClick={() => handleVerifyOtp()} disabled={loading || otp.join('').length !== 6}
                  className="w-full py-3.5 rounded-lg bg-gradient-to-r from-teal to-orchid text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50">
                  {loading ? <span className="ai-spinner !w-5 !h-5 !border-2" /> : <><ShieldCheck size={18} /> Verify &amp; Continue</>}
                </button>

                <button onClick={handleResend} disabled={resendCooldown > 0 || loading}
                  className="w-full mt-4 py-2.5 rounded-lg border border-white/[0.08] text-mist-dim text-sm flex items-center justify-center gap-2 hover:bg-white/[0.04] transition-all disabled:opacity-40">
                  <RefreshCw size={14} /> {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
