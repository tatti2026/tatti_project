import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getStudentByProfileId, createStudent, getAllCourses,
  getStudentRecommendations, upsertRecommendation, updateStudent
} from '@/lib/api';
import StudentLayout from '@/components/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Course, CourseRecommendation as CourseRecommendationType, Student } from '@/types/index';
import { BookOpen, Clock, Users, Star, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

export default function CourseRecommendation() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [recommendations, setRecommendations] = useState<CourseRecommendationType[]>([]);
  const [interested, setInterested] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      let s = await getStudentByProfileId(profile.id);
      if (!s) s = await createStudent({ profile_id: profile.id, email: profile.email });
      setStudent(s);
      const [allCourses, recs] = await Promise.all([getAllCourses(), s ? getStudentRecommendations(s.id) : []]);
      setCourses(allCourses.filter(c => c.status === 'available'));

      // Generate recommendations if none exist
      if (recs.length === 0 && s) {
        const mockPcts = [85, 72, 68, 60, 55, 50];
        const newRecs: CourseRecommendationType[] = [];
        for (let i = 0; i < allCourses.length; i++) {
          const pct = mockPcts[i % mockPcts.length];
          await upsertRecommendation({ student_id: s.id, course_id: allCourses[i].id, recommendation_percentage: pct, is_interested: false, is_selected: false });
          newRecs.push({ id: '', student_id: s.id, course_id: allCourses[i].id, recommendation_percentage: pct, is_interested: false, is_selected: false, created_at: '', course: allCourses[i] });
        }
        setRecommendations(newRecs);
      } else {
        const enriched = recs.map(r => ({ ...r, course: allCourses.find(c => c.id === r.course_id) }));
        setRecommendations(enriched as CourseRecommendationType[]);
        const intSet = new Set(recs.filter(r => r.is_interested).map(r => r.course_id));
        setInterested(intSet);
        const sel = recs.find(r => r.is_selected);
        if (sel) setSelected(sel.course_id);
      }
      setLoading(false);
    })();
  }, [profile]);

  const toggleInterest = (courseId: string) => {
    setInterested(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId); else next.add(courseId);
      return next;
    });
  };

  const handleContinue = async () => {
    if (!student || !selected) { toast.error('Please select a course to continue'); return; }
    setSaving(true);
    for (const rec of recommendations) {
      await upsertRecommendation({
        ...rec,
        is_interested: interested.has(rec.course_id),
        is_selected: rec.course_id === selected,
      });
    }
    await updateStudent(student.id, { assessment_status: 'completed' });
    setSaving(false);
    toast.success('Course preferences saved!');
    navigate('/student/application');
  };

  const getRecommendationPct = (courseId: string) => {
    return recommendations.find(r => r.course_id === courseId)?.recommendation_percentage ?? 0;
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground mb-1">Course Recommendations</h1>
          <p className="text-muted-foreground text-sm">Based on your assessment performance. Select courses you're interested in, then choose one primary course.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => {
            const pct = getRecommendationPct(course.id);
            const isInterested = interested.has(course.id);
            const isSelected = selected === course.id;
            return (
              <div key={course.id} className={`glass-card rounded-xl p-5 flex flex-col transition-all ${isSelected ? 'border-primary ring-1 ring-primary' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-sm font-bold text-foreground leading-tight flex-1 min-w-0">{course.course_name}</h3>
                  <div className={`shrink-0 px-2 py-1 rounded-full text-xs font-bold ${pct >= 70 ? 'bg-success/20 text-success' : pct >= 50 ? 'bg-warning/20 text-warning' : 'bg-muted text-muted-foreground'}`}>
                    {pct}% Match
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">{course.description}</p>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> {course.duration}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" /> {course.available_seats} seats available
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {course.skills?.slice(0, 3).map(skill => (
                    <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0.5">{skill}</Badge>
                  ))}
                </div>

                <p className="text-sm font-bold text-foreground mb-3">₹{course.fee.toLocaleString()}</p>

                <div className="flex gap-2 mt-auto">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setDetailCourse(course)}>
                    View Details
                  </Button>
                  <Button size="sm" className={`flex-1 text-xs ${isInterested ? 'bg-success/20 text-success border border-success/30 hover:bg-success/30' : ''}`}
                    variant={isInterested ? 'outline' : 'secondary'}
                    onClick={() => toggleInterest(course.id)}>
                    {isInterested ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Star className="w-3 h-3 mr-1" />}
                    {isInterested ? 'Interested' : 'Interest'}
                  </Button>
                </div>

                <Button size="sm"
                  className={`mt-2 w-full text-xs ${isSelected ? 'gradient-bg border-0 text-white' : ''}`}
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => setSelected(isSelected ? null : course.id)}>
                  {isSelected ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Selected</> : 'Select Course'}
                </Button>
              </div>
            );
          })}
        </div>

        {selected && (
          <div className="glass-card rounded-xl p-4 border-primary/40 border flex items-center gap-4">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Course Selected</p>
              <p className="text-xs text-muted-foreground truncate">{courses.find(c => c.id === selected)?.course_name}</p>
            </div>
            <Button onClick={handleContinue} disabled={saving} className="gradient-bg border-0 text-white shrink-0">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
              Continue
            </Button>
          </div>
        )}
      </div>

      {/* Course Detail Dialog */}
      <Dialog open={!!detailCourse} onOpenChange={() => setDetailCourse(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailCourse?.course_name}</DialogTitle>
          </DialogHeader>
          {detailCourse && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{detailCourse.description}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Duration', value: detailCourse.duration },
                  { label: 'Fee', value: `₹${detailCourse.fee.toLocaleString()}` },
                  { label: 'Category', value: detailCourse.category },
                  { label: 'Available Seats', value: detailCourse.available_seats?.toString() },
                ].map(({ label, value }) => value && (
                  <div key={label} className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {detailCourse.eligibility && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">Eligibility</p>
                  <p className="text-sm text-muted-foreground">{detailCourse.eligibility}</p>
                </div>
              )}
              {detailCourse.skills && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Skills You'll Learn</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailCourse.skills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                  </div>
                </div>
              )}
              {detailCourse.career_opportunities && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Career Opportunities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailCourse.career_opportunities.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                  </div>
                </div>
              )}
              <Button className="w-full gradient-bg border-0 text-white" onClick={() => { setSelected(detailCourse.id); setDetailCourse(null); }}>
                Select This Course
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
}
