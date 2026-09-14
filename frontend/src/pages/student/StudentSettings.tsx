import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StudentLayout from '@/components/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Bell, Lock, Shield, User, Save } from 'lucide-react';

export default function StudentSettings() {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [counsellingReminders, setCounsellingReminders] = useState(true);

  const handleSaveNotifications = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Notification preferences updated!');
    }, 600);
  };

  return (
    <StudentLayout>
      <div className="max-w-3xl space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground mb-1">Account Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your preferences, security settings, and communication options.</p>
        </div>

        {/* Profile overview card */}
        <Card className="glass-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Account Information</CardTitle>
            </div>
            <CardDescription className="text-xs">Your registered account details at TATTI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <Input value={profile?.full_name || 'Student'} disabled className="bg-muted text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email Address</Label>
                <Input value={profile?.email || ''} disabled className="bg-muted text-sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications card */}
        <Card className="glass-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Notification Preferences</CardTitle>
            </div>
            <CardDescription className="text-xs">Select how you want to receive entrance exam and admission alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Receive assessment results, course offers, and receipts via email.</p>
              </div>
              <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">SMS & WhatsApp Alerts</p>
                <p className="text-xs text-muted-foreground">Instant updates for counselling dates and document verification.</p>
              </div>
              <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Counselling Reminders</p>
                <p className="text-xs text-muted-foreground">Automated reminders 24 hours before your scheduled counselling slot.</p>
              </div>
              <Switch checked={counsellingReminders} onCheckedChange={setCounsellingReminders} />
            </div>

            <Button onClick={handleSaveNotifications} disabled={saving} size="sm" className="gradient-bg border-0 text-white mt-2">
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Preferences
            </Button>
          </CardContent>
        </Card>

        {/* Security / password card */}
        <Card className="glass-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Security & Password</CardTitle>
            </div>
            <CardDescription className="text-xs">Keep your account secure with updated credentials.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Current Password</Label>
                <Input type="password" placeholder="••••••••" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">New Password</Label>
                <Input type="password" placeholder="••••••••" className="text-sm" />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.info('Password update requires re-authentication.')}>
              Update Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
