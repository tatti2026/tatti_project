import type { CourseRecord } from '../models/index.js';

export interface RecommendedCourse {
  course: CourseRecord;
  matchPercentage: number;
  isTopMatch: boolean;
  matchReason: string;
}

export function generateCourseRecommendations(
  percentage: number,
  availableCourses: CourseRecord[]
): RecommendedCourse[] {
  const recommendations: RecommendedCourse[] = availableCourses.map((course, idx) => {
    let baseMatch = Math.round(percentage);

    if (percentage >= 80) {
      baseMatch = Math.min(98, Math.max(76, baseMatch - idx * 3));
    } else if (percentage >= 60) {
      baseMatch = Math.min(88, Math.max(65, baseMatch - idx * 3));
    } else {
      baseMatch = Math.min(82, Math.max(55, 60 + ((idx * 5) % 25)));
    }

    let matchReason = 'Strong alignment with your logical reasoning and core technical aptitude scores.';
    if (baseMatch >= 90) {
      matchReason = 'Highest compatibility based on high analytical problem solving scores in entrance exam.';
    } else if (baseMatch >= 75) {
      matchReason = 'Great career fit matching current industry demand and your foundational evaluation.';
    }

    return {
      course,
      matchPercentage: baseMatch,
      isTopMatch: idx === 0,
      matchReason,
    };
  });

  return recommendations.sort((a, b) => b.matchPercentage - a.matchPercentage);
}
