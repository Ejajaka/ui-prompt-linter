import React, { useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const ResetPasswordPage: React.FC = () => {
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    setError('');
    try {
      await updatePassword(password);
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Could not update password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4EC] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E5E2D8] rounded-2xl shadow-xs p-6">
        <div className="w-11 h-11 rounded-xl bg-[#2D5D4F] text-white flex items-center justify-center mb-4">
          <KeyRound className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold text-[#283638] tracking-tight">Choose a new password</h1>
        <p className="text-xs text-[#737A72] mt-1 mb-5">Your reset link signed you in securely. Set a new password to continue.</p>

        {done ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-[#CFE2C8] bg-[#F4F9F1] p-3 text-xs text-[#3E6B33]">
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
              Password updated. You can continue using Vector.
            </div>
            <button
              type="button"
              onClick={() => { void signOut(); }}
              className="w-full px-4 py-2.5 rounded-lg bg-[#49686C] hover:bg-[#30494B] text-white text-xs font-bold"
            >
              Sign in with the new password
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-bold text-[#283638] block mb-1">New password</span>
              <div className="relative">
                <LockKeyhole className="w-4 h-4 text-[#737A72] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-sm text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]"
                  autoComplete="new-password"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[#283638] block mb-1">Confirm password</span>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-sm text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]"
                autoComplete="new-password"
              />
            </label>
            {error && <div className="text-xs text-[#B94D42] bg-[#FDF2F0] border border-[#F0C4BF] rounded-lg p-2.5">{error}</div>}
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#49686C] hover:bg-[#30494B] disabled:opacity-60 text-white text-xs font-bold"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Update password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
