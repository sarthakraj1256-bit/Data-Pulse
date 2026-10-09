import React, { useState } from 'react';
import { FlaskConical, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  navigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/app');
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
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
          Sign In to DataPulse
        </h2>
        <p className="mt-2 text-xs text-[#756772]">
          Access your private datasets, quality assessments, and trace audit logs.
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#29212A] mb-1.5">
                Work or Academic Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#756772]" />
                <input
                  type="email"
                  required
                  placeholder="analyst@enterprise.io"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FFF8EF] border border-[#D9A0AE]/50 rounded-xl text-xs text-[#29212A] placeholder-[#756772]/60 focus:outline-none focus:border-[#641B32] focus:ring-1 focus:ring-[#641B32]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#29212A]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-[11px] text-[#641B32] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#756772]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-[#FFF8EF] border border-[#D9A0AE]/50 rounded-xl text-xs text-[#29212A] placeholder-[#756772]/60 focus:outline-none focus:border-[#641B32] focus:ring-1 focus:ring-[#641B32]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#756772] hover:text-[#29212A]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#D9A0AE]/30 text-center text-xs text-[#756772]">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="font-bold text-[#641B32] hover:underline"
            >
              Register here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
