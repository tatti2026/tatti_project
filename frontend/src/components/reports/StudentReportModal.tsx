import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { User, Mail, Phone, MapPin, Calendar, Award, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Student } from '@/types/index';

interface StudentReportModalProps {
  student: Student | null;
  open: boolean;
  onClose: () => void;
}

export const StudentReportModal: React.FC<StudentReportModalProps> = ({
  student,
  open,
  onClose,
}) => {
  if (!student) return null;

  const formatDateSafe = (d?: string | null) => {
    if (!d) return 'N/A';
    try {
      return format(new Date(d), 'dd MMMM yyyy');
    } catch {
      return d;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border shadow-2xl rounded-2xl p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center text-white font-black text-base shadow-md">
              {(student.full_name || 'ST').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {student.full_name || 'Student Profile'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-mono">
                Roll No: <span className="text-primary font-bold">{student.student_id || 'N/A'}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Contact Details */}
          <div className="bg-muted/30 rounded-xl p-3 border border-border/60 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span className="text-foreground font-medium">{student.email || 'No email provided'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-3.5 h-3.5 text-primary" />
              <span className="text-foreground font-medium">{student.phone || 'No phone provided'}</span>
            </div>
            {(student.city || student.state) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="text-foreground font-medium">
                  {[student.city, student.state, student.pincode].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Registered on: {formatDateSafe(student.created_at)}</span>
            </div>
          </div>

          {/* Academic & Progress Overview */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-muted/20 border border-border/60 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Assessment Status</p>
              <p className="text-xs font-semibold text-foreground mt-1 capitalize">
                {student.assessment_status.replace(/_/g, ' ')}
              </p>
            </div>

            <div className="bg-muted/20 border border-border/60 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Application Status</p>
              <p className="text-xs font-semibold text-foreground mt-1 capitalize">
                {student.application_status.replace(/_/g, ' ')}
              </p>
            </div>

            <div className="bg-muted/20 border border-border/60 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Payment Status</p>
              <p className="text-xs font-semibold text-foreground mt-1 capitalize">
                {student.payment_status}
              </p>
            </div>

            <div className="bg-muted/20 border border-border/60 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Counselling Status</p>
              <p className="text-xs font-semibold text-foreground mt-1 capitalize">
                {student.counselling_status.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {/* Application Lock Status */}
          <div className="bg-muted/20 border border-border/60 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Application Access Control:</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                student.application_access_status === 'unlocked'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {student.application_access_status === 'unlocked' ? '🔓 Unlocked' : '🔒 Locked'}
            </span>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
              Close Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentReportModal;
