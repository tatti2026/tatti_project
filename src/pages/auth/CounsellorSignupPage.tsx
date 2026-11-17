import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, UserPlus, Loader2, CheckCircle2, Copy } from 'lucide-react';
import { API_BASE } from '@/lib/api';

export default function CounsellorSignupPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [qualification, setQualification] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [counsellorPublicId, setCounsellorPublicId] = useState('');
  const [isPendingApproval, setIsPendingApproval] = useState(true);

  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanQual = qualification.trim();
    const cleanSpec = specialization.trim();
    const numYears = parseInt(yearsOfExperience) || 0;

    if (!cleanName || !cleanEmail || !cleanPhone || !cleanQual || !cleanSpec || !password || !confirmPassword) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (!/^\d{10}$/.test(cleanPhone)) {
      toast.error('Phone number must be exactly 10 digits.');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const urls = [
        `${API_BASE}/auth/counsellor-signup`,
        'http://10.0.2.2:5000/api/auth/counsellor-signup',
        'http://localhost:5000/api/auth/counsellor-signup'
      ];
      let response = null;
      let data = null;

      for (const u of urls) {
        try {
          response = await fetch(u, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: cleanName,
              email: cleanEmail,
              phone: cleanPhone,
              qualification: cleanQual,
              specialization: cleanSpec,
              yearsOfExperience: numYears,
              password,
              confirmPassword,
            }),
          });
          data = await response.json();
          if (response.ok || response.status === 409 || response.status === 400) {
            break;
          }
        } catch {}
      }

      if (!response || !response.ok) {
        toast.error(data?.error || 'Failed to create counsellor account.');
        setLoading(false);
        return;
      }

      const genCounsellorId = data?.counsellorPublicId || data?.profile?.counsellor_public_id || '';
      setCounsellorPublicId(genCounsellorId);
      setIsPendingApproval(data?.approvalStatus === 'pending' || data?.requiresApproval !== false);
      setIsSuccess(true);
      toast.success(
        genCounsellorId
          ? `Registration submitted! Counsellor ID: ${genCounsellorId}`
          : 'Counsellor registration submitted successfully!'
      );
    } catch (err: any) {
      console.error('Counsellor signup request error:', err);
      toast.error('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF7ED] p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)' }}
        />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-2xl bg-white border border-[#FED7AA] p-1.5 shadow-sm flex items-center justify-center">
              <img
                src="/logo/psycare-logo.png"
                alt="PSYCARE Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#172554] mb-1">Create Counsellor Account</h1>
          <p className="text-[#64748B] text-sm">Join the PSY CARE team as a professional career counsellor</p>
        </div>

        <div className="glass-card rounded-2xl p-6 sm:p-8 bg-white border border-[#FED7AA] shadow-[0_4px_24px_rgba(245,158,11,0.06)]">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#FFEDD5] border border-[#FED7AA] text-orange-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-[#172554]">Registration Submitted!</h2>
              <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-semibold">
                Status: Pending Approval
              </div>
              <p className="text-sm text-[#64748B]">
                Your counsellor application for <strong>{email}</strong> has been received and is currently under review by management.
              </p>

              {counsellorPublicId && (
                <div className="p-4 bg-orange-50 border-2 border-dashed border-[#F59E0B]/50 rounded-xl flex items-center justify-between transition-colors">
                  <div className="text-left">
                    <span className="text-[11px] font-semibold tracking-wider text-orange-600 uppercase block">Assigned Counsellor ID</span>
                    <span className="text-xl font-bold text-[#172554] font-mono">{counsellorPublicId}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(counsellorPublicId);
                      toast.success('Counsellor ID copied to clipboard!');
                    }}
                    className="flex items-center gap-1 text-xs border-[#FED7AA] text-orange-600 hover:border-[#F59E0B] hover:bg-[#FFEDD5] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </Button>
                </div>
              )}

              <p className="text-xs text-[#64748B] leading-relaxed">
                Management will review your qualifications and specialization. Once approved, you will be able to sign in to the Counsellor Portal.
              </p>

              <Button
                type="button"
                onClick={() => navigate('/counsellor/login')}
                className="w-full text-white font-semibold h-11 rounded-lg shadow-sm transition-all duration-150 hover:bg-orange-600 cursor-pointer"
                style={{ background: '#0B1F3A' }}
              >
                Return to Counsellor Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Field 1: Full Name */}
              <div>
                <Label htmlFor="fullname" className="text-sm font-medium text-[#172554]">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullname"
                  type="text"
                  placeholder="e.g. Dr. Jane Smith"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="mt-1 bg-white border border-[#FED7AA] text-[#172554] focus:border-[#F59E0B] focus:ring-[#F59E0B]"
                  required
                />
              </div>

              {/* Field 2: Email Address */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-[#172554]">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="counsellor@domain.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1 bg-white border border-[#FED7AA] text-[#172554] focus:border-[#F59E0B] focus:ring-[#F59E0B]"
                  required
                />
              </div>

              {/* Field 3: Phone Number */}
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-[#172554]">
                  Phone Number (10 digits) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 bg-white border border-[#FED7AA] text-[#172554] focus:border-[#F59E0B] focus:ring-[#F59E0B]"
                  required
                />
              </div>

              {/* Field 4: Professional Qualification */}
              <div>
                <Label htmlFor="qualification" className="text-sm font-medium text-[#172554]">
                  Professional Qualification <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="qualification"
                  type="text"
                  placeholder="e.g. M.Sc. Clinical Psychology, M.Phil, Ph.D."
                  value={qualification}
                  onChange={e => setQualification(e.target.value)}
                  className="mt-1 bg-white border border-[#FED7AA] text-[#172554] focus:border-[#F59E0B] focus:ring-[#F59E0B]"
                  required
                />
              </div>

              {/* Field 5: Specialization */}
              <div>
                <Label htmlFor="specialization" className="text-sm font-medium text-[#172554]">
                  Specialization <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="specialization"
                  type="text"
                  placeholder="e.g. Career Counselling, Adolescent Psychology"
                  value={specialization}
                  onChange={e => setSpecialization(e.target.value)}
                  className="mt-1 bg-white border border-[#FED7AA] text-[#172554] focus:border-[#F59E0B] focus:ring-[#F59E0B]"
                  required
                />
              </div>

              {/* Field 6: Years of Experience */}
              <div>
                <Label htmlFor="experience" className="text-sm font-medium text-[#172554]">
                  Years of Experience
                </Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  max="50"
                  placeholder="e.g. 5"
                  value={yearsOfExperience}
                  onChange={e => setYearsOfExperience(e.target.value)}
                  className="mt-1 bg-white border border-[#FED7AA] text-[#172554] focus:border-[#F59E0B] focus:ring-[#F59E0B]"
                />
              </div>

              {/* Field 7: Password */}
              <div>
                <Label htmlFor="pw" className="text-sm font-medium text-[#172554]">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="pw"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="bg-white border border-[#FED7AA] text-[#172554] pr-10 focus:border-[#F59E0B] focus:ring-[#F59E0B]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#172554]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Field 8: Confirm Password */}
              <div>
                <Label htmlFor="cpw" className="text-sm font-medium text-[#172554]">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="cpw"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="bg-white border border-[#FED7AA] text-[#172554] pr-10 focus:border-[#F59E0B] focus:ring-[#F59E0B]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#172554]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-2 text-white font-semibold h-11 transition-all duration-150 hover:bg-orange-600 shadow-sm hover:shadow-md cursor-pointer"
                style={{ background: '#0B1F3A', border: 'none' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Register as Counsellor
              </Button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-[#FED7AA] text-center text-sm text-[#64748B]">
            Already have a counsellor account?{' '}
            <Link
              to="/counsellor/login"
              className="font-semibold text-orange-600 hover:text-orange-700 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-[#64748B] mt-6">
          <Link to="/login" className="hover:underline text-orange-600 hover:text-orange-700 transition-colors font-medium">
            Student Portal
          </Link>
        </p>
      </div>
    </div>
  );
}
