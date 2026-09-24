import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, ClipboardCheck, BookOpen, Award, Loader2, ShieldCheck } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset-sent';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, signUpWithEmail, sendPasswordResetEmail, user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role) {
      if (role === 'admin') navigate('/admin/dashboard', { replace: true });
      else navigate('/student/dashboard', { replace: true });
    }
  }, [user, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    const { error } = await signInWithEmail(email, password, remember);
    setLoading(false);
    if (error) toast.error('Invalid credentials. Please try again.');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) { toast.error('Please fill in all fields'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { error } = await signUpWithEmail(email, password);
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success('Account created! You are now logged in.'); }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email'); return; }
    setLoading(true);
    await sendPasswordResetEmail(email);
    setLoading(false);
    setMode('reset-sent');
  };

  const features = [
    { icon: ClipboardCheck, title: 'Career Fit Assessment', desc: 'AI-powered assessment to match you to the right programme' },
    { icon: BookOpen, title: 'Course Recommendations', desc: 'Personalized course recommendations based on your profile' },
    { icon: Award, title: 'Admission Tracking', desc: 'Track your application, payment, and counselling status' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] xl:w-[42%] relative overflow-hidden" style={{ background: 'linear-gradient(160deg, hsl(220 72% 16%), hsl(220 65% 24%))' }}>
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />

        <div className="relative z-10 px-10 pt-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsl(213 85% 62%)' }}>
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base tracking-wide leading-tight">TATTI</p>
              <p className="text-white/50 text-xs leading-tight">Tamil Nadu Advanced Technical Training Institute</p>
            </div>
          </div>

          {/* Hero text */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: 'hsl(213 85% 62% / 0.15)', color: 'hsl(213 85% 75%)', border: '1px solid hsl(213 85% 62% / 0.25)' }}>
              <ShieldCheck className="w-3 h-3" />
              Secure Student Portal
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight mb-4" style={{ letterSpacing: '-0.03em' }}>
              Your Academic<br />Journey Starts Here
            </h1>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              Access your TAT Entrance Exam results, counselling sessions, course recommendations, and admission status — all in one secure platform.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'hsl(213 85% 62% / 0.15)' }}>
                  <Icon className="w-4 h-4" style={{ color: 'hsl(213 85% 70%)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white leading-tight">{title}</p>
                  <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom trust badge */}
        <div className="relative z-10 px-10 pb-10">
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: 'hsl(220 72% 20%)', border: '1px solid hsl(220 65% 28%)' }}>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div>
              <p className="text-white text-xs font-medium">Admissions Open — 2024–25</p>
              <p className="text-white/40 text-[10px]">Applications are currently being accepted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right login card */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(220 72% 20%)' }}>
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">TATTI</p>
              <p className="text-xs text-muted-foreground">Student Portal</p>
            </div>
          </div>

          {/* Login Form */}
          {mode === 'login' && (
            <div className="animate-fade-in">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-1.5" style={{ letterSpacing: '-0.02em' }}>Welcome back</h2>
                <p className="text-muted-foreground text-sm">Sign in to your student account to continue</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-foreground mb-1.5 block">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-10 bg-white border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-foreground mb-1.5 block">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-10 bg-white border-border text-foreground placeholder:text-muted-foreground pr-10 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" checked={remember} onCheckedChange={v => setRemember(!!v)} />
                    <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">Remember me</Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-sm font-medium hover:underline"
                    style={{ color: 'hsl(213 85% 50%)' }}
                  >
                    Forgot password?
                  </button>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 text-white font-semibold"
                  style={{ background: 'hsl(220 72% 20%)', border: 'none' }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-6">
                New student?{' '}
                <button onClick={() => setMode('signup')} className="font-semibold hover:underline" style={{ color: 'hsl(213 85% 50%)' }}>
                  Create an account
                </button>
              </p>
              <div className="mt-5 pt-5" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <Link to="/admin/login">
                  <Button variant="outline" className="w-full text-sm h-9 text-muted-foreground hover:text-foreground">
                    Admin Portal Login
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Signup Form */}
          {mode === 'signup' && (
            <div className="animate-fade-in">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-1.5" style={{ letterSpacing: '-0.02em' }}>Create your account</h2>
                <p className="text-muted-foreground text-sm">Start your TATTI admission journey today</p>
              </div>
              <form onSubmit={handleSignUp} className="space-y-5">
                <div>
                  <Label htmlFor="su-email" className="text-sm font-medium text-foreground mb-1.5 block">Email Address</Label>
                  <Input id="su-email" type="email" placeholder="Enter your email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="h-10 bg-white border-border focus:border-primary" />
                </div>
                <div>
                  <Label htmlFor="su-pw" className="text-sm font-medium text-foreground mb-1.5 block">Password</Label>
                  <div className="relative">
                    <Input id="su-pw" type={showPassword ? 'text' : 'password'} placeholder="Minimum 6 characters"
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="h-10 bg-white border-border focus:border-primary pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="su-cpw" className="text-sm font-medium text-foreground mb-1.5 block">Confirm Password</Label>
                  <Input id="su-cpw" type="password" placeholder="Re-enter your password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className="h-10 bg-white border-border focus:border-primary" />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-10 text-white font-semibold" style={{ background: 'hsl(220 72% 20%)', border: 'none' }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="font-semibold hover:underline" style={{ color: 'hsl(213 85% 50%)' }}>
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* Forgot Password */}
          {mode === 'forgot' && (
            <div className="animate-fade-in">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-1.5" style={{ letterSpacing: '-0.02em' }}>Reset your password</h2>
                <p className="text-muted-foreground text-sm">Enter your registered email and we'll send a secure reset link.</p>
              </div>
              <form onSubmit={handleSendReset} className="space-y-5">
                <div>
                  <Label htmlFor="fp-email" className="text-sm font-medium text-foreground mb-1.5 block">Email Address</Label>
                  <Input id="fp-email" type="email" placeholder="Enter your registered email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="h-10 bg-white border-border focus:border-primary" />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-10 text-white font-semibold" style={{ background: 'hsl(220 72% 20%)', border: 'none' }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                </Button>
              </form>
              <button onClick={() => setMode('login')} className="text-center text-sm hover:underline w-full mt-5 font-medium" style={{ color: 'hsl(213 85% 50%)' }}>
                ← Back to Sign In
              </button>
            </div>
          )}

          {/* Reset Sent */}
          {mode === 'reset-sent' && (
            <div className="animate-fade-in text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: 'hsl(213 85% 50% / 0.1)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="hsl(213 85% 50%)" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2" style={{ letterSpacing: '-0.02em' }}>Check your email</h2>
              <p className="text-muted-foreground text-sm mb-1">
                If an account exists for <span className="text-foreground font-medium">{email}</span>, a password reset link has been sent.
              </p>
              <p className="text-muted-foreground text-xs mb-6">Check your spam folder if you don't see it within a few minutes.</p>
              <button onClick={() => { setMode('login'); setEmail(''); }} className="text-sm font-medium hover:underline" style={{ color: 'hsl(213 85% 50%)' }}>
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
