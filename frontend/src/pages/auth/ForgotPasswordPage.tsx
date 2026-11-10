import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Users,
  ChartNoAxesColumnIncreasing,
  GraduationCap,
  Loader2,
  Mail,
  ArrowLeft,
  RefreshCw,
  Shield,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role'); // 'student' | 'admin' | 'counsellor' | null

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [lastSubmittedEmail, setLastSubmittedEmail] = useState('');
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendSuccessMessage, setResendSuccessMessage] = useState<string | null>(null);

  const { sendPasswordResetEmail } = useAuth();

  // Cooldown countdown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Determine back-to-login path and portal title according to role query param
  const getPortalInfo = () => {
    switch (roleParam) {
      case 'counsellor':
        return {
          title: 'Counsellor Password Recovery',
          subtitle: 'Enter your registered counsellor email to receive a secure password reset link.',
          inputLabel: 'Counsellor Email Address',
          placeholder: 'counsellor@tatti.edu.in',
          loginPath: '/counsellor/login',
          loginLabel: 'Back to Counsellor Sign In',
          badgeText: 'Counsellor Portal',
          icon: UserCheck,
        };
      case 'student':
      default:
        return {
          title: 'Forgot Your Password?',
          subtitle: "Enter your registered email address or Student ID and we'll send you a link to reset your password.",
          inputLabel: 'Student Email or Student ID',
          placeholder: 'Enter your email or Student ID',
          loginPath: '/login',
          loginLabel: 'Back to Student Sign In',
          badgeText: 'Student Portal',
          icon: GraduationCap,
        };
    }
  };

  const portal = getPortalInfo();
  const PortalIcon = portal.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResendSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error('Please enter your registered email address or Student ID.');
      return;
    }

    setLoading(true);
    const res = await sendPasswordResetEmail(cleanEmail);
    setLoading(false);

    if (res.error) {
      setErrorMessage(res.error.message);
      toast.error(res.error.message);
      // Keep user on the form so they can correct their email or see the configuration notice
      return;
    }

    setLastSubmittedEmail(cleanEmail);
    setDevResetUrl(res.devResetUrl || null);
    setPreviewUrl(res.previewUrl || null);
    setSubmitted(true);
    setCooldown(60); // 60s cooldown to prevent rapid spamming
    toast.success(res.message || 'Password reset link dispatched.');
  };

  const handleResend = async () => {
    if (resending || cooldown > 0 || !lastSubmittedEmail) return;

    setResending(true);
    setErrorMessage(null);
    setResendSuccessMessage(null);

    const res = await sendPasswordResetEmail(lastSubmittedEmail);
    setResending(false);

    if (res.error) {
      setErrorMessage(res.error.message);
      toast.error(res.error.message);
      return;
    }

    if (res.devResetUrl) setDevResetUrl(res.devResetUrl);
    if (res.previewUrl) setPreviewUrl(res.previewUrl);
    setCooldown(60);
    setResendSuccessMessage(res.message || 'A fresh password reset link has been dispatched to your email.');
    toast.success('Reset email resent successfully!');
  };

  const handleTryAnotherEmail = () => {
    setSubmitted(false);
    setEmail('');
    setDevResetUrl(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    setResendSuccessMessage(null);
    setCooldown(0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF0E8]">
      {/* Main content row */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left branding panel – light orange theme ── */}
        <div
          className="hidden md:flex flex-col justify-between w-[54%] relative overflow-hidden px-8 xl:px-16 py-8"
          style={{ background: 'linear-gradient(145deg, #FFF0E8 0%, #FFE0CC 60%, #FFD9C8 100%)' }}
        >
          {/* Soft dotted pattern + soft warm blobs */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #F0D6C8 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />
          {/* Decorative circles – soft orange */}
          <div
            className="absolute -left-20 bottom-12 w-64 h-64 rounded-full border-[24px] pointer-events-none"
            style={{ borderColor: '#F0D6C8' }}
          />
          <div
            className="absolute -left-10 bottom-20 w-44 h-44 rounded-full border-[14px] pointer-events-none"
            style={{ borderColor: '#F0D6C8' }}
          />

          {/* Top content block */}
          <div className="relative z-10 w-full max-w-[25rem] mx-auto">
            {/* Logo row */}
            <div className="flex items-center gap-3 mb-8">
              <img
                src="/logo/psycare-logo.png"
                alt="PSYCARE Official Logo"
                className="w-16 h-16 md:w-[4.75rem] md:h-[4.75rem] object-contain shrink-0 drop-shadow-sm select-none"
              />
              <div
                className="flex items-center text-[2.8rem] font-black tracking-tight select-none"
                style={{ letterSpacing: '-0.07em' }}
              >
                <span style={{ color: '#2878C8' }}>PSY</span>
                <span style={{ color: '#25364B' }}>CARE</span>
              </div>
            </div>

            {/* Main heading */}
            <h1
              className="text-4xl leading-[1.08] font-bold mb-4"
              style={{ letterSpacing: '-0.035em', color: '#25364B' }}
            >
              Your Mental Well-being<br />Our Priority
            </h1>
            {/* Orange underline */}
            <div className="w-14 h-1 rounded-full mb-4" style={{ background: '#2878C8' }} />

            {/* Description */}
            <p className="text-base leading-relaxed max-w-[22rem]" style={{ color: '#25364B' }}>
              PSYCARE is a digital platform designed to support students in understanding their potential,
              making informed career choices and building a brighter future through personalized career guidance and counselling.
            </p>

            {/* Feature badges */}
            <div className="flex justify-center gap-10 max-w-[24rem] mt-7">
              {[
                { icon: Users, text: 'Career Support' },
                { icon: ChartNoAxesColumnIncreasing, text: 'Personalized Recommendations & Counselling' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center text-center gap-2 flex-1">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                    style={{ background: '#2878C8' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: '#25364B' }} />
                  </div>
                  <span className="text-xs xl:text-sm font-medium leading-snug" style={{ color: '#1D6AB8' }}>
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom tagline */}
          <div className="relative z-10 flex justify-center pb-1">
            <div
              className="relative text-[1.7rem] font-semibold italic tracking-tight"
              style={{ letterSpacing: '-0.035em', color: '#25364B' }}
            >
              Better Minds&nbsp; Brighter Futures
              <span
                className="absolute -bottom-2 left-[29%] w-[55%] h-[2px] rounded-full -rotate-[5deg]"
                style={{ background: '#2878C8' }}
              />
            </div>
          </div>
        </div>

        {/* ── Right interactive panel ── */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-[#FFF0E8]">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-6 md:hidden">
              <img
                src="/logo/psycare-logo.png"
                alt="PSYCARE Logo"
                className="w-11 h-11 object-contain shrink-0"
              />
              <div>
                <p className="font-bold text-[#25364B] text-base leading-tight">PSY CARE</p>
                <p className="text-xs text-[#64748B] leading-tight">Mental Well-being & Career Portal</p>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-white border border-[#F0D6C8] rounded-2xl p-6 md:p-8 shadow-[0_4px_24px_rgba(245,158,11,0.06)] animate-fade-in">
              {!submitted ? (
                <>
                  {/* Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFD9C8]/60 text-[#1D6AB8] border border-[#F0D6C8] mb-4">
                    <PortalIcon className="w-3.5 h-3.5" />
                    <span>{portal.badgeText}</span>
                  </div>

                  <h2 className="text-2xl font-bold text-[#25364B] mb-1">{portal.title}</h2>
                  <p className="text-[#64748B] text-sm mb-6 leading-relaxed">
                    {portal.subtitle}
                  </p>

                  {/* Error banner if previous submission failed */}
                  {errorMessage && (
                    <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="leading-snug">{errorMessage}</div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                    <div>
                      <Label htmlFor="forgot-email" className="text-sm font-medium text-[#25364B]">
                        {portal.inputLabel}
                      </Label>
                      <Input
                        id="forgot-email"
                        name="psycare_forgot_identifier"
                        type="text"
                        autoComplete="email"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        placeholder={portal.placeholder}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="mt-1.5 bg-white border-[#F0D6C8] text-[#25364B] hover:border-[#2878C8] focus:border-[#2878C8] focus:ring-[#2878C8] h-11 transition-colors"
                        onFocus={e => {
                          e.currentTarget.style.border = '1px solid #2878C8';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.2)';
                        }}
                        onBlur={e => {
                          e.currentTarget.style.border = '1px solid #F0D6C8';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                      <p className="text-[11px] text-[#64748B] mt-1.5">
                        We will send a secure, single-use reset link valid for 1 hour.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#2878C8] hover:bg-[#1D6AB8] text-white font-semibold h-11 rounded-lg shadow-sm transition-all duration-150 mt-2"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending Reset Link…
                        </span>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 pt-5 border-t border-[#F0D6C8]/60 text-center">
                    <Link
                      to={portal.loginPath}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2878C8] hover:text-[#1D6AB8] transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {portal.loginLabel}
                    </Link>
                  </div>
                </>
              ) : (
                /* ── Check Your Email View ── */
                <div className="py-2 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#E8F1FB] border border-[#BFDBFE] flex items-center justify-center mx-auto text-[#2878C8] shadow-sm">
                    <Mail className="w-8 h-8" />
                  </div>

                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-[#25364B] mb-2">Check Your Email</h2>
                    <p className="text-sm text-[#475569] leading-relaxed">
                      If an account is associated with{' '}
                      <span className="font-semibold text-[#25364B] font-mono break-all">
                        {lastSubmittedEmail}
                      </span>
                      , a password reset link has been dispatched.
                    </p>
                  </div>

                  {/* Resend success notice */}
                  {resendSuccessMessage && (
                    <div className="p-3 bg-[#E8F1FB] border border-[#BFDBFE] rounded-xl text-[#2878C8] text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2878C8]" />
                      <span>{resendSuccessMessage}</span>
                    </div>
                  )}

                  {/* Resend error banner */}
                  {errorMessage && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="leading-snug">{errorMessage}</div>
                    </div>
                  )}

                  {/* Development / Test helper if no live SMTP */}
                  {devResetUrl && (
                    <div className="p-4 bg-[#FFF0E8] border border-[#F0D6C8] rounded-xl text-left text-xs text-[#25364B] leading-relaxed shadow-sm">
                      <div className="flex items-center gap-1.5 font-bold text-[#25364B] mb-1">
                        <span className="w-2 h-2 rounded-full bg-[#2878C8] animate-pulse"></span>
                        Development Test Mode Active
                      </div>
                      <p className="text-[11px] text-[#667085] mb-3">
                        Live SMTP credentials are not set in <code className="bg-[#FFD9C8]/50 px-1 py-0.5 rounded font-mono">.env</code>. Your reset link was generated and captured locally for instant testing:
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <a
                          href={devResetUrl}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#2878C8] hover:bg-[#1D6AB8] text-white shadow-sm transition"
                        >
                          <span>Reset Password Now</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                        {previewUrl && (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#BFDBFE] text-[#2878C8] bg-white hover:bg-[#E8F1FB] transition"
                          >
                            <span>Preview Test Email</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 bg-[#FFF0E8] border border-[#F0D6C8] rounded-xl text-left text-xs text-[#1D6AB8] leading-relaxed">
                    <p className="font-semibold mb-1">What to do next:</p>
                    <ul className="list-disc list-inside space-y-1 text-[#667085]">
                      <li>Open your email and click the <strong>Reset Password</strong> button.</li>
                      <li>The link will expire in <strong>1 hour</strong> and can only be used once.</li>
                      <li>Check your spam or junk folder if the message does not appear in a few minutes.</li>
                    </ul>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    {/* Primary action: Resend Email Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResend}
                      disabled={resending || cooldown > 0}
                      className="w-full h-11 border-[#F0D6C8] hover:border-[#2878C8] hover:bg-[#E8F1FB] text-[#25364B] font-semibold transition-all duration-150"
                    >
                      {resending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#2878C8]" />
                          Sending New Reset Link…
                        </span>
                      ) : cooldown > 0 ? (
                        <span className="flex items-center gap-1.5 text-[#64748B]">
                          <RefreshCw className="w-3.5 h-3.5" />
                          Resend Reset Email in {cooldown}s
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-[#2878C8]" />
                          Resend Reset Email
                        </span>
                      )}
                    </Button>

                    {/* Secondary action: Enter another email address */}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleTryAnotherEmail}
                      className="w-full text-xs text-[#64748B] hover:text-[#1D6AB8] hover:bg-[#E8F1FB] transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                      Try another email address
                    </Button>

                    {/* Tertiary action: Return to sign in */}
                    <Button
                      asChild
                      className="w-full bg-[#2878C8] hover:bg-[#1D6AB8] text-white font-semibold h-11 rounded-lg shadow-sm transition-all duration-150"
                    >
                      <Link to={portal.loginPath}>
                        Return to Sign In
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Portal Switcher Navigation */}
            <div className="mt-6 text-center text-xs text-[#64748B] space-x-2">
              <Link to="/login" className="hover:text-[#1D6AB8] hover:underline transition-colors">
                Student Portal
              </Link>
              <span>·</span>
              <Link to="/counsellor/login" className="hover:text-[#1D6AB8] hover:underline transition-colors">
                Counsellor Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


