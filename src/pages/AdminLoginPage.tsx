import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, Shield, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role === 'admin') navigate('/admin/dashboard', { replace: true });
  }, [user, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) toast.error('Invalid admin credentials');
    else {
      // Role check after login
      setTimeout(() => {
        if (role && role !== 'admin') {
          toast.error('Access denied. Admin credentials required.');
        }
      }, 1000);
    }
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="admin-remember" />
                <Label htmlFor="admin-remember" className="text-sm text-muted-foreground cursor-pointer">Remember me</Label>
              </div>
              <button type="button" className="text-sm text-primary hover:underline">Forgot Password?</button>
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
    </div>
  );
}
