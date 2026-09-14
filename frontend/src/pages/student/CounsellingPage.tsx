import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentByProfileId, createStudent, getStudentCounselling } from '@/lib/api';
import StudentLayout from '@/components/layouts/StudentLayout';
import StatusBadge from '@/components/common/StatusBadge';
import type { Student, Counselling } from '@/types/index';
import { Phone, Calendar, Clock, User, MapPin, FileText, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';

export default function CounsellingPage() {
  const { profile } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [counselling, setCounselling] = useState<Counselling | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      let s = await getStudentByProfileId(profile.id);
      if (!s) s = await createStudent({ profile_id: profile.id, email: profile.email });
      setStudent(s);
      if (s) {
        const c = await getStudentCounselling(s.id);
        setCounselling(c);
      }
      setLoading(false);
    })();
  }, [profile]);

  const timeline = [
    { label: 'Application Submitted', done: !!student && student.application_status !== 'not_started' },
    { label: 'Payment Completed', done: !!student && student.payment_status === 'paid' },
    { label: 'Counselling Scheduled', done: counselling?.status === 'scheduled' || counselling?.status === 'completed' || counselling?.status === 'selected' },
    { label: 'Counselling Completed', done: counselling?.status === 'completed' || counselling?.status === 'selected' },
    { label: 'Result Announced', done: counselling?.status === 'selected' },
  ];

  if (loading) return (
    <StudentLayout>
      <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
    </StudentLayout>
  );

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground mb-1">Counselling</h1>
          <p className="text-muted-foreground text-sm">Track your counselling schedule and status</p>
        </div>

        {/* Status Card */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Counselling Status</h2>
            <StatusBadge status={counselling?.status || 'not_scheduled'} />
          </div>

          {counselling?.status === 'scheduled' && counselling.scheduled_date ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { icon: Calendar, label: 'Date', value: format(new Date(counselling.scheduled_date), 'dd MMM yyyy') },
                  { icon: Clock, label: 'Time', value: counselling.scheduled_time || 'TBD' },
                  { icon: User, label: 'Counsellor', value: counselling.counsellor_name || 'TBD' },
                  { icon: MapPin, label: 'Mode', value: counselling.mode || 'Online' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-muted rounded-lg p-3 flex items-center gap-3">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold text-foreground">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {counselling.venue_or_link && (
                <div className="bg-muted rounded-lg p-3 flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Venue / Meeting Link</p>
                    <p className="text-sm font-medium text-foreground break-all">{counselling.venue_or_link}</p>
                  </div>
                </div>
              )}
              {counselling.instructions && (
                <div className="bg-primary/10 rounded-lg p-3 flex items-start gap-3 border border-primary/20">
                  <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-primary font-semibold mb-1">Instructions</p>
                    <p className="text-sm text-muted-foreground">{counselling.instructions}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Phone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">
                {counselling?.status === 'not_scheduled' || !counselling
                  ? 'Counselling Not Yet Scheduled'
                  : `Counselling Status: ${counselling.status}`}
              </p>
              <p className="text-muted-foreground text-sm">
                {student?.payment_status !== 'paid'
                  ? 'Complete your payment to proceed to counselling.'
                  : 'Your counselling will be scheduled by the admin team. Please check back soon.'}
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Counselling Timeline</h2>
          <div className="space-y-0">
            {timeline.map(({ label, done }, idx) => (
              <div key={label} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${done ? 'bg-primary border-primary' : 'border-border bg-muted'}`}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                  {idx < timeline.length - 1 && <div className={`w-0.5 h-8 ${done ? 'bg-primary' : 'bg-border'}`} />}
                </div>
                <div className="pb-6">
                  <p className={`text-sm font-medium ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
