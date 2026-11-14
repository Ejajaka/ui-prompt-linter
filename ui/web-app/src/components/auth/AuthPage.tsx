import React, { useState } from 'react';
import { ArrowRight, KeyRound, Loader2, LockKeyhole, Mail, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

type Mode = 'login' | 'register' | 'reset';

export const AuthPage: React.FC = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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
    <div className="min-h-screen bg-[#F6F4EC] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#2D5D4F] text-white mx-auto flex items-center justify-center shadow-sm">
            <span className="text-xl font-black tracking-tight">V</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-[#283638] tracking-tight">Vector</h1>
          <p className="text-xs text-[#737A72] mt-1">Intelligent UI requirement engineering</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-2xl shadow-xs p-6">
          <div className="flex gap-1 p-1 bg-[#F6F4EC] rounded-lg mb-5">
            {[
              { id: 'login' as Mode, label: 'Sign in' },
              { id: 'register' as Mode, label: 'Register' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setMode(item.id); setError(''); setNotice(''); }}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-colors ${
                  mode === item.id ? 'bg-white text-[#283638] shadow-xs' : 'text-[#737A72] hover:text-[#283638]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <label className="block">
                <span className="text-xs font-bold text-[#283638] block mb-1">Name</span>
                <div className="relative">
                  <UserPlus className="w-4 h-4 text-[#737A72] absolute left-3 top-3" />
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-sm text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]"
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="text-xs font-bold text-[#283638] block mb-1">Email</span>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#737A72] absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-sm text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]"
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </div>
            </label>

            {mode !== 'reset' && (
              <label className="block">
                <span className="text-xs font-bold text-[#283638] block mb-1">Password</span>
                <div className="relative">
                  <LockKeyhole className="w-4 h-4 text-[#737A72] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-sm text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]"
                    placeholder="At least 8 characters"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                </div>
              </label>
            )}

            {error && <div className="text-xs text-[#B94D42] bg-[#FDF2F0] border border-[#F0C4BF] rounded-lg p-2.5">{error}</div>}
            {notice && <div className="text-xs text-[#3E6B33] bg-[#F4F9F1] border border-[#CFE2C8] rounded-lg p-2.5">{notice}</div>}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#49686C] hover:bg-[#30494B] disabled:opacity-60 text-white text-sm font-bold transition-colors"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'reset' ? <KeyRound className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'reset' ? 'login' : 'reset')}
              className="text-[11px] font-semibold text-[#49686C] hover:text-[#30494B]"
            >
              {mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#737A72] mt-4">
          Protected by Supabase Auth. Your projects and documents are isolated with Row Level Security.
        </p>
      </div>
    </div>
  );
};
