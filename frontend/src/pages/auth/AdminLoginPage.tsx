import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, Shield, Loader2, Mail } from 'lucide-react';

type ForgotMode = 'form' | 'sent';

export default function AdminLoginPage() {
  // Guaranteed clean initial state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password dialog state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMode, setForgotMode] = useState<ForgotMode>('form');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { signInWithEmail, sendPasswordResetEmail, user, role } = useAuth();
  const navigate = useNavigate();

  // Reset fields on initial mount
  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  useEffect(() => {
    if (user && role === 'admin') navigate('/admin/dashboard', { replace: true });
  }, [user, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    const { error } = await signInWithEmail(email.trim(), password, remember);
    setLoading(false);
    if (error) toast.error('Invalid admin credentials');
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
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0B1F3A] mb-4 shadow-md">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#172033] mb-1 tracking-tight">TATTI Admin Portal</h1>
          <p className="text-[#667085] text-sm">Administrative Management & Student Operations</p>
        </div>

        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-8 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center gap-2 mb-6 p-3 bg-blue-50/80 rounded-lg border border-blue-200/80">
            <Shield className="w-4 h-4 text-[#1D4ED8] shrink-0" />
            <span className="text-xs text-[#1D4ED8] font-medium">Authorized Administrative Personnel Only</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off" autoCapitalize="none" spellCheck={false}>
            <div>
              <Label htmlFor="admin-email" className="text-sm font-medium text-[#344054]">Admin Email</Label>
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
                placeholder="admin@tatti.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1.5 bg-white border-[#D0D5DD] focus:border-[#1D4ED8] focus:ring-[#1D4ED8] h-11"
              />
            </div>
            <div>
              <Label htmlFor="admin-pw" className="text-sm font-medium text-[#344054]">Password</Label>
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
                  className="bg-white border-[#D0D5DD] focus:border-[#1D4ED8] focus:ring-[#1D4ED8] pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="admin-remember"
                  checked={remember}
                  onCheckedChange={v => setRemember(!!v)}
                />
                <Label htmlFor="admin-remember" className="text-sm text-[#667085] cursor-pointer">Remember me</Label>
              </div>
              <button
                type="button"
                onClick={handleForgotOpen}
                className="text-sm text-[#1D4ED8] font-medium hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[#1D4ED8] hover:bg-[#1e40af] text-white font-semibold h-11 rounded-lg shadow-sm transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
              Admin Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#667085] mt-6">
          Student?{' '}
          <a href="/login" className="text-[#1D4ED8] font-medium hover:underline">Go to Student Portal</a>
        </p>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={open => { setForgotOpen(open); if (!open) setForgotMode('form'); }}>
        <DialogContent className="sm:max-w-md bg-white border-[#E4E7EC]">
          <DialogHeader>
            <DialogTitle className="text-[#172033]">
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
              <Button type="submit" disabled={forgotLoading} className="w-full bg-[#1D4ED8] hover:bg-[#1e40af] text-white font-semibold h-11 rounded-lg shadow-sm transition-colors">
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
              <Button variant="outline" className="w-full" onClick={() => setForgotOpen(false)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

