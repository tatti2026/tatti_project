import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, UserCheck, Loader2, Mail } from 'lucide-react';

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

  const { signInWithEmail, sendPasswordResetEmail, user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role === 'counsellor') navigate('/counsellor/dashboard', { replace: true });
    if (user && role === 'admin') navigate('/admin/dashboard', { replace: true });
  }, [user, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      toast.error('Invalid counsellor credentials');
    } else {
      setTimeout(() => {
        if (role && role !== 'counsellor' && role !== 'admin') {
          toast.error('Access denied. Counsellor credentials required.');
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
    setForgotMode('sent');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' }}
        />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
          >
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">TATTI Counsellor Portal</h1>
          <p className="text-muted-foreground text-sm">Student counselling and follow-up management</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <div
            className="flex items-center gap-2 mb-6 p-3 rounded-lg border"
            style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)' }}
          >
            <UserCheck className="w-4 h-4 shrink-0" style={{ color: '#059669' }} />
            <span className="text-xs font-medium" style={{ color: '#059669' }}>Authorised Counsellors Only</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="counsellor-email" className="text-sm font-medium">Counsellor Email</Label>
              <Input
                id="counsellor-email"
                type="email"
                placeholder="counsellor@tatti.edu.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1.5 bg-input border-border"
              />
            </div>
            <div>
              <Label htmlFor="counsellor-pw" className="text-sm font-medium">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="counsellor-pw"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
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
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotOpen}
                className="text-sm hover:underline"
                style={{ color: '#059669' }}
              >
                Forgot Password?
              </button>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full border-0 text-white font-semibold h-11"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />}
              Counsellor Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Admin?{' '}
          <a href="/admin/login" className="hover:underline" style={{ color: '#059669' }}>Go to Admin Portal</a>
          {' · '}
          <a href="/login" className="hover:underline" style={{ color: '#059669' }}>Student Portal</a>
        </p>
      </div>

      <Dialog open={forgotOpen} onOpenChange={open => { setForgotOpen(open); if (!open) setForgotMode('form'); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {forgotMode === 'form' ? 'Reset Counsellor Password' : 'Check Your Email'}
            </DialogTitle>
          </DialogHeader>

          {forgotMode === 'form' && (
            <form onSubmit={handleSendReset} className="space-y-4 mt-2">
              <p className="text-muted-foreground text-sm">
                Enter your counsellor email and we'll send you a secure link to reset your password.
              </p>
              <div>
                <Label htmlFor="forgot-counsellor-email">Counsellor Email</Label>
                <Input
                  id="forgot-counsellor-email"
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="mt-1.5 bg-input border-border"
                />
              </div>
              <Button
                type="submit"
                disabled={forgotLoading}
                className="w-full border-0 text-white font-semibold h-10"
                style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
              >
                {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Reset Link
              </Button>
            </form>
          )}

          {forgotMode === 'sent' && (
            <div className="mt-2 text-center space-y-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(16,185,129,0.1)' }}
              >
                <Mail className="w-7 h-7" style={{ color: '#059669' }} />
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
