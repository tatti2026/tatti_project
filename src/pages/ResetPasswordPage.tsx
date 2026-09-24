import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, CheckCircle2, Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { updatePassword, user } = useAuth();
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) {
        throw error;
      }

      setSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while resetting your password.');
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F5F7FA]">
      {/* Left corporate branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] xl:w-[42%] relative overflow-hidden p-10 bg-[#0B1F3A] text-white">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-[#1D4ED8] rounded-xl flex items-center justify-center shadow-md">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-tight tracking-wide">TATTI</h1>
              <p className="text-slate-400 text-xs leading-tight">Tamil Nadu Advanced Technical Training Institute</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-400/25 rounded-full px-3.5 py-1 mb-6">
            <Lock className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-blue-200 text-xs font-medium">Account Security</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">Reset Your<br />Password</h2>
          <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
            Create a strong, unique password to protect your student portal account and personal information.
          </p>
        </div>

        <div className="relative z-10 bg-slate-800/70 rounded-xl p-4 border border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1D4ED8]/25 rounded-lg flex items-center justify-center">
              <Lock className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Security Tip</p>
              <p className="text-slate-400 text-[10px]">Use at least 6 characters with letters and numbers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form card */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-[#F5F7FA]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] flex items-center justify-center shadow-sm">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-[#172033]">TATTI</p>
              <p className="text-xs text-[#667085]">Student Portal</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 md:p-8 animate-fade-in shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)] border border-[#E4E7EC]">
            {success ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#172033]">Password Reset Complete!</h3>
                  <p className="text-sm text-[#667085] mt-2">
                    Your password has been securely updated. Redirecting you to the sign-in page...
                  </p>
                </div>
                <div className="pt-2">
                  <Button asChild className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] border-0 text-white font-semibold h-11 rounded-lg shadow-sm">
                    <Link to="/login">Sign In Now</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Set New Password</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Please enter and confirm your new password below.
                </p>

                {errorMsg && (
                  <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleReset} className="space-y-4" autoComplete="off">
                  <div>
                    <Label htmlFor="new-pw" className="text-sm font-medium">New Password</Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="new-pw"
                        name="tatti_new_password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        placeholder="Min 6 characters"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="bg-input border-border pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirm-pw" className="text-sm font-medium">Confirm New Password</Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="confirm-pw"
                        name="tatti_confirm_new_password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="bg-input border-border pr-10"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] border-0 text-white font-semibold h-11 rounded-lg shadow-sm mt-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating Password...
                      </span>
                    ) : (
                      'Update Password'
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <Link
                      to="/login"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
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
