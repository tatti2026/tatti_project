import type { Student, Assessment } from '@/types/index';

/**
 * ── CAREER FIT SEGMENTATION THRESHOLDS ──────────────────────────────────────
 * Centralized configurable score percentage thresholds for Career Fit Assessment.
 * High Intent: >= 80% (Distinction / Exceptional performance)
 * Medium Intent: >= 60% and < 80% (Proficient / Qualified performance)
 * Low Intent: < 60% (Developing / Foundation / Needs Improvement)
 */
export const SEGMENTATION_THRESHOLDS = {
  HIGH_INTENT_MIN_SCORE: 80,
  MEDIUM_INTENT_MIN_SCORE: 60,
  LOW_INTENT_MIN_SCORE: 0,
} as const;

export type IntentLevel = 'high' | 'medium' | 'low';

export interface StudentAssessmentScore {
  score: number | null;
  totalMarks: number | null;
  percentage: number | null;
  isCompleted: boolean;
}

export interface SegmentedStudent {
  student: Student;
  assessment: StudentAssessmentScore;
  intent: IntentLevel | null;
}

export interface SegmentationSummary {
  high: SegmentedStudent[];
  medium: SegmentedStudent[];
  low: SegmentedStudent[];
  unassessed: SegmentedStudent[];
  totalAssessed: number;
  totalStudents: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  highPct: number;
  mediumPct: number;
  lowPct: number;
}

/**
 * Determine the Intent Level from a student's percentage score and completion status.
 * Unassessed students (not completed or missing score) return null.
 */
export function calculateIntentLevel(
  percentage: number | null | undefined,
  isCompleted: boolean
): IntentLevel | null {
  if (!isCompleted || percentage == null || isNaN(percentage)) {
    return null;
  }
  if (percentage >= SEGMENTATION_THRESHOLDS.HIGH_INTENT_MIN_SCORE) {
    return 'high';
  }
  if (percentage >= SEGMENTATION_THRESHOLDS.MEDIUM_INTENT_MIN_SCORE) {
    return 'medium';
  }
  return 'low';
}

/**
 * Single source of truth for Career Fit Segmentation.
 * Synchronously segments all students based on their actual assessment scores.
 * Can take an optional map or array of assessments for cross-referencing.
 */
export function calculateSegmentation(
  students: Student[],
  assessments?: Assessment[] | Record<string, Assessment>
): SegmentationSummary {
  const assessMap: Record<string, Assessment> = {};
  if (Array.isArray(assessments)) {
    assessments.forEach(a => {
      if (a.student_id) assessMap[a.student_id] = a;
    });
  } else if (assessments && typeof assessments === 'object') {
    Object.assign(assessMap, assessments);
  }

  const high: SegmentedStudent[] = [];
  const medium: SegmentedStudent[] = [];
  const low: SegmentedStudent[] = [];
  const unassessed: SegmentedStudent[] = [];

  for (const s of students) {
    const record = assessMap[s.id];

    // Status: check assessment record or student assessment_status
    const isCompleted = (record?.status || s.assessment_status) === 'completed';

    // Raw score & total marks
    const scoreVal = record?.score != null
      ? Number(record.score)
      : (s.assessment_score != null ? Number(s.assessment_score) : null);

    const totalMarksVal = record?.total_marks != null
      ? Number(record.total_marks)
      : (s.assessment_total_marks != null ? Number(s.assessment_total_marks) : null);

    // Percentage: check record, then student object, then compute from score/totalMarks
    let pctVal = record?.percentage != null
      ? Number(record.percentage)
      : (s.assessment_percentage != null ? Number(s.assessment_percentage) : null);

    if (pctVal == null && scoreVal != null && totalMarksVal != null && totalMarksVal > 0) {
      pctVal = (scoreVal / totalMarksVal) * 100;
    }

    const assessmentScore: StudentAssessmentScore = {
      score: scoreVal,
      totalMarks: totalMarksVal,
      percentage: pctVal != null ? Math.round(pctVal * 10) / 10 : null,
      isCompleted,
    };

    // Unassessed guard: students without completed assessment are not in High/Medium
    if (!isCompleted || pctVal == null) {
      unassessed.push({
        student: s,
        assessment: assessmentScore,
        intent: null,
      });
      continue;
    }

    const intent = calculateIntentLevel(pctVal, isCompleted);
    const item: SegmentedStudent = {
      student: s,
      assessment: assessmentScore,
      intent,
    };

    if (intent === 'high') {
      high.push(item);
    } else if (intent === 'medium') {
      medium.push(item);
    } else if (intent === 'low') {
      low.push(item);
    } else {
      unassessed.push(item);
    }
  }

  const totalAssessed = high.length + medium.length + low.length;
  const totalStudents = students.length;

  let highPct = 0;
  let mediumPct = 0;
  let lowPct = 0;

  if (totalAssessed > 0) {
    highPct = Math.round((high.length / totalAssessed) * 100);
    mediumPct = Math.round((medium.length / totalAssessed) * 100);

    if (low.length === 0) {
      // If no low intent students, ensure high + med sum to 100%
      if (high.length > 0 && medium.length > 0 && highPct + mediumPct !== 100) {
        mediumPct = 100 - highPct;
      }
      lowPct = 0;
    } else {
      // Guarantee high + med + low = 100%
      lowPct = Math.max(0, 100 - highPct - mediumPct);
    }
  }

  return {
    high,
    medium,
    low,
    unassessed,
    totalAssessed,
    totalStudents,
    highCount: high.length,
    mediumCount: medium.length,
    lowCount: low.length,
    highPct,
    mediumPct,
    lowPct,
  };
}
