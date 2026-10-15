import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, Loader2, Heart, Users, ChartNoAxesColumnIncreasing } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset-sent';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    const { error } = await signInWithEmail(email, password);
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
    { icon: Users, title: 'Career Support' },
    { icon: ChartNoAxesColumnIncreasing, title: 'Personalized Recommendations & Counselling' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Main content row */}
      <div className="flex flex-1 min-h-0">
      {/* Left brand panel – light orange theme */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] xl:w-[42%] relative overflow-hidden"
        style={{ background: '#FFE0B2' }}
      >
        {/* Soft dotted pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #FED7AA 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        {/* Decorative circles – soft orange */}
        <div className="absolute -left-20 bottom-12 w-64 h-64 rounded-full border-[24px] pointer-events-none" style={{ borderColor: '#FED7AA' }} />
        <div className="absolute -left-10 bottom-20 w-44 h-44 rounded-full border-[14px] pointer-events-none" style={{ borderColor: '#FED7AA' }} />

        <div className="relative z-10 px-10 pt-10 pb-8">
          {/* Logo row */}
          <div className="flex items-center gap-4 mb-12">
            <div
              className="relative w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: '#F59E0B', boxShadow: '0 0 28px rgba(245,158,11,0.35)' }}
            >
              <div className="absolute inset-2 rounded-full border-2 border-white/60" />
              <Heart className="w-8 h-8 text-white" fill="white" />
            </div>
            <div className="flex items-center text-4xl font-black tracking-tight" style={{ letterSpacing: '-0.08em' }}>
              <span style={{ color: '#EA580C' }}>PSY</span>
              <span style={{ color: '#172554' }}>CARE</span>
            </div>
          </div>

          <div className="mb-10">
            <h1
              className="text-4xl xl:text-[3rem] leading-[1.05] font-bold mb-3"
              style={{ letterSpacing: '-0.05em', color: '#172554' }}
            >
              Your Mental Well-being<br />Our Priority
            </h1>
            {/* Orange underline */}
            <div className="w-14 h-1 rounded-full mb-4" style={{ background: '#F59E0B' }} />
            <p className="text-sm xl:text-[0.95rem] leading-relaxed max-w-[24rem]" style={{ color: '#172554' }}>
              PSYCARE is a digital platform designed to support students in understanding their potential, making informed career choices and building a brighter future through personalized career guidance and counselling.
            </p>
          </div>

          {/* Two feature items – centred evenly */}
          <div className="flex justify-center gap-10 max-w-[28rem]">
            {features.map(({ icon: Icon, title }) => (
              <div key={title} className="flex flex-col items-center text-center gap-3 flex-1">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ background: '#F59E0B' }}
                >
                  <Icon className="w-5 h-5" style={{ color: '#172554' }} />
                </div>
                <p className="text-[0.8rem] font-medium leading-snug max-w-[6.2rem]" style={{ color: '#9A3412' }}>{title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10 px-8 pb-8 pt-2">
          <div
            className="relative flex items-center justify-center text-[1.75rem] font-semibold italic tracking-tight"
            style={{ letterSpacing: '-0.04em', color: '#172554' }}
          >
            Better Minds&nbsp; Brighter Futures
            <span
              className="absolute -bottom-2 left-[29%] w-[45%] h-[2px] rounded-full -rotate-[5deg]"
              style={{ background: '#F59E0B' }}
            />
          </div>
        </div>
      </div>

      {/* Right login card */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-background pb-6">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(220 72% 20%)' }}>
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">PSY CARE</p>
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
                  <Label htmlFor="email" className="text-sm font-medium text-foreground mb-1.5 block">Student Email or Student ID</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email or Student ID"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-10 transition-colors"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #FED7AA',
                      color: '#172554',
                    }}
                    onFocus={e => { e.currentTarget.style.border = '1px solid #F59E0B'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.2)'; }}
                    onBlur={e => { e.currentTarget.style.border = '1px solid #FED7AA'; e.currentTarget.style.boxShadow = 'none'; }}
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
                      className="h-10 pr-10 transition-colors"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #FED7AA',
                        color: '#172554',
                      }}
                      onFocus={e => { e.currentTarget.style.border = '1px solid #F59E0B'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.2)'; }}
                      onBlur={e => { e.currentTarget.style.border = '1px solid #FED7AA'; e.currentTarget.style.boxShadow = 'none'; }}
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
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-sm font-medium hover:underline hover:text-orange-600 transition-colors"
                    style={{ color: 'hsl(213 85% 50%)' }}
                  >
                    Forgot password?
                  </button>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 text-white font-semibold transition-all duration-150 hover:bg-orange-600"
                  style={{ background: 'hsl(220 72% 20%)', border: 'none' }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-6">
                New student?{' '}
                <button onClick={() => setMode('signup')} className="font-semibold hover:underline hover:text-orange-600 transition-colors" style={{ color: 'hsl(213 85% 50%)' }}>
                  Create an account
                </button>
              </p>
              <div className="mt-5 pt-5 grid grid-cols-2 gap-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <Link to="/admin/login">
                  <Button
                    variant="outline"
                    className="w-full text-xs h-9 font-medium transition-all duration-150 shadow-sm"
                    style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#172554' }}
                    onMouseEnter={e => { const b = e.currentTarget; b.style.background='#FFE0B2'; b.style.border='1px solid #F59E0B'; b.style.color='#9A3412'; }}
                    onMouseLeave={e => { const b = e.currentTarget; b.style.background='#FFF7ED'; b.style.border='1px solid #FED7AA'; b.style.color='#172554'; }}
                  >
                    Admin Portal
                  </Button>
                </Link>
                <Link to="/counsellor/login">
                  <Button
                    variant="outline"
                    className="w-full text-xs h-9 font-medium transition-all duration-150 shadow-sm"
                    style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#172554' }}
                    onMouseEnter={e => { const b = e.currentTarget; b.style.background='#FFE0B2'; b.style.border='1px solid #F59E0B'; b.style.color='#9A3412'; }}
                    onMouseLeave={e => { const b = e.currentTarget; b.style.background='#FFF7ED'; b.style.border='1px solid #FED7AA'; b.style.color='#172554'; }}
                  >
                    Counsellor Portal
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
                <p className="text-muted-foreground text-sm">Start your PSY CARE admission journey today</p>
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
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 text-white font-semibold transition-all duration-150 hover:bg-orange-600"
                  style={{ background: 'hsl(220 72% 20%)', border: 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EA580C'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(220 72% 20%)'; }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="font-semibold hover:underline hover:text-orange-600 transition-colors" style={{ color: 'hsl(213 85% 50%)' }}>
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
                    className="h-10 bg-white border-border focus:border-primary hover:border-orange-400" />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 text-white font-semibold transition-all duration-150 hover:bg-orange-600"
                  style={{ background: 'hsl(220 72% 20%)', border: 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EA580C'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(220 72% 20%)'; }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                </Button>
              </form>
              <button onClick={() => setMode('login')} className="text-center text-sm hover:underline hover:text-orange-600 transition-colors w-full mt-5 font-medium" style={{ color: 'hsl(213 85% 50%)' }}>
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
              <button onClick={() => { setMode('login'); setEmail(''); }} className="text-sm font-medium hover:underline hover:text-orange-600 transition-colors" style={{ color: 'hsl(213 85% 50%)' }}>
                Back to Sign In
              </button>
            </div>
          )}
        </div>

      </div>
      </div>
    </div>
  );
}
