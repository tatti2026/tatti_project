import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentByProfileId, getStudentAssessment, getStudentApplication, getStudentPayment } from '@/lib/api';
import StudentLayout from '@/components/layouts/StudentLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Student, Assessment, Application, Payment } from '@/types/index';
import {
  ClipboardList, BookOpen, FileText,
  CheckCircle2, Circle, ArrowRight, UserCheck, Lock, Unlock, ShieldCheck
} from 'lucide-react';
import { getApplicationAccess, isApplicationUnlocked } from '@/services/applicationAccessService';

const journeySteps = [
  { key: 'registration', label: 'Registration', icon: UserCheck },
  { key: 'assessment', label: 'Career Fit Assessment', icon: ClipboardList },
  { key: 'recommendation', label: 'Course Select', icon: BookOpen },
  { key: 'application_access', label: 'App Access', icon: Lock },
  { key: 'application', label: 'Application', icon: FileText },
  { key: 'payment', label: 'Payment', icon: FileText },
];

export default function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const s = await getStudentByProfileId(profile.id);
      setStudent(s);
      if (s) {
        const [a, app, pay] = await Promise.all([
          getStudentAssessment(s.id),
          getStudentApplication(s.id),
          getStudentPayment(s.id),
        ]);
        setAssessment(a);
        setApplication(app);
        setPayment(pay);
      }
      setLoading(false);
    })();
  }, [profile]);

  const isUnlocked = student ? isApplicationUnlocked(student.id) : false;

  const getJourneyStep = () => {
    if (!student) return 0;
    if (student.payment_status === 'paid') return 5;
    if (student.application_status === 'submitted') return 4;
    if (isUnlocked) return 3;
    if (student.assessment_status === 'completed') return 2;
    if (student.assessment_status === 'in_progress') return 1;
    return 0;
  };

  const currentStep = getJourneyStep();
  const progress = Math.round((currentStep / 5) * 100);

  const kpiCards = [
    {
      label: 'Career Fit Assessment',
      status: student?.assessment_status || 'not_started',
      icon: ClipboardList,
      action: () => navigate('/student/assessment'),
      actionLabel: 'Take Career Fit Assessment',
    },
    {
      label: 'Application Access',
      status: isUnlocked ? 'unlocked' : 'locked',
      icon: isUnlocked ? Unlock : Lock,
      action: () => navigate('/student/application'),
      actionLabel: isUnlocked ? 'Start Application' : 'View Access Status',
      isAccessCard: true,
    },
    {
      label: 'Application Status',
      status: student?.application_status || 'not_started',
      icon: FileText,
      action: () => navigate('/student/application'),
      actionLabel: 'View Application',
    },
    {
      label: 'Payment Status',
      status: student?.payment_status || 'unpaid',
      icon: FileText,
      action: () => navigate('/student/application'),
      actionLabel: 'Make Payment',
    },
  ];

  if (loading) {
    return (
      <StudentLayout>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome */}
        <div className="bg-white border border-[#E4E7EC] rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#172033] mb-1">
                Welcome back, {profile?.full_name || profile?.email?.split('@')[0] || 'Student'}!
              </h1>
              <p className="text-[#667085] text-sm">Track your TAT Entrance Exam and admission journey.</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-[#667085] mb-1 font-medium">Overall Progress</p>
              <p className="text-2xl font-bold text-[#1D4ED8]">{progress}%</p>
            </div>
          </div>
          <Progress value={progress} className="mt-4 h-2 bg-slate-100" />
        </div>

        {/* Journey Roadmap */}
        <div className="bg-white border border-[#E4E7EC] rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#172033] mb-5 tracking-tight">Admission Milestones</h2>
          <div className="overflow-x-auto">
            <div className="flex items-center gap-0 min-w-max pb-2">
              {journeySteps.map((step, idx) => {
                const done = idx < currentStep;
                const active = idx === currentStep;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                        done ? 'bg-emerald-600 border-emerald-600 text-white' :
                        active ? 'bg-blue-50 border-[#1D4ED8] text-[#1D4ED8]' :
                        'bg-slate-50 border-[#E4E7EC] text-slate-400'
                      }`}>
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : (
                          <Icon className={`w-4 h-4 ${active ? 'text-[#1D4ED8]' : 'text-slate-400'}`} />
                        )}
                      </div>
                      <span className={`text-[11px] font-medium whitespace-nowrap ${
                        done || active ? 'text-[#172033]' : 'text-[#667085]'
                      }`}>{step.label}</span>
                      {active && <div className="w-1.5 h-1.5 bg-[#1D4ED8] rounded-full animate-pulse" />}
                    </div>
                    {idx < journeySteps.length - 1 && (
                      <div className={`w-10 h-0.5 mx-1 mb-5 ${idx < currentStep ? 'bg-emerald-600' : 'bg-[#E4E7EC]'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {kpiCards.map(({ label, status, icon: Icon, action, actionLabel }) => (
            <div key={label} className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-sm hover:border-[#D0D5DD] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <StatusBadge status={status} />
              </div>
              <p className="text-sm font-semibold text-[#172033] mb-3">{label}</p>
              <button onClick={action} className="text-xs text-[#1D4ED8] font-medium hover:underline flex items-center gap-1">
                {actionLabel} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-[#E4E7EC] rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#172033] mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {student?.assessment_status !== 'completed' && (
              <Button onClick={() => navigate('/student/assessment')} size="sm" className="bg-[#1D4ED8] hover:bg-[#1e40af] text-white border-0 shadow-sm">
                <ClipboardList className="w-4 h-4 mr-2" /> Take Assessment
              </Button>
            )}
            {student?.assessment_status === 'completed' && student?.application_status === 'not_started' && (
              <Button onClick={() => navigate('/student/application')} size="sm" className="bg-[#1D4ED8] hover:bg-[#1e40af] text-white border-0 shadow-sm">
                <FileText className="w-4 h-4 mr-2" /> Start Application
              </Button>
            )}
            {student?.assessment_status === 'completed' && (
              <Button
                onClick={() => navigate('/student/assessment')}
                variant="outline"
                size="sm"
                className="border-[#E4E7EC] text-[#344054] hover:bg-[#F8FAFC]"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                View Course Recommendations
              </Button>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
