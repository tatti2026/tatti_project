import type { Request, Response } from 'express';
import { supabase } from '../database/dbClient.js';
import { evaluateAssessmentAnswers } from '../services/assessmentScoringService.js';
import { generateCourseRecommendations } from '../services/recommendationService.js';
import { createSystemNotification } from '../services/notificationService.js';
import type { QuestionRecord, CourseRecord } from '../models/index.js';

export async function getActiveQuestions(req: Request, res: Response) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(30);

  if (error || !data || data.length === 0) {
    // Fallback seed questions if database is empty
    return res.json([
      { id: 'q1', question_text: 'Which data structure operates on LIFO principle?', option_a: 'Queue', option_b: 'Stack', option_c: 'Array', option_d: 'Tree', correct_answer: 'B', marks: 1, difficulty: 'easy', category: 'CS' },
      { id: 'q2', question_text: 'Primary function of JSX in React?', option_a: 'Query language', option_b: 'HTML-like JavaScript syntax', option_c: 'Database driver', option_d: 'Styling engine', correct_answer: 'B', marks: 1, difficulty: 'easy', category: 'Web' },
    ]);
  }

  return res.json(data);
}

export async function submitAssessment(req: Request, res: Response) {
  const { studentId, answers } = req.body;

  if (!studentId || !answers) {
    return res.status(400).json({ error: 'studentId and answers are required.' });
  }

  // Fetch questions
  const { data: questions } = await supabase.from('questions').select('*').eq('is_active', true);
  const qList: QuestionRecord[] = (questions || []) as QuestionRecord[];

  const evaluation = evaluateAssessmentAnswers(qList, answers);

  // Fetch available courses to generate unlocked recommendations
  const { data: courses } = await supabase.from('courses').select('*').eq('status', 'available');
  const recommendations = generateCourseRecommendations(evaluation.percentage, (courses || []) as CourseRecord[]);

  // Send system notification
  createSystemNotification(
    studentId,
    '✓ Assessment Completed',
    `Your Career Fit Assessment has been evaluated with a score of ${evaluation.score}/${evaluation.totalMarks} (${evaluation.percentage}%). Your recommended courses are now unlocked.`,
    'assessment'
  );

  return res.json({
    message: 'Assessment submitted successfully.',
    evaluation,
    recommendations,
  });
}
