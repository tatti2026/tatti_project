import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, BookOpen, Monitor, Wifi, Loader2 } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot' | 'otp' | 'reset';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const { signInWithEmail, signUpWithEmail, user, role } = useAuth();
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    toast.success('OTP sent to your email (demo mode)');
    setMode('otp');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const otpVal = otp.join('');
    if (otpVal.length !== 6) { toast.error('Please enter the 6-digit OTP'); return; }
    toast.success('OTP verified (demo)');
    setMode('reset');
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) { toast.error('Passwords do not match'); return; }
    toast.success('Password reset successfully!');
    setMode('login');
  };

  const handleOtpInput = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) {
      const nextEl = document.getElementById(`otp-${idx + 1}`);
      nextEl?.focus();
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel */}
      <div className="hidden md:flex flex-col justify-between w-1/2 relative overflow-hidden p-10 gradient-bg">
        {/* Decorative shapes */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/3 right-10 w-32 h-32 bg-white/5 rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-tight">TATTI</h1>
              <p className="text-white/70 text-xs leading-tight">Tamil Nadu Advanced Technical Training Institute</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-8">
            <BookOpen className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-medium">TAT Entrance Exam</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 text-balance">Your Journey<br />Starts Here</h2>
          <p className="text-white/80 text-sm leading-relaxed max-w-sm">
            Access your entrance exam results, counselling updates, personalized course recommendations, and admission status — all in one place.
          </p>
        </div>

        {/* Illustration */}
        <div className="relative z-10 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Monitor, text: 'Digital Learning' },
              { icon: BookOpen, text: 'Smart Courses' },
              { icon: Wifi, text: 'Connected' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="bg-white/15 rounded-xl p-3 flex flex-col items-center gap-1.5">
                <Icon className="w-5 h-5 text-white" />
                <span className="text-white/80 text-[10px] font-medium text-center">{text}</span>
              </div>
            ))}
          </div>
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white text-xs font-semibold">Admission 2024–25</p>
                <p className="text-white/60 text-[10px]">Applications Open Now</p>
              </div>
              <div className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Right login card */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-6 md:hidden">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground">TATTI</p>
              <p className="text-xs text-muted-foreground">Student Portal</p>
            </div>
          </div>

          {mode === 'login' && (
            <div className="glass-card rounded-2xl p-6 md:p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-foreground mb-1">Welcome Back!</h2>
              <p className="text-muted-foreground text-sm mb-6">Sign in to continue your student journey</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">Student ID / Email</Label>
                  <Input id="email" type="email" placeholder="Enter your Student ID or email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="mt-1.5 bg-input border-border" />
                </div>
                <div>
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative mt-1.5">
                    <Input id="password" type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="bg-input border-border pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" checked={remember} onCheckedChange={v => setRemember(!!v)} />
                    <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">Remember me</Label>
                  </div>
                  <button type="button" onClick={() => setMode('forgot')}
                    className="text-sm text-primary hover:underline">Forgot Password?</button>
                </div>
                <Button type="submit" disabled={loading} className="w-full gradient-bg border-0 text-white font-semibold h-10">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-5">
                New student?{' '}
                <button onClick={() => setMode('signup')} className="text-primary font-semibold hover:underline">Sign Up</button>
              </p>
              <div className="mt-4">
                <div className="text-center text-xs text-muted-foreground mb-3">— OR —</div>
                <Link to="/admin/login">
                  <Button variant="outline" className="w-full text-sm">Admin Portal</Button>
                </Link>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="glass-card rounded-2xl p-6 md:p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-foreground mb-1">Create Account</h2>
              <p className="text-muted-foreground text-sm mb-6">Start your TATTI admission journey</p>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="su-email">Email Address</Label>
                  <Input id="su-email" type="email" placeholder="Enter your email"
                    value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 bg-input border-border" />
                </div>
                <div>
                  <Label htmlFor="su-pw">Create Password</Label>
                  <div className="relative mt-1.5">
                    <Input id="su-pw" type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters"
                      value={password} onChange={e => setPassword(e.target.value)} className="bg-input border-border pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="su-cpw">Confirm Password</Label>
                  <Input id="su-cpw" type="password" placeholder="Re-enter password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className="mt-1.5 bg-input border-border" />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="tos" className="mt-0.5" />
                  <Label htmlFor="tos" className="text-xs text-muted-foreground cursor-pointer">
                    I agree to the <span className="text-primary">User Agreement</span> and <span className="text-primary">Privacy Policy</span>
                  </Label>
                </div>
                <Button type="submit" disabled={loading} className="w-full gradient-bg border-0 text-white font-semibold h-10">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-5">
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-primary font-semibold hover:underline">Sign In</button>
              </p>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="glass-card rounded-2xl p-6 md:p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-foreground mb-1">Forgot Password?</h2>
              <p className="text-muted-foreground text-sm mb-6">Enter your Student ID or registered email to receive a one-time password.</p>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <Label htmlFor="fp-email">Student ID / Email</Label>
                  <Input id="fp-email" type="email" placeholder="Enter your email"
                    value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 bg-input border-border" />
                </div>
                <Button type="submit" disabled={loading} className="w-full gradient-bg border-0 text-white font-semibold h-10">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send OTP'}
                </Button>
              </form>
              <button onClick={() => setMode('login')} className="text-center text-sm text-primary hover:underline w-full mt-4">Back to Sign In</button>
            </div>
          )}

          {mode === 'otp' && (
            <div className="glass-card rounded-2xl p-6 md:p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-foreground mb-1">Enter OTP</h2>
              <p className="text-muted-foreground text-sm mb-6">We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span></p>
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, idx) => (
                    <input key={idx} id={`otp-${idx}`}
                      type="text" maxLength={1} value={digit}
                      onChange={e => handleOtpInput(idx, e.target.value)}
                      onKeyDown={e => e.key === 'Backspace' && !digit && idx > 0 && document.getElementById(`otp-${idx - 1}`)?.focus()}
                      className="w-11 h-12 text-center text-lg font-bold bg-input border border-border rounded-lg text-foreground focus:border-primary outline-none" />
                  ))}
                </div>
                <Button type="submit" className="w-full gradient-bg border-0 text-white font-semibold h-10">Verify OTP</Button>
              </form>
            </div>
          )}

          {mode === 'reset' && (
            <div className="glass-card rounded-2xl p-6 md:p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-foreground mb-1">Create New Password</h2>
              <p className="text-muted-foreground text-sm mb-6">Enter your new password below</p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <Label htmlFor="np">New Password</Label>
                  <Input id="np" type="password" placeholder="New password"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1.5 bg-input border-border" />
                </div>
                <div>
                  <Label htmlFor="cnp">Confirm Password</Label>
                  <Input id="cnp" type="password" placeholder="Confirm new password"
                    value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
                    className="mt-1.5 bg-input border-border" />
                </div>
                <Button type="submit" className="w-full gradient-bg border-0 text-white font-semibold h-10">Reset Password</Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
