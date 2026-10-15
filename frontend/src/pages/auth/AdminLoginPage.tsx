import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, Shield, Loader2, Mail } from 'lucide-react';

type ForgotMode = 'form' | 'sent';

export default function AdminLoginPage() {
  // Guaranteed clean initial state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password dialog state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMode, setForgotMode] = useState<ForgotMode>('form');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { signInWithEmail, sendPasswordResetEmail, user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role === 'admin') navigate('/admin/dashboard', { replace: true });
    if (user && role === 'counsellor') navigate('/counsellor/dashboard', { replace: true });
  }, [user, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    const { error } = await signInWithEmail(cleanEmail, password);
    setLoading(false);
    if (error) toast.error('Invalid admin credentials. Please check your email and password.');
    else {
      // Role check after login — role updates asynchronously
      setTimeout(() => {
        if (role && role !== 'admin') {
          toast.error('Access denied. Admin credentials required.');
        }
      }, 1000);
    }
  };

  const handleForgotOpen = () => {
    setForgotEmail('');
    setForgotMode('form');
    setForgotOpen(true);
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) { toast.error('Please enter your email'); return; }
    setForgotLoading(true);
    await sendPasswordResetEmail(forgotEmail.trim());
    setForgotLoading(false);
    // Always show confirmation — never reveal if the account exists
    setForgotMode('sent');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7ED]">
      <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0B1F3A] mb-4 shadow-md">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#172554] mb-1 tracking-tight">PSY CARE Admin Portal</h1>
          <p className="text-[#64748B] text-sm">Administrative Management & Student Operations</p>
        </div>

        <div className="bg-white border border-[#FED7AA] rounded-2xl p-8 shadow-[0_1px_3px_rgba(245,158,11,0.06),0_1px_2px_rgba(245,158,11,0.04)]">
          <div className="flex items-center gap-2 mb-6 p-3 bg-[#FFE0B2]/40 hover:bg-[#FFE0B2]/70 hover:border-orange-300 rounded-lg border border-[#FED7AA] transition-all duration-150 group cursor-pointer">
            <Shield className="w-4 h-4 text-[#9A3412] group-hover:text-orange-700 shrink-0 transition-colors" />
            <span className="text-xs text-[#9A3412] group-hover:text-orange-700 font-medium transition-colors">Authorized Administrative Personnel Only</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off" autoCapitalize="none" spellCheck={false}>
            <div>
              <Label htmlFor="admin-email" className="text-sm font-medium text-[#172554]">Admin Email</Label>
              <Input
                id="admin-email"
                name="tatti_admin_access_identifier"
                type="email"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                placeholder="admin@tatti.edu.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1.5 bg-white border-[#FED7AA] hover:border-orange-400 focus:border-orange-500 focus:ring-orange-500 h-11 transition-colors"
              />
            </div>
            <div>
              <Label htmlFor="admin-pw" className="text-sm font-medium text-[#172554]">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="admin-pw"
                  name="tatti_admin_access_secret"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-white border-[#FED7AA] hover:border-orange-400 focus:border-orange-500 focus:ring-orange-500 pr-10 h-11 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotOpen}
                className="text-sm text-[#9A3412] font-medium hover:text-orange-600 hover:underline transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[#1D4ED8] hover:bg-orange-600 text-white font-semibold h-11 rounded-lg shadow-sm transition-all duration-150">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
              Admin Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#64748B] mt-6 space-x-2">
          <span>Counsellor? <a href="/counsellor/login" className="text-emerald-600 font-medium hover:text-orange-600 hover:underline transition-colors">Counsellor Portal</a></span>
          <span>·</span>
          <span>Student? <a href="/login" className="text-[#1D4ED8] font-medium hover:text-orange-600 hover:underline transition-colors">Student Portal</a></span>
        </p>
      </div>
      </div>

      {/* Page footer — portal switcher */}
      <footer className="py-5 flex items-center justify-center bg-[#FFF7ED] border-t border-[#FED7AA]">
        <a
          href="/login"
          className="text-sm text-[#64748B] hover:text-orange-600 transition-colors duration-200 flex items-center gap-1 group"
          id="switch-to-student-portal"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
          Go to Student Portal
        </a>
      </footer>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={open => { setForgotOpen(open); if (!open) setForgotMode('form'); }}>
        <DialogContent className="sm:max-w-md bg-white border-[#FED7AA]">
          <DialogHeader>
            <DialogTitle className="text-[#172554]">
              {forgotMode === 'form' ? 'Reset Admin Password' : 'Check Your Email'}
            </DialogTitle>
          </DialogHeader>

          {forgotMode === 'form' && (
            <form onSubmit={handleSendReset} className="space-y-4 mt-2">
              <p className="text-[#667085] text-sm">
                Enter your admin email address and we'll send you a secure link to reset your password.
              </p>
              <div>
                <Label htmlFor="forgot-admin-email" className="text-[#344054]">Admin Email</Label>
                <Input
                  id="forgot-admin-email"
                  type="email"
                  placeholder="admin@tatti.edu"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="mt-1.5 bg-white border-[#D0D5DD] focus:border-[#1D4ED8] focus:ring-[#1D4ED8] h-10"
                />
              </div>
              <Button type="submit" disabled={forgotLoading} className="w-full bg-[#1D4ED8] hover:bg-orange-600 text-white font-semibold h-11 rounded-lg shadow-sm transition-all duration-150">
                {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Reset Link
              </Button>
            </form>
          )}

          {forgotMode === 'sent' && (
            <div className="mt-2 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">
                  If an account exists for{' '}
                  <span className="text-foreground font-medium">{forgotEmail}</span>,
                  a password reset link has been sent.
                </p>
                <p className="text-muted-foreground text-xs">Check your spam folder if you don't see it within a few minutes.</p>
              </div>
              <Button variant="outline" className="w-full hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50 transition-colors" onClick={() => setForgotOpen(false)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

