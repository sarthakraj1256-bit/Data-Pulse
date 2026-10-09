import React, { useState } from 'react';
import { FlaskConical, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthService } from '../services/auth';

interface ForgotPasswordPageProps {
  navigate: (path: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ navigate }) => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await AuthService.resetPassword(email, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Password reset failed. Ensure the email is registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8EF] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2.5 cursor-pointer mb-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#641B32] flex items-center justify-center text-[#FFF8EF] shadow-md">
            <FlaskConical className="w-6 h-6" />
          </div>
        </div>
        <h2 className="font-serif text-3xl font-extrabold text-[#3D1023] tracking-tight">
          Reset Password
        </h2>
        <p className="mt-2 text-xs text-[#756772]">
          Enter your registered email and choose a new secure password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#F8EFE5] border border-[#D9A0AE]/40 py-8 px-6 sm:px-10 rounded-3xl shadow-lg">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-[#B4233D]/10 border border-[#B4233D]/30 flex items-start gap-3 text-xs text-[#B4233D]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#277A58]/10 text-[#277A58] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-[#29212A]">Password Reset Successfully</h3>
              <p className="text-xs text-[#756772]">
                Your credentials have been securely updated. You can now sign in with your new password.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-all"
              >
                Return to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#29212A] mb-1.5">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#756772]" />
                  <input
                    type="email"
                    required
                    placeholder="analyst@enterprise.io"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FFF8EF] border border-[#D9A0AE]/50 rounded-xl text-xs text-[#29212A] placeholder-[#756772]/60 focus:outline-none focus:border-[#641B32]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#29212A] mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#756772]" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FFF8EF] border border-[#D9A0AE]/50 rounded-xl text-xs text-[#29212A] placeholder-[#756772]/60 focus:outline-none focus:border-[#641B32]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 mt-2"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-[#D9A0AE]/30 text-center text-xs text-[#756772]">
            Remember your credentials?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-bold text-[#641B32] hover:underline"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
