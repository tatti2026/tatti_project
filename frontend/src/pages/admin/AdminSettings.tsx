import AdminLayout from '@/components/layouts/AdminLayout';
import { Settings as SettingsIcon } from 'lucide-react';

export default function AdminSettings() {
  return (
    <AdminLayout>
      <div className="max-w-lg space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm">General portal configuration</p>
        </div>
        <div className="glass-card rounded-xl p-12 text-center">
          <SettingsIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">Settings Panel</p>
          <p className="text-muted-foreground text-sm mt-1">Configuration options will be available here.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
