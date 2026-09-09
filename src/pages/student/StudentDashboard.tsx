import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentByProfileId, getStudentAssessment, getStudentApplication, getStudentPayment, getStudentCounselling } from '@/lib/api';
import StudentLayout from '@/components/layouts/StudentLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Student, Assessment, Application, Payment, Counselling } from '@/types/index';
import {
  ClipboardList, BookOpen, FileText, Phone, Award,
  CheckCircle2, Circle, ArrowRight, UserCheck
} from 'lucide-react';

const journeySteps = [
  { key: 'registration', label: 'Registration', icon: UserCheck },
  { key: 'assessment', label: 'Assessment', icon: ClipboardList },
  { key: 'recommendation', label: 'Recommendation', icon: BookOpen },
  { key: 'application', label: 'Application', icon: FileText },
  { key: 'payment', label: 'Payment', icon: FileText },
  { key: 'counselling', label: 'Counselling', icon: Phone },
  { key: 'admission', label: 'Admission', icon: Award },
];

export default function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [counselling, setCounselling] = useState<Counselling | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const s = await getStudentByProfileId(profile.id);
      setStudent(s);
      if (s) {
        const [a, app, pay, cou] = await Promise.all([
          getStudentAssessment(s.id),
          getStudentApplication(s.id),
          getStudentPayment(s.id),
          getStudentCounselling(s.id),
        ]);
        setAssessment(a);
        setApplication(app);
        setPayment(pay);
        setCounselling(cou);
      }
      setLoading(false);
    })();
  }, [profile]);

  const getJourneyStep = () => {
    if (!student) return 0;
    if (student.admission_status === 'admission_confirmed') return 6;
    if (student.counselling_status === 'completed' || student.counselling_status === 'selected') return 5;
    if (student.counselling_status === 'scheduled') return 5;
    if (student.payment_status === 'paid') return 4;
    if (student.application_status === 'submitted' || student.application_status === 'in_progress') return 3;
    if (student.assessment_status === 'completed') return 2;
    if (student.assessment_status === 'in_progress') return 1;
    return 0;
  };

  const currentStep = getJourneyStep();
  const progress = Math.round((currentStep / 6) * 100);

  const kpiCards = [
    {
      label: 'Assessment Status',
      status: student?.assessment_status || 'not_started',
      icon: ClipboardList,
      action: () => navigate('/student/assessment'),
      actionLabel: 'Take Assessment',
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
    {
      label: 'Counselling Status',
      status: student?.counselling_status || 'not_scheduled',
      icon: Phone,
      action: () => navigate('/student/counselling'),
      actionLabel: 'View Details',
    },
    {
      label: 'Admission Status',
      status: student?.admission_status || 'not_applied',
      icon: Award,
      action: () => navigate('/student/admission'),
      actionLabel: 'View Status',
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
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1">
                Welcome back, {profile?.full_name || profile?.email?.split('@')[0] || 'Student'}!
              </h1>
              <p className="text-muted-foreground text-sm">Track your TAT Entrance Exam and admission journey.</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground mb-1">Overall Progress</p>
              <p className="text-2xl font-bold gradient-text">{progress}%</p>
            </div>
          </div>
          <Progress value={progress} className="mt-4 h-2" />
        </div>

        {/* Journey Roadmap */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Admission Journey</h2>
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
                        done ? 'bg-primary border-primary' :
                        active ? 'bg-primary/20 border-primary' :
                        'bg-muted border-border'
                      }`}>
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : (
                          <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                        )}
                      </div>
                      <span className={`text-[10px] font-medium whitespace-nowrap ${
                        done || active ? 'text-foreground' : 'text-muted-foreground'
                      }`}>{step.label}</span>
                      {active && <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />}
                    </div>
                    {idx < journeySteps.length - 1 && (
                      <div className={`w-8 h-0.5 mx-1 mb-5 ${idx < currentStep ? 'bg-primary' : 'bg-border'}`} />
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
            <div key={label} className="kpi-card">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <StatusBadge status={status} />
              </div>
              <p className="text-sm font-medium text-foreground mb-3">{label}</p>
              <button onClick={action} className="text-xs text-primary hover:underline flex items-center gap-1">
                {actionLabel} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {student?.assessment_status !== 'completed' && (
              <Button onClick={() => navigate('/student/assessment')} size="sm" className="gradient-bg border-0 text-white">
                <ClipboardList className="w-4 h-4 mr-2" /> Take Assessment
              </Button>
            )}
            {student?.assessment_status === 'completed' && student?.application_status === 'not_started' && (
              <Button onClick={() => navigate('/student/application')} size="sm" className="gradient-bg border-0 text-white">
                <FileText className="w-4 h-4 mr-2" /> Start Application
              </Button>
            )}
            <Button onClick={() => navigate('/student/courses')} variant="outline" size="sm">
              <BookOpen className="w-4 h-4 mr-2" /> View Courses
            </Button>
            <Button onClick={() => navigate('/student/counselling')} variant="outline" size="sm">
              <Phone className="w-4 h-4 mr-2" /> Counselling
            </Button>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
