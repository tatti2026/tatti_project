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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-bg mb-4">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">TATTI Admin Portal</h1>
          <p className="text-muted-foreground text-sm">Secure administration and student management</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6 p-3 bg-accent/10 rounded-lg border border-accent/20">
            <Shield className="w-4 h-4 text-accent shrink-0" />
            <span className="text-xs text-accent font-medium">Authorized Personnel Only</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off" autoCapitalize="none" spellCheck={false}>
            <div>
              <Label htmlFor="admin-email" className="text-sm font-medium">Admin Email</Label>
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
                placeholder="Enter admin email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1.5 bg-input border-border"
              />
            </div>
            <div>
              <Label htmlFor="admin-pw" className="text-sm font-medium">Password</Label>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="admin-remember"
                  checked={remember}
                  onCheckedChange={v => setRemember(!!v)}
                />
                <Label htmlFor="admin-remember" className="text-sm text-muted-foreground cursor-pointer">Remember me</Label>
              </div>
              <button
                type="button"
                onClick={handleForgotOpen}
                className="text-sm text-primary hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <Button type="submit" disabled={loading} className="w-full gradient-bg border-0 text-white font-semibold h-11">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
              Admin Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Student?{' '}
          <a href="/login" className="text-primary hover:underline">Go to Student Portal</a>
        </p>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={open => { setForgotOpen(open); if (!open) setForgotMode('form'); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {forgotMode === 'form' ? 'Reset Admin Password' : 'Check Your Email'}
            </DialogTitle>
          </DialogHeader>

          {forgotMode === 'form' && (
            <form onSubmit={handleSendReset} className="space-y-4 mt-2">
              <p className="text-muted-foreground text-sm">
                Enter your admin email address and we'll send you a secure link to reset your password.
              </p>
              <div>
                <Label htmlFor="forgot-admin-email">Admin Email</Label>
                <Input
                  id="forgot-admin-email"
                  type="email"
                  placeholder="Enter your admin email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="mt-1.5 bg-input border-border"
                />
              </div>
              <Button type="submit" disabled={forgotLoading} className="w-full gradient-bg border-0 text-white font-semibold h-10">
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

