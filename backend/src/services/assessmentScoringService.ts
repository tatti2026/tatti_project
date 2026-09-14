import type { QuestionRecord } from '../models/index.js';

export interface EvaluationResult {
  score: number;
  totalMarks: number;
  percentage: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  performanceTier: {
    tier: 'Exceptional' | 'Proficient' | 'Developing' | 'Needs Improvement';
    badgeColor: string;
    description: string;
  };
}

export function evaluateAssessmentAnswers(
  questions: QuestionRecord[],
  answers: Record<string, string>
): EvaluationResult {
  let score = 0;
  let totalMarks = 0;
  let correctCount = 0;
  let answeredCount = 0;

  for (const q of questions) {
    totalMarks += q.marks || 1;
    const studentAns = answers[q.id];
    if (studentAns) {
      answeredCount++;
      if (studentAns.toUpperCase() === q.correct_answer.toUpperCase()) {
        score += q.marks || 1;
        correctCount++;
      }
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
    correctCount,
    performanceTier,
  };
}
