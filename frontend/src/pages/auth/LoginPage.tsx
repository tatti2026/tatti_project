import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, BookOpen, Monitor, Wifi, Loader2, CheckCircle2, Copy } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset-sent';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');

  // Login form states — guaranteed empty strings
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sign Up form states (7 fields in order) — guaranteed empty strings
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpParentName, setSignUpParentName] = useState('');
  const [signUpParentPhone, setSignUpParentPhone] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);

  // Forgot / Reset states

  const { signInWithEmail, signUpWithEmail, sendPasswordResetEmail, user, role } = useAuth();
  const navigate = useNavigate();

  // Reset all credential fields
  const resetAllFields = useCallback(() => {
    setEmail('');
    setPassword('');
    setSignUpUsername('');
    setSignUpPhone('');
    setSignUpParentName('');
    setSignUpParentPhone('');
    setSignUpEmail('');
    setSignUpPassword('');
    setSignUpConfirmPassword('');
    setCreatedStudentId(null);
  }, []);

  // Ensure all fields are completely blank when page loads or mounts
  useEffect(() => {
    resetAllFields();
  }, [resetAllFields]);

  // Handle switching modes with a clean slate
  const changeMode = (newMode: AuthMode) => {
    resetAllFields();
    setMode(newMode);
  };

  useEffect(() => {
    if (user && role && !createdStudentId) {
      if (role === 'admin') navigate('/admin/dashboard', { replace: true });
      else navigate('/student/dashboard', { replace: true });
    }
  }, [user, role, navigate, createdStudentId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    const { error } = await signInWithEmail(email.trim(), password, remember);
    setLoading(false);
    if (error) toast.error('Invalid credentials. Please check your Student ID / email and password.');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpEmail || !signUpPassword || !signUpConfirmPassword) {
      toast.error('Email and password fields are required.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (signUpPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (signUpPhone && !/^\d{10}$/.test(signUpPhone.trim())) {
      toast.error('Student phone number must be exactly 10 digits');
      return;
    }
    if (signUpParentPhone && !/^\d{10}$/.test(signUpParentPhone.trim())) {
      toast.error('Parent/Guardian phone number must be exactly 10 digits');
      return;
    }
    if (!agreedToTerms) {
      toast.error('Please agree to the User Agreement and Privacy Policy');
      return;
    }

    setLoading(true);
    const res = await signUpWithEmail({
      email: signUpEmail.trim(),
      password: signUpPassword,
      username: signUpUsername.trim() || undefined,
      phone: signUpPhone.trim() || undefined,
      parentName: signUpParentName.trim() || undefined,
      parentPhone: signUpParentPhone.trim() || undefined,
      fullName: signUpUsername.trim() || undefined,
    });
    setLoading(false);

    if (res.error) {
      toast.error(res.error.message);
    } else {
      const genId = res.studentId || 'Generated';
      setCreatedStudentId(genId);
      toast.success(`Account created! Your Student ID is ${genId}`);
    }
  };

  const handleCopyStudentId = () => {
    if (createdStudentId) {
      navigator.clipboard.writeText(createdStudentId);
      toast.success('Student ID copied to clipboard!');
    }
  };

  const handleProceedAfterSignup = () => {
    if (createdStudentId) {
      const idToFill = createdStudentId;
      resetAllFields();
      setEmail(idToFill);
      setMode('login');
      toast.info('Please sign in using your new Student ID or email.');
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email or Student ID'); return; }
    setLoading(true);
    await sendPasswordResetEmail(email.trim());
    setLoading(false);
    // Always show confirmation — never reveal if the account exists
    setMode('reset-sent');
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
              <form onSubmit={handleLogin} className="space-y-4" autoComplete="off" autoCapitalize="none" spellCheck={false}>
                <div>
                  <Label htmlFor="tatti-student-id" className="text-sm font-medium">Student ID</Label>
                  <Input
                    id="tatti-student-id"
                    name="tatti_auth_student_identifier"
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    placeholder="e.g. 2026-TATTI-001"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="mt-1.5 bg-input border-border"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Use the Student ID received during signup
                  </p>
                </div>
                <div>
                  <Label htmlFor="tatti-student-pw" className="text-sm font-medium">Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="tatti-student-pw"
                      name="tatti_auth_student_secret"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" checked={remember} onCheckedChange={v => setRemember(!!v)} />
                    <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">Remember me</Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => changeMode('forgot')}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <Button type="submit" disabled={loading} className="w-full gradient-bg border-0 text-white font-semibold h-10">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-5">
                New student?{' '}
                <button onClick={() => changeMode('signup')} className="text-primary font-semibold hover:underline">Sign Up</button>
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
              {createdStudentId ? (
                /* Success banner with generated Student ID */
                <div className="space-y-5 text-center">
                  <div className="w-16 h-16 bg-green-500/15 border border-green-500/30 rounded-2xl flex items-center justify-center mx-auto text-green-500">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">Account Created!</h2>
                    <p className="text-sm text-muted-foreground">
                      Your official TATTI Student ID has been generated:
                    </p>
                  </div>

                  {/* Highlighted Student ID Card */}
                  <div className="p-4 bg-primary/10 border-2 border-dashed border-primary/40 rounded-xl flex items-center justify-between">
                    <div className="text-left">
                      <span className="text-[11px] font-semibold tracking-wider text-primary uppercase block">Your Student ID</span>
                      <span className="text-xl font-bold text-foreground font-mono">{createdStudentId}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyStudentId}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Please save this Student ID. <strong>Use this Student ID and your password to sign in</strong> to the TATTI Portal.
                  </p>

                  <Button
                    type="button"
                    onClick={handleProceedAfterSignup}
                    className="w-full gradient-bg border-0 text-white font-semibold h-10"
                  >
                    Proceed to Sign In
                  </Button>
                </div>
              ) : (
                /* 7 Fields Sign Up Form */
                <>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Create Account</h2>
                  <p className="text-muted-foreground text-sm mb-6">Start your TATTI admission journey</p>
                  <form onSubmit={handleSignUp} className="space-y-3.5" autoComplete="off" autoCapitalize="none" spellCheck={false}>
                    {/* Field 1: Username */}
                    <div>
                      <Label htmlFor="su-username" className="text-xs font-medium">Username</Label>
                      <Input
                        id="su-username"
                        name="tatti_signup_user_handle"
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        placeholder="Choose a username"
                        value={signUpUsername}
                        onChange={e => setSignUpUsername(e.target.value)}
                        className="mt-1 bg-input border-border h-9 text-sm"
                      />
                    </div>

                    {/* Field 2: Student Phone Number */}
                    <div>
                      <Label htmlFor="su-phone" className="text-xs font-medium">Student Phone Number</Label>
                      <Input
                        id="su-phone"
                        name="tatti_signup_student_tel"
                        type="tel"
                        maxLength={10}
                        autoComplete="off"
                        data-lpignore="true"
                        placeholder="10-digit mobile number"
                        value={signUpPhone}
                        onChange={e => setSignUpPhone(e.target.value.replace(/\D/g, ''))}
                        className="mt-1 bg-input border-border h-9 text-sm"
                      />
                    </div>

                    {/* Field 3: Parent / Guardian Name */}
                    <div>
                      <Label htmlFor="su-pname" className="text-xs font-medium">Parent / Guardian Name</Label>
                      <Input
                        id="su-pname"
                        name="tatti_signup_guardian_name"
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        data-lpignore="true"
                        placeholder="Enter parent or guardian full name"
                        value={signUpParentName}
                        onChange={e => setSignUpParentName(e.target.value)}
                        className="mt-1 bg-input border-border h-9 text-sm"
                      />
                    </div>

                    {/* Field 4: Parent / Guardian Phone */}
                    <div>
                      <Label htmlFor="su-pphone" className="text-xs font-medium">Parent / Guardian Phone Number</Label>
                      <Input
                        id="su-pphone"
                        name="tatti_signup_guardian_tel"
                        type="tel"
                        maxLength={10}
                        autoComplete="off"
                        data-lpignore="true"
                        placeholder="10-digit parent mobile number"
                        value={signUpParentPhone}
                        onChange={e => setSignUpParentPhone(e.target.value.replace(/\D/g, ''))}
                        className="mt-1 bg-input border-border h-9 text-sm"
                      />
                    </div>

                    {/* Field 5: Email Address */}
                    <div>
                      <Label htmlFor="su-email" className="text-xs font-medium">Email Address <span className="text-destructive">*</span></Label>
                      <Input
                        id="su-email"
                        name="tatti_signup_contact_email"
                        type="email"
                        required
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        placeholder="Enter your email address"
                        value={signUpEmail}
                        onChange={e => setSignUpEmail(e.target.value)}
                        className="mt-1 bg-input border-border h-9 text-sm"
                      />
                    </div>

                    {/* Field 6: Create Password */}
                    <div>
                      <Label htmlFor="su-pw" className="text-xs font-medium">Create Password <span className="text-destructive">*</span></Label>
                      <div className="relative mt-1">
                        <Input
                          id="su-pw"
                          name="tatti_signup_create_secret"
                          type={showSignUpPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          data-lpignore="true"
                          data-1p-ignore="true"
                          placeholder="Min 6 characters"
                          value={signUpPassword}
                          onChange={e => setSignUpPassword(e.target.value)}
                          className="bg-input border-border pr-10 h-9 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSignUpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Field 7: Confirm Password */}
                    <div>
                      <Label htmlFor="su-cpw" className="text-xs font-medium">Confirm Password <span className="text-destructive">*</span></Label>
                      <Input
                        id="su-cpw"
                        name="tatti_signup_confirm_secret"
                        type="password"
                        required
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        placeholder="Re-enter password"
                        value={signUpConfirmPassword}
                        onChange={e => setSignUpConfirmPassword(e.target.value)}
                        className="mt-1 bg-input border-border h-9 text-sm"
                      />
                    </div>

                    <div className="flex items-start gap-2 pt-1">
                      <Checkbox
                        id="tos"
                        checked={agreedToTerms}
                        onCheckedChange={v => setAgreedToTerms(!!v)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="tos" className="text-xs text-muted-foreground cursor-pointer">
                        I agree to the <span className="text-primary">User Agreement</span> and <span className="text-primary">Privacy Policy</span>
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full gradient-bg border-0 text-white font-semibold h-10 mt-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                    </Button>
                  </form>
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Already have an account?{' '}
                    <button onClick={() => changeMode('login')} className="text-primary font-semibold hover:underline">Sign In</button>
                  </p>
                </>
              )}
            </div>
          )}

          {mode === 'forgot' && (
            <div className="glass-card rounded-2xl p-6 md:p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-foreground mb-1">Forgot Password?</h2>
              <p className="text-muted-foreground text-sm mb-6">Enter your registered email and we'll send you a secure link to reset your password.</p>
              <form onSubmit={handleSendReset} className="space-y-4" autoComplete="off" autoCapitalize="none" spellCheck={false}>
                <div>
                  <Label htmlFor="fp-email">Email Address</Label>
                  <Input
                    id="fp-email"
                    name="tatti_forgot_student_identifier"
                    type="email"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="mt-1.5 bg-input border-border"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full gradient-bg border-0 text-white font-semibold h-10">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                </Button>
              </form>
              <button onClick={() => changeMode('login')} className="text-center text-sm text-primary hover:underline w-full mt-4">Back to Sign In</button>
            </div>
          )}

          {mode === 'reset-sent' && (
            <div className="glass-card rounded-2xl p-6 md:p-8 animate-fade-in text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h2>
              <p className="text-muted-foreground text-sm mb-1">
                If an account exists for <span className="text-foreground font-medium">{email}</span>, a password reset link has been sent.
              </p>
              <p className="text-muted-foreground text-xs mb-6">Check your spam folder if you don't see it within a few minutes.</p>
              <button onClick={() => { changeMode('login'); }} className="text-sm text-primary hover:underline">Back to Sign In</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
