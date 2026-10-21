import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, CheckCircle2, Lock, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || (
  import.meta.env.PROD
    ? 'https://tattiproject-production-506b.up.railway.app/api'
    : 'http://localhost:5000/api'
);

/** Map role → correct login path */
function getLoginPath(role: string | null): string {
  if (role === 'counsellor') return '/counsellor/login';
  return '/login';
}

type TokenState = 'verifying' | 'valid' | 'invalid';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const userId = searchParams.get('userId');

  // Token verification state
  const [tokenState, setTokenState] = useState<TokenState>('verifying');
  const [tokenError, setTokenError] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  // Verify token validity on component mount
  useEffect(() => {
    if (!token || !userId) {
      setTokenState('invalid');
      setTokenError('This password reset link is invalid or incomplete. Please request a new one from the login page.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/auth/verify-reset-token?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userId)}`
        );
        const data = await res.json();
        if (data.valid) {
          setUserRole(data.role || null);
          setTokenState('valid');
        } else {
          setTokenState('invalid');
          setTokenError(
            data.error || 'This password reset link is invalid or has expired. Please request a new one.'
          );
        }
      } catch {
        // Network errors – let the user try anyway (the backend will re-validate on submit)
        setTokenState('valid');
      }
    };

    verifyToken();
  }, [token, userId]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!token || !userId) {
      setErrorMsg('Invalid password reset link. Please request a new one.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      // Use role from reset response (most authoritative) or already-verified role
      const resolvedRole = data.role || userRole;
      setUserRole(resolvedRole);
      setSuccess(true);
      toast.success('Password updated successfully!');

      // Redirect to the correct login page after 2.5 s
      setTimeout(() => {
        navigate(getLoginPath(resolvedRole), { replace: true });
      }, 2500);
    } catch (err: any) {
      const msg = err.message || 'An error occurred. Please try again.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loginPath = getLoginPath(userRole);

  return (
    <div className="min-h-screen flex bg-[#FFF7ED]">
      {/* ── Left corporate branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] xl:w-[42%] relative overflow-hidden p-10 bg-[#0B1F3A] text-white">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Glow blobs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(29,78,216,0.18) 0%, transparent 70%)' }} />
        <div className="absolute bottom-12 -right-20 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)' }} />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-1 flex items-center justify-center shadow-sm shrink-0">
            <img src="/logo/psycare-logo.png" alt="PSYCARE Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-tight tracking-wide">PSY CARE</h1>
            <p className="text-slate-400 text-xs leading-tight">Mental Well-being Portal</p>
          </div>
        </div>

        {/* Center copy */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-400/25 rounded-full px-3.5 py-1 mb-6 w-fit">
            <Lock className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-blue-200 text-xs font-medium">Account Security</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Reset Your<br />Password
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
            Create a strong, unique password to protect your PSY CARE account and personal information.
          </p>
        </div>

        {/* Security tip */}
        <div className="relative z-10 bg-slate-800/70 rounded-xl p-4 border border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1D4ED8]/25 rounded-lg flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Security Tip</p>
              <p className="text-slate-400 text-[10px]">Use at least 6 characters with a mix of letters, numbers and symbols</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-[#FFF7ED]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <img src="/logo/psycare-logo.png" alt="PSYCARE Logo" className="w-10 h-10 object-contain shrink-0" />
            <div>
              <p className="font-bold text-[#172554] text-base leading-tight">PSY CARE</p>
              <p className="text-xs text-[#64748B] leading-tight">Mental Well-being Portal</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 md:p-8 animate-fade-in shadow-[0_1px_3px_rgba(245,158,11,0.06),0_1px_2px_rgba(245,158,11,0.04)] border border-[#FED7AA]">

            {/* ── Verifying state ── */}
            {tokenState === 'verifying' && (
              <div className="text-center py-10 space-y-4">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto border border-blue-100">
                  <Loader2 className="w-7 h-7 text-[#1D4ED8] animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#172033]">Verifying Reset Link…</h3>
                  <p className="text-sm text-[#667085] mt-1">Please wait while we validate your link.</p>
                </div>
              </div>
            )}

            {/* ── Success state ── */}
            {success && (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#172033]">Password Reset Complete!</h3>
                  <p className="text-sm text-[#667085] mt-2">
                    Your password has been securely updated. Redirecting you to the sign-in page…
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    asChild
                    className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] border-0 text-white font-semibold h-11 rounded-lg shadow-sm"
                  >
                    <Link to={loginPath}>Sign In Now</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* ── Invalid token state ── */}
            {!success && tokenState === 'invalid' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-200">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#172033]">Invalid or Expired Link</h3>
                  <p className="text-sm text-[#667085] mt-2">{tokenError}</p>
                </div>
                <div className="pt-2 space-y-2">
                  <Button
                    asChild
                    className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] border-0 text-white font-semibold h-11 rounded-lg shadow-sm"
                  >
                    <Link to={`/forgot-password${userRole ? `?role=${userRole}` : ''}`}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Request New Reset Link
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full text-[#667085] hover:text-[#172554] hover:bg-orange-50"
                  >
                    <Link to={loginPath}>Back to Sign In</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* ── Valid token – show password form ── */}
            {!success && tokenState === 'valid' && (
              <div>
                <h2 className="text-2xl font-bold text-[#172554] mb-1">Set New Password</h2>
                <p className="text-[#667085] text-sm mb-6">
                  Please enter and confirm your new password below.
                </p>

                {errorMsg && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleReset} className="space-y-4" autoComplete="off">
                  {/* New password */}
                  <div>
                    <Label htmlFor="new-pw" className="text-sm font-medium text-[#172554]">
                      New Password
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="new-pw"
                        name="tatti_new_password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="bg-white border-[#FED7AA] hover:border-orange-400 focus:border-orange-500 focus:ring-orange-500 pr-10 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#172554] transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Strength indicator */}
                    {password.length > 0 && (
                      <div className="mt-1.5 flex gap-1">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              password.length >= 12
                                ? 'bg-emerald-400'
                                : password.length >= 8
                                ? i < 3 ? 'bg-amber-400' : 'bg-[#E2E8F0]'
                                : i < 2 ? 'bg-orange-400' : 'bg-[#E2E8F0]'
                            }`}
                          />
                        ))}
                        <span className="text-[10px] text-[#64748B] ml-1 whitespace-nowrap">
                          {password.length >= 12 ? 'Strong' : password.length >= 8 ? 'Good' : 'Weak'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <Label htmlFor="confirm-pw" className="text-sm font-medium text-[#172554]">
                      Confirm New Password
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="confirm-pw"
                        name="tatti_confirm_new_password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className={`bg-white border-[#FED7AA] hover:border-orange-400 focus:border-orange-500 focus:ring-orange-500 pr-10 transition-colors ${
                          confirmPassword.length > 0 && confirmPassword !== password
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                            : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#172554] transition-colors"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Match feedback */}
                    {confirmPassword.length > 0 && (
                      <p className={`text-[11px] mt-1 ${confirmPassword === password ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {confirmPassword === password ? '✓ Passwords match' : '✗ Passwords do not match'}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#1D4ED8] hover:bg-orange-600 border-0 text-white font-semibold h-11 rounded-lg shadow-sm transition-all duration-150 mt-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating Password…
                      </span>
                    ) : (
                      'Update Password'
                    )}
                  </Button>

                  <div className="text-center pt-1">
                    <Link
                      to={loginPath}
                      className="text-xs text-[#64748B] hover:text-orange-600 transition-colors"
                    >
                      Back to Sign In
                    </Link>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
