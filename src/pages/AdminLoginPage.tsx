import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, Shield, Loader2, Mail } from 'lucide-react';

type ForgotMode = 'form' | 'sent';

export default function AdminLoginPage() {
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
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      toast.error('Invalid admin credentials');
    } else {
      // Role check after login — role updates asynchronously via onAuthStateChange
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
    await sendPasswordResetEmail(forgotEmail);
    setForgotLoading(false);
    // Always show confirmation — never reveal if the account exists
    setForgotMode('sent');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        {/* Header */}
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
          <h1 className="text-2xl font-bold text-foreground mb-1">PSY CARE Admin Portal</h1>
          <p className="text-muted-foreground text-sm">Secure administration and student management</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6 p-3 bg-accent/10 rounded-lg border border-accent/20">
            <Shield className="w-4 h-4 text-accent shrink-0" />
            <span className="text-xs text-accent font-medium">Authorized Personnel Only</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="admin-email" className="text-sm font-medium">Admin Email</Label>
              <Input id="admin-email" type="email" placeholder="Enter admin email"
                value={email} onChange={e => setEmail(e.target.value)}
                className="mt-1.5 bg-input border-border" />
            </div>
            <div>
              <Label htmlFor="admin-pw" className="text-sm font-medium">Password</Label>
              <div className="relative mt-1.5">
                <Input id="admin-pw" type={showPassword ? 'text' : 'password'}
                  placeholder="Enter admin password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="bg-input border-border pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link
                to="/forgot-password?role=admin"
                className="text-sm text-primary hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <Button type="submit" disabled={loading} className="w-full gradient-bg border-0 text-white font-semibold h-11">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
              Admin Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 space-x-2">
          <span>Counsellor? <a href="/counsellor/login" className="text-emerald-600 hover:underline font-medium">Counsellor Portal</a></span>
          <span>·</span>
          <span>Student? <a href="/login" className="text-primary hover:underline font-medium">Student Portal</a></span>
        </p>
      </div>
      </div>

      {/* Page footer — portal switcher */}
      <footer className="py-5 flex items-center justify-center border-t" style={{ borderColor: 'hsl(var(--border))' }}>
        <a
          href="/login"
          className="text-sm flex items-center gap-1 transition-colors duration-200 group"
          style={{ color: 'hsl(var(--muted-foreground))' }}
          id="switch-to-student-portal"
          onMouseEnter={e => (e.currentTarget.style.color = 'hsl(213 85% 50%)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
          Go to Student Portal
        </a>
      </footer>

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

