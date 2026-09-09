import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentByProfileId, createStudent } from '@/lib/api';
import StudentLayout from '@/components/layouts/StudentLayout';
import StatusBadge from '@/components/common/StatusBadge';
import type { Student } from '@/types/index';
import { Award, CheckCircle2, Circle, Clock } from 'lucide-react';

const STATUS_STEPS = [
  { key: 'not_applied', label: 'Not Applied', desc: 'Begin your application journey' },
  { key: 'application_submitted', label: 'Application Submitted', desc: 'Your application has been received' },
  { key: 'under_review', label: 'Under Review', desc: 'Our team is reviewing your application' },
  { key: 'counselling_pending', label: 'Counselling Pending', desc: 'Awaiting counselling session' },
  { key: 'counselling_completed', label: 'Counselling Completed', desc: 'Counselling session done' },
  { key: 'selected', label: 'Selected', desc: 'Congratulations! You have been selected' },
  { key: 'admission_confirmed', label: 'Admission Confirmed', desc: 'Your admission is confirmed' },
];

export default function AdmissionStatus() {
  const { profile } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      let s = await getStudentByProfileId(profile.id);
      if (!s) s = await createStudent({ profile_id: profile.id, email: profile.email });
      setStudent(s);
      setLoading(false);
    })();
  }, [profile]);

  const currentIdx = STATUS_STEPS.findIndex(s => s.key === (student?.admission_status || 'not_applied'));

  if (loading) return (
    <StudentLayout>
      <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
    </StudentLayout>
  );

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground mb-1">Admission Status</h1>
          <p className="text-muted-foreground text-sm">Track your admission journey</p>
        </div>

        {/* Current Status */}
        <div className="glass-card rounded-xl p-8 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
            student?.admission_status === 'admission_confirmed' ? 'bg-success/20' :
            student?.admission_status === 'not_selected' ? 'bg-destructive/20' :
            'bg-primary/20'
          }`}>
            <Award className={`w-10 h-10 ${
              student?.admission_status === 'admission_confirmed' ? 'text-success' :
              student?.admission_status === 'not_selected' ? 'text-destructive' :
              'text-primary'
            }`} />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {STATUS_STEPS.find(s => s.key === student?.admission_status)?.label || 'Not Applied'}
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            {STATUS_STEPS.find(s => s.key === student?.admission_status)?.desc || 'Begin your application journey'}
          </p>
          <StatusBadge status={student?.admission_status || 'not_applied'} className="text-sm px-4 py-1.5" />
        </div>

        {/* Timeline */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Application Timeline</h2>
          <div className="space-y-0">
            {STATUS_STEPS.filter(s => s.key !== 'not_applied' && s.key !== 'not_selected').map((statusStep, idx, arr) => {
              const done = currentIdx > STATUS_STEPS.findIndex(s => s.key === statusStep.key);
              const active = statusStep.key === student?.admission_status;
              return (
                <div key={statusStep.key} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      done ? 'bg-primary border-primary' :
                      active ? 'border-primary bg-primary/10' :
                      'border-border bg-muted'
                    }`}>
                      {done ? <CheckCircle2 className="w-4 h-4 text-white" /> :
                       active ? <Clock className="w-4 h-4 text-primary animate-pulse" /> :
                       <Circle className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    {idx < arr.length - 1 && <div className={`w-0.5 h-8 ${done ? 'bg-primary' : 'bg-border'}`} />}
                  </div>
                  <div className="pb-6">
                    <p className={`text-sm font-semibold ${done || active ? 'text-foreground' : 'text-muted-foreground'}`}>{statusStep.label}</p>
                    <p className="text-xs text-muted-foreground">{statusStep.desc}</p>
                    {active && <span className="text-xs text-primary font-medium">← Current Status</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
