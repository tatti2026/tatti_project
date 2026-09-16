import React from 'react';
import { Eye, User, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Student } from '@/types/index';

interface StudentReportsTableProps {
  students: Student[];
  startIndex: number;
  onViewStudent: (student: Student) => void;
}

export const StudentReportsTable: React.FC<StudentReportsTableProps> = ({
  students,
  startIndex,
  onViewStudent,
}) => {
  const getBadge = (type: 'assessment' | 'application' | 'payment' | 'access', val: string) => {
    if (type === 'assessment') {
      if (val === 'completed') {
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Completed</span>;
      }
      if (val === 'in_progress') {
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">In Progress</span>;
      }
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">Not Started</span>;
    }

    if (type === 'application') {
      if (val === 'submitted') {
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Submitted</span>;
      }
      if (val === 'in_progress') {
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">In Progress</span>;
      }
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">Not Started</span>;
    }

    if (type === 'payment') {
      if (val === 'paid') {
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Paid</span>;
      }
      if (val === 'pending') {
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending</span>;
      }
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Failed</span>;
    }

    if (type === 'access') {
      if (val === 'unlocked') {
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🔓 Unlocked</span>;
      }
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">🔒 Locked</span>;
    }

    return null;
  };

  if (students.length === 0) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground bg-card/20 rounded-2xl border border-border">
        No student records match the selected filters.
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3.5 py-3 text-left font-bold uppercase tracking-wider text-[10px]">#</th>
              <th className="px-3.5 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Roll No</th>
              <th className="px-3.5 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Student Name</th>
              <th className="px-3.5 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Assessment</th>
              <th className="px-3.5 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Application</th>
              <th className="px-3.5 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Payment</th>
              <th className="px-3.5 py-3 text-right font-bold uppercase tracking-wider text-[10px]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {students.map((student, idx) => (
              <tr
                key={student.id}
                className="hover:bg-muted/40 transition-colors"
              >
                <td className="px-3.5 py-3 text-muted-foreground font-mono">
                  {startIndex + idx}
                </td>
                <td className="px-3.5 py-3 font-mono font-bold text-primary whitespace-nowrap">
                  {student.student_id || 'ID-N/A'}
                </td>
                <td className="px-3.5 py-3 whitespace-nowrap">
                  <div>
                    <p className="font-semibold text-foreground">
                      {student.full_name || 'Unnamed Student'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{student.email || '-'}</p>
                  </div>
                </td>
                <td className="px-3.5 py-3 whitespace-nowrap">
                  {getBadge('assessment', student.assessment_status)}
                </td>
                <td className="px-3.5 py-3 whitespace-nowrap">
                  {getBadge('application', student.application_status)}
                </td>
                <td className="px-3.5 py-3 whitespace-nowrap">
                  {getBadge('payment', student.payment_status)}
                </td>
                <td className="px-3.5 py-3 text-right whitespace-nowrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewStudent(student)}
                    className="text-xs h-7 px-2.5 hover:bg-primary hover:text-white"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentReportsTable;
