import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, EyeOff, UserCheck, Loader2, Mail } from 'lucide-react';

type ForgotMode = 'form' | 'sent';

export default function CounsellorLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMode, setForgotMode] = useState<ForgotMode>('form');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { signInWithEmail, sendPasswordResetEmail, signOut, user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  useEffect(() => {
    if (user && role === 'counsellor') navigate('/counsellor/dashboard', { replace: true });
    if (user && role === 'admin') navigate('/admin/dashboard', { replace: true });
  }, [user, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    const { error, role: loggedRole } = await signInWithEmail(cleanEmail, password);
    setLoading(false);
    if (error) {
      const err = error as any;
      if (err.status === 403) {
        toast.error(err.message || 'Your counsellor account is pending management approval.');
      } else if (err.status === 401) {
        toast.error('Invalid counsellor credentials. Please check your name/email and password.');
      } else if (err.status === 404) {
        toast.error('API service unavailable (404). Please verify backend status.');
      } else if (err.status === 500 || err.status === 503) {
        toast.error('Server or database error. Please try again shortly.');
      } else if (err.message?.includes('Unable to connect') || err.message?.includes('Failed to fetch')) {
        toast.error('Backend unreachable. Please check your network connection.');
      } else {
        toast.error(err.message || 'Login failed.');
      }
      return;
    }
    if (loggedRole && loggedRole !== 'counsellor' && loggedRole !== 'admin') {
      await signOut();
      toast.error('Access denied. Counsellor credentials required.');
      return;
    }
    navigate('/counsellor/dashboard', { replace: true });
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) { toast.error('Please enter your email'); return; }
    setForgotLoading(true);
    await sendPasswordResetEmail(forgotEmail);
    setForgotLoading(false);
    setForgotMode('sent');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF7ED] p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)' }}
        />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white border border-[#FED7AA] p-1.5 shadow-sm flex items-center justify-center">
              <img
                src="/logo/psycare-logo.png"
                alt="PSYCARE Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#172554] mb-1">PSY CARE Counsellor Portal</h1>
          <p className="text-[#64748B] text-sm">Student counselling and follow-up management</p>
        </div>

        <div className="glass-card rounded-2xl p-8 bg-white border border-[#FED7AA] shadow-[0_4px_24px_rgba(245,158,11,0.06)]">
          <div
            className="flex items-center gap-2 mb-6 p-3 rounded-lg border border-[#FED7AA] bg-[#FFEDD5]"
          >
            <UserCheck className="w-4 h-4 shrink-0 text-[#C66A16]" />
            <span className="text-xs font-semibold text-[#9A3412]">Authorised Counsellors Only</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off" autoCapitalize="none" spellCheck={false}>
            <div>
              <Label htmlFor="counsellor-email" className="text-sm font-medium text-[#172554]">Counsellor Name, ID or Email</Label>
              <Input
                id="counsellor-email"
                name="tatti_counsellor_access_identifier"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Enter name, Counsellor ID (e.g. V001) or email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1.5 bg-white border border-[#FED7AA] text-[#172554] focus:border-[#F59E0B] focus:ring-[#F59E0B] transition-colors"
              />
            </div>
            <div>
              <Label htmlFor="counsellor-pw" className="text-sm font-medium text-[#172554]">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="counsellor-pw"
                  type={showPassword ? 'text' : 'password'}
                  name="tatti_counsellor_access_secret"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-white border border-[#FED7AA] text-[#172554] pr-10 focus:border-[#F59E0B] focus:ring-[#F59E0B] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#172554] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link
                to="/forgot-password?role=counsellor"
                className="text-sm font-medium hover:underline text-[#F59E0B] hover:text-[#EA580C] transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold h-11 transition-all duration-150 hover:bg-orange-600 shadow-sm hover:shadow-md cursor-pointer"
              style={{ background: '#0B1F3A', border: 'none' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />}
              Counsellor Sign In
            </Button>
          </form>

          {/* New counsellor? Sign Up option */}
          <div className="mt-6 pt-5 border-t border-[#FED7AA] text-center text-sm text-[#64748B]">
            New counsellor?{' '}
            <Link
              to="/counsellor/signup"
              className="font-semibold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-[#64748B] mt-6">
          <Link to="/login" className="hover:underline text-orange-600 hover:text-orange-700 transition-colors font-medium">
            Student Portal
          </Link>
        </p>
      </div>

      <Dialog open={forgotOpen} onOpenChange={open => { setForgotOpen(open); if (!open) setForgotMode('form'); }}>
        <DialogContent className="sm:max-w-md bg-white border border-[#FED7AA]">
          <DialogHeader>
            <DialogTitle className="text-[#172554]">
              {forgotMode === 'form' ? 'Reset Counsellor Password' : 'Check Your Email'}
            </DialogTitle>
          </DialogHeader>

          {forgotMode === 'form' && (
            <form onSubmit={handleSendReset} className="space-y-4 mt-2">
              <p className="text-[#64748B] text-sm">
                Enter your counsellor email and we'll send you a secure link to reset your password.
              </p>
              <div>
                <Label htmlFor="forgot-counsellor-email" className="text-[#172554]">Counsellor Email</Label>
                <Input
                  id="forgot-counsellor-email"
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="mt-1.5 bg-white border border-[#FED7AA] focus:border-[#F59E0B]"
                />
              </div>
              <Button
                type="submit"
                disabled={forgotLoading}
                className="w-full text-white font-semibold h-10 transition-all duration-150 hover:bg-orange-600 shadow-sm cursor-pointer"
                style={{ background: '#0B1F3A', border: 'none' }}
              >
                {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Reset Link
              </Button>
            </form>
          )}

          {forgotMode === 'sent' && (
            <div className="mt-2 text-center space-y-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-[#FFEDD5] border border-[#FED7AA]"
              >
                <Mail className="w-7 h-7 text-orange-600" />
              </div>
              <div>
                <p className="text-[#64748B] text-sm mb-1">
                  If an account exists for{' '}
                  <span className="text-[#172554] font-medium">{forgotEmail}</span>,
                  a password reset link has been sent.
                </p>
                <p className="text-[#64748B] text-xs">Check your spam folder if you don't see it within a few minutes.</p>
              </div>
              <Button
                variant="outline"
                className="w-full border-[#FED7AA] text-[#172554] hover:border-[#F59E0B] hover:text-orange-600 hover:bg-[#FFEDD5] transition-colors"
                onClick={() => setForgotOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
