import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentByProfileId } from '@/lib/api';
import StudentLayout from '@/components/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import type { Student } from '@/types/index';
import { ClipboardList, BookOpen, FileText } from 'lucide-react';
import MonthlyCareerAssessmentGraph from '@/components/student/MonthlyCareerAssessmentGraph';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const s = await getStudentByProfileId(profile.id);
      setStudent(s);
      setLoading(false);
    })();
  }, [profile]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Monthly Career Assessment Performance Line Graph */}
        <MonthlyCareerAssessmentGraph onTakeAssessment={() => navigate('/student/assessment')} />

        {/* Quick Actions */}
        <div className="bg-white border border-[#FED7AA] rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#172554] mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {student?.assessment_status !== 'completed' && (
              <Button
                onClick={() => navigate('/student/assessment')}
                size="sm"
                className="bg-[#1D4ED8] hover:bg-[#1e40af] text-white border-0 shadow-sm"
              >
                <ClipboardList className="w-4 h-4 mr-2" /> Take Assessment
              </Button>
            )}
            {student?.assessment_status === 'completed' && student?.application_status === 'not_started' && (
              <Button
                onClick={() => navigate('/student/application')}
                size="sm"
                className="bg-[#1D4ED8] hover:bg-[#1e40af] text-white border-0 shadow-sm"
              >
                <FileText className="w-4 h-4 mr-2" /> Start Application
              </Button>
            )}
            {student?.assessment_status === 'completed' && (
              <Button
                onClick={() => navigate('/student/assessment')}
                variant="outline"
                size="sm"
                className="border-[#FED7AA] text-[#172554] hover:bg-[#FFEDD5]/50"
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
