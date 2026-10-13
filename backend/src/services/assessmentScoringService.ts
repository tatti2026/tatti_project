import type { QuestionRecord } from '../models/index.js';

export interface EvaluationResult {
  score: number;
  totalMarks: number;
  percentage: number;
  totalQuestions: number;
  answeredCount: number;
  /** For career-fit assessments there is no single "correct" answer, so this is always 0. */
  correctCount: number;
  performanceTier: {
    tier: 'Exceptional' | 'Proficient' | 'Developing' | 'Needs Improvement';
    badgeColor: string;
    description: string;
  };
}

/**
 * Career-Fit Scoring — awards marks based on the marks value configured for
 * whichever option the student selected (marks_a / marks_b / marks_c / marks_d).
 *
 * Total marks for percentage calculation = sum of the maximum option marks per question,
 * which represents the best possible score.
 */
export function evaluateAssessmentAnswers(
  questions: QuestionRecord[],
  answers: Record<string, string>
): EvaluationResult {
  let score = 0;
  let totalMarks = 0;
  let answeredCount = 0;

  for (const q of questions) {
    // Best possible marks for this question = max of all option marks
    const bestMarks = Math.max(
      Number(q.marks_a) || 1,
      Number(q.marks_b) || 1,
      Number(q.marks_c) || 1,
      Number(q.marks_d) || 1,
    );
    totalMarks += bestMarks;

    const selected = answers[q.id];
    if (selected) {
      answeredCount++;
      // Award marks for the specific selected option
      let awarded = 0;
      switch (selected.toUpperCase()) {
        case 'A': awarded = Number(q.marks_a) || 1; break;
        case 'B': awarded = Number(q.marks_b) || 1; break;
        case 'C': awarded = Number(q.marks_c) || 1; break;
        case 'D': awarded = Number(q.marks_d) || 1; break;
        default:  awarded = 0;
      }
      score += awarded;
    }
  }

  const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

  let performanceTier: EvaluationResult['performanceTier'];
  if (percentage >= 80) {
    performanceTier = {
      tier: 'Exceptional',
      badgeColor: 'emerald',
      description: 'Demonstrates deep technical aptitude and problem-solving mastery.',
    };
  } else if (percentage >= 60) {
    performanceTier = {
      tier: 'Proficient',
      badgeColor: 'blue',
      description: 'Good foundation with strong capability for advanced technical specializations.',
    };
  } else if (percentage >= 40) {
    performanceTier = {
      tier: 'Developing',
      badgeColor: 'amber',
      description: 'Solid basic skills with substantial growth potential in applied computing.',
    };
  } else {
    performanceTier = {
      tier: 'Needs Improvement',
      badgeColor: 'rose',
      description: 'Fundamental concepts require revision. Foundational modules recommended.',
    };
  }

  return {
    score,
    totalMarks,
    percentage: Math.round(percentage * 10) / 10,
    totalQuestions: questions.length,
    answeredCount,
    correctCount: 0, // career-fit has no concept of a single correct answer
    performanceTier,
  };
}
