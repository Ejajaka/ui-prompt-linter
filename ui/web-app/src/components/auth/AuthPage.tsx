import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Logo } from '../ui/Logo.tsx';

type Mode = 'login' | 'register' | 'reset';

interface AuthPageProps {
  onBack?: () => void;
}

const HIGHLIGHTS = [
  'Traceable requirements from PDF, DOCX and text',
  'Ambiguity, conflict and dependency detection',
  'Approved, audited acceptance criteria',
  'Six-section design briefs with design tokens',
];

export const AuthPage: React.FC<AuthPageProps> = ({ onBack }) => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else if (mode === 'register') {
        const result = await signUp(email.trim(), password, displayName);
        if (result.needsConfirmation) {
          setNotice('Account created. Check your email to confirm it, then sign in.');
          setMode('login');
          setPassword('');
        }
      } else {
        await resetPassword(email.trim());
        setNotice('Password reset email sent. Check your inbox.');
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#F6F4EC] dark:bg-[#141C1D] px-4 py-8 sm:py-12 flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage:
          'linear-gradient(rgba(73,104,108,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(73,104,108,0.055) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
      }}
    >
      <div className="pointer-events-none absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#49686C]/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 w-[30rem] h-[30rem] rounded-full bg-[#D1B653]/18 blur-3xl" />

      <div className="relative w-full max-w-5xl">
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#49686C] dark:text-[#B9D1D4] hover:text-[#283638] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to overview
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737A72] dark:text-[#8E9A93]">
            Require · Review · Generate
          </span>
        </div>

        <div className="grid lg:grid-cols-[1.05fr_1fr] rounded-3xl overflow-hidden border border-[#E5E2D8] dark:border-[#33403F] shadow-2xl bg-white dark:bg-[#1B2526]">
          {/* Brand / product panel */}
          <aside className="relative hidden lg:flex flex-col justify-between p-9 bg-[#2D5D4F] text-white overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.16]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, #FFFFFF 1px, transparent 0)',
                backgroundSize: '22px 22px',
              }}
            />
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-white/15" />
            <div className="absolute -right-6 -top-6 w-40 h-40 rounded-full border border-white/10" />

            <div className="relative">
              <div className="flex items-center gap-3">
                <Logo size={42} />
                <div>
                  <div className="text-lg font-bold tracking-tight leading-none">Vector</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/60 mt-1">
                    UI/UX Requirement Engineering
                  </div>
                </div>
              </div>

              <h1 className="mt-10 text-[2rem] leading-[1.15] font-extrabold tracking-tight">
                Requirements in.
                <br />
                Interfaces that hold up.
              </h1>
              <p className="mt-3 text-sm text-white/70 leading-relaxed max-w-sm">
                Turn product documents into traceable requirements, reviewed edge cases and a
                build-ready specification — before anyone writes UI code.
              </p>

              <ul className="mt-7 space-y-2.5">
                {HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-white/85">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-white/12 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-[#FAD237]" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Floating product mock */}
            <div className="relative mt-8">
              <div className="rounded-xl bg-white/8 border border-white/15 backdrop-blur-sm p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-white/50 font-bold">
                    Generated brief
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FAD237]/15 text-[#FAD237] border border-[#FAD237]/25">
                    Ready
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 w-3/4 rounded-full bg-white/25" />
                  <div className="h-1.5 w-full rounded-full bg-white/15" />
                  <div className="h-1.5 w-5/6 rounded-full bg-white/15" />
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  {['#49686C', '#D1B653', '#E4EBDD'].map((color) => (
                    <span key={color} className="w-4 h-4 rounded-full border border-white/30" style={{ background: color }} />
                  ))}
                  <span className="text-[9px] text-white/55 font-mono ml-1">tokens injected</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {['REQ-01', 'REQ-02', 'REQ-03'].map((code) => (
                    <span key={code} className="text-[8px] font-mono text-white/70 bg-white/8 border border-white/10 rounded px-1.5 py-1">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Form panel */}
          <section className="p-6 sm:p-9">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <Logo size={38} />
              <div>
                <div className="text-base font-bold text-[#283638] dark:text-[#E7E4D9] leading-none">Vector</div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#737A72] dark:text-[#8E9A93] mt-1">
                  UI/UX Requirement Engineering
                </div>
              </div>
            </div>

            <div className="flex gap-1 p-1 bg-[#F6F4EC] dark:bg-[#141C1D] rounded-xl mb-6">
              {[
                { id: 'login' as Mode, label: 'Sign in' },
                { id: 'register' as Mode, label: 'Create account' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setMode(item.id); setError(''); setNotice(''); }}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    mode === item.id
                      ? 'bg-white dark:bg-[#263335] text-[#283638] dark:text-white shadow-xs'
                      : 'text-[#737A72] dark:text-[#8E9A93] hover:text-[#283638] dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <h2 className="text-xl font-bold text-[#283638] dark:text-[#E7E4D9] tracking-tight">
                {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your workspace' : 'Reset your password'}
              </h2>
              <p className="text-xs text-[#737A72] dark:text-[#8E9A93] mt-1">
                {mode === 'login'
                  ? 'Sign in to continue to your projects and specifications.'
                  : mode === 'register'
                    ? 'Your projects, documents and approvals stay isolated by row-level security.'
                    : 'We will email you a secure link to set a new password.'}
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === 'register' && (
                <label className="block">
                  <span className="text-xs font-bold text-[#283638] dark:text-[#E7E4D9] block mb-1">Name</span>
                  <div className="relative">
                    <UserPlus className="w-4 h-4 text-[#737A72] absolute left-3 top-3" />
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E5E2D8] dark:border-[#33403F] bg-[#FAFAF8] dark:bg-[#141C1D] text-sm text-[#283638] dark:text-[#E7E4D9] focus:bg-white dark:focus:bg-[#1B2526] focus:outline-none focus:border-[#49686C] focus:ring-2 focus:ring-[#49686C]/15"
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span className="text-xs font-bold text-[#283638] dark:text-[#E7E4D9] block mb-1">Email</span>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#737A72] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E5E2D8] dark:border-[#33403F] bg-[#FAFAF8] dark:bg-[#141C1D] text-sm text-[#283638] dark:text-[#E7E4D9] focus:bg-white dark:focus:bg-[#1B2526] focus:outline-none focus:border-[#49686C] focus:ring-2 focus:ring-[#49686C]/15"
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                </div>
              </label>

              {mode !== 'reset' && (
                <label className="block">
                  <span className="text-xs font-bold text-[#283638] dark:text-[#E7E4D9] block mb-1">Password</span>
                  <div className="relative">
                    <LockKeyhole className="w-4 h-4 text-[#737A72] absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-[#E5E2D8] dark:border-[#33403F] bg-[#FAFAF8] dark:bg-[#141C1D] text-sm text-[#283638] dark:text-[#E7E4D9] focus:bg-white dark:focus:bg-[#1B2526] focus:outline-none focus:border-[#49686C] focus:ring-2 focus:ring-[#49686C]/15"
                      placeholder="At least 8 characters"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2.5 top-2.5 p-1 text-[#737A72] hover:text-[#283638] dark:hover:text-white rounded"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>
              )}

              {error && (
                <div role="alert" className="text-xs text-[#B94D42] bg-[#FDF2F0] dark:bg-[#3A2523] border border-[#F0C4BF] dark:border-[#5C3532] rounded-lg p-2.5">
                  {error}
                </div>
              )}
              {notice && (
                <div className="text-xs text-[#3E6B33] bg-[#F4F9F1] dark:bg-[#23301F] border border-[#CFE2C8] dark:border-[#3D5236] rounded-lg p-2.5">
                  {notice}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#49686C] hover:bg-[#30494B] disabled:opacity-60 text-white text-sm font-bold transition-all shadow-sm active:scale-[0.99]"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === 'reset' ? (
                  <KeyRound className="w-4 h-4" />
                ) : mode === 'register' ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMode(mode === 'reset' ? 'login' : 'reset')}
                className="text-[11px] font-semibold text-[#49686C] dark:text-[#9DBEC1] hover:text-[#30494B] dark:hover:text-white"
              >
                {mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}
              </button>
              <span className="text-[10px] text-[#737A72] dark:text-[#8E9A93]">
                Secured by Supabase Auth
              </span>
            </div>

            <p className="mt-6 pt-4 border-t border-[#E5E2D8] dark:border-[#33403F] text-[10px] text-[#737A72] dark:text-[#8E9A93] leading-relaxed">
              Your projects and documents are isolated with row-level security. Vector never asks a
              language model to invent a requirement you did not provide.
            </p>
          </section>
        </div>

        <p className="text-center text-[10px] text-[#737A72] dark:text-[#8E9A93] mt-5">
          Vector · Pre-generation UI review and requirement engineering
        </p>
      </div>
    </div>
  );
};
