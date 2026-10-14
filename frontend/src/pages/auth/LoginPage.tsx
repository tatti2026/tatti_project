import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, Loader2, CheckCircle2, Copy, Heart, Users, ChartNoAxesColumnIncreasing } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset-sent';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');

  // Login form states — guaranteed empty strings
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    const { error } = await signInWithEmail(email.trim(), password);
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
    <div className="min-h-screen flex flex-col bg-[#FFF7ED]">
      {/* Main content row */}
      <div className="flex flex-1 min-h-0">
      {/* Left branding panel – light orange theme */}
      <div
        className="hidden md:flex flex-col justify-between w-[54%] relative overflow-hidden px-8 xl:px-16 py-8"
        style={{ background: '#FFE0B2' }}
      >
        {/* Soft dotted pattern + soft warm blobs */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #FED7AA 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        {/* Decorative circles – soft orange */}
        <div className="absolute -left-20 bottom-12 w-64 h-64 rounded-full border-[24px] pointer-events-none" style={{ borderColor: '#FED7AA' }} />
        <div className="absolute -left-10 bottom-20 w-44 h-44 rounded-full border-[14px] pointer-events-none" style={{ borderColor: '#FED7AA' }} />

        {/* ── Top content block ── */}
        <div className="relative z-10 w-full max-w-[25rem] mx-auto">

          {/* Logo row */}
          <div className="flex items-center gap-2 mb-8">
            {/* Heart circle – #F59E0B bg */}
            <div
              className="relative w-[4.75rem] h-[4.75rem] rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#F59E0B', boxShadow: '0 0 28px rgba(245,158,11,0.35)' }}
            >
              <div className="absolute inset-2 rounded-full border-2 border-white/60" />
              <Heart className="w-9 h-9 text-white" fill="white" />
            </div>
            {/* PSY + CARE wordmark */}
            <div
              className="flex items-center text-[2.8rem] font-black tracking-tight"
              style={{ letterSpacing: '-0.07em' }}
            >
              <span style={{ color: '#EA580C' }}>PSY</span>
              <span style={{ color: '#172554' }}>CARE</span>
            </div>
          </div>

          {/* Main heading */}
          <h1
            className="text-4xl leading-[1.08] font-bold mb-4"
            style={{ letterSpacing: '-0.035em', color: '#172554' }}
          >
            Your Mental Well-being<br />Our Priority
          </h1>
          {/* Orange underline */}
          <div className="w-14 h-1 rounded-full mb-4" style={{ background: '#F59E0B' }} />

          {/* Description */}
          <p className="text-base leading-relaxed max-w-[22rem]" style={{ color: '#172554' }}>
            PSYCARE is a digital platform designed to support students in understanding their potential, making informed career choices and building a brighter future through personalized career guidance and counselling.
          </p>

          {/* Two feature items – centred evenly */}
          <div className="flex justify-center gap-10 max-w-[24rem] mt-7">
            {[
              { icon: Users, text: 'Career Support' },
              { icon: ChartNoAxesColumnIncreasing, text: 'Personalized Recommendations & Counselling' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center text-center gap-2 flex-1">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                  style={{ background: '#F59E0B' }}
                >
                  <Icon className="w-5 h-5" style={{ color: '#172554' }} />
                </div>
                <span className="text-xs xl:text-sm font-medium leading-snug" style={{ color: '#9A3412' }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom tagline ── */}
        <div className="relative z-10 flex justify-center pb-1">
          <div
            className="relative text-[1.7rem] font-semibold italic tracking-tight"
            style={{ letterSpacing: '-0.035em', color: '#172554' }}
          >
            Better Minds&nbsp; Brighter Futures
            <span
              className="absolute -bottom-2 left-[29%] w-[55%] h-[2px] rounded-full -rotate-[5deg]"
              style={{ background: '#F59E0B' }}
            />
          </div>
        </div>
      </div>


      {/* Right login card */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-[#FFF7ED] pb-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] flex items-center justify-center shadow-sm">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-[#172554]">TATTI</p>
              <p className="text-xs text-[#64748B]">Student Management Portal</p>
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
                    className="mt-1.5 transition-colors"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #FED7AA',
                      color: '#172554',
                    }}
                    onFocus={e => { e.currentTarget.style.border = '1px solid #F59E0B'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.2)'; }}
                    onBlur={e => { e.currentTarget.style.border = '1px solid #FED7AA'; e.currentTarget.style.boxShadow = 'none'; }}
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
                      className="pr-10 transition-colors"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-orange-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => changeMode('forgot')}
                    className="text-sm text-primary hover:text-orange-600 hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-[#1D4ED8] hover:bg-orange-600 text-white font-semibold h-11 rounded-lg shadow-sm transition-all duration-150">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-5">
                New student?{' '}
                <button onClick={() => changeMode('signup')} className="text-[#1D4ED8] hover:text-orange-600 font-semibold hover:underline transition-colors">Sign Up</button>
              </p>
              <div className="mt-4">
                <div className="text-center text-xs text-muted-foreground mb-3">— OR —</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Link to="/admin/login">
                    <Button
                      variant="outline"
                      className="w-full text-xs font-medium transition-all duration-150 shadow-sm"
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
                      className="w-full text-xs font-medium transition-all duration-150 shadow-sm"
                      style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#172554' }}
                      onMouseEnter={e => { const b = e.currentTarget; b.style.background='#FFE0B2'; b.style.border='1px solid #F59E0B'; b.style.color='#9A3412'; }}
                      onMouseLeave={e => { const b = e.currentTarget; b.style.background='#FFF7ED'; b.style.border='1px solid #FED7AA'; b.style.color='#172554'; }}
                    >
                      Counsellor Portal
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="glass-card rounded-2xl p-6 md:p-8 animate-fade-in">
              {createdStudentId ? (
                /* Success banner with generated Student ID */
                <div className="space-y-5 text-center">
                  <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">Account Created!</h2>
                    <p className="text-sm text-muted-foreground">
                      Your official TATTI Student ID has been generated:
                    </p>
                  </div>

                  {/* Highlighted Student ID Card */}
                  <div className="p-4 bg-blue-50 border-2 border-dashed border-[#1D4ED8]/40 hover:border-orange-500/50 rounded-xl flex items-center justify-between transition-colors">
                    <div className="text-left">
                      <span className="text-[11px] font-semibold tracking-wider text-[#1D4ED8] uppercase block">Your Student ID</span>
                      <span className="text-xl font-bold text-[#0B1F3A] font-mono">{createdStudentId}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyStudentId}
                      className="flex items-center gap-1 text-xs border-[#1D4ED8]/30 text-[#1D4ED8] hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-colors"
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
                    className="w-full bg-[#1D4ED8] hover:bg-orange-600 text-white font-semibold h-11 rounded-lg shadow-sm transition-all duration-150"
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
                        I agree to the <span className="text-primary hover:text-orange-600 transition-colors">User Agreement</span> and <span className="text-primary hover:text-orange-600 transition-colors">Privacy Policy</span>
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#1D4ED8] hover:bg-orange-600 text-white font-semibold h-11 rounded-lg shadow-sm transition-all duration-150 mt-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                    </Button>
                  </form>
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Already have an account?{' '}
                    <button onClick={() => changeMode('login')} className="text-[#1D4ED8] hover:text-orange-600 font-semibold hover:underline transition-colors">Sign In</button>
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
                    className="mt-1.5 bg-input border-border hover:border-orange-400 focus:border-orange-500 focus:ring-orange-500 transition-colors"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-[#1D4ED8] hover:bg-orange-600 text-white font-semibold h-11 rounded-lg shadow-sm transition-all duration-150">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                </Button>
              </form>
              <button onClick={() => changeMode('login')} className="text-center text-sm text-[#1D4ED8] hover:text-orange-600 font-medium hover:underline transition-colors w-full mt-4">Back to Sign In</button>
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
              <button onClick={() => { changeMode('login'); }} className="text-sm text-primary hover:text-orange-600 hover:underline transition-colors">Back to Sign In</button>
            </div>
          )}
        </div>

      </div>
      </div>
    </div>
  );
}
