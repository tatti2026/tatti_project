import { describe, expect, it } from 'vitest';
import { parseQuestionDocument } from './questionDocumentImport';

describe('parseQuestionDocument', () => {
  it('parses numbered questions, option marks, and default marks', () => {
    const questions = parseQuestionDocument(`1. How do you study?
A. Before exams
B. With a plan - 3 marks
C. Every day (2 marks)
D. With a detailed schedule - 1 mark

2. Which subject do you enjoy?
A. Maths
B. Science
C. Art
D. History`);

    expect(questions).toHaveLength(2);
    expect(questions[0]).toMatchObject({
      question_text: 'How do you study?',
      option_a: 'Before exams',
      option_b: 'With a plan',
      option_c: 'Every day',
      option_d: 'With a detailed schedule',
      marks_a: 4,
      marks_b: 3,
      marks_c: 2,
      marks_d: 1,
      is_active: true,
    });
    expect(questions[1].marks_a).toBe(4);
    expect(questions[1].marks_b).toBe(3);
    expect(questions[1].marks_c).toBe(2);
    expect(questions[1].marks_d).toBe(1);
  });

  it('rejects a question when an option is missing', () => {
    expect(() => parseQuestionDocument(`1. A question
A. One
B. Two
D. Four`)).toThrow('missing option C');
  });

  it('rejects duplicate option labels', () => {
    expect(() => parseQuestionDocument(`1. A question
A. First
A. Duplicate
B. Two
C. Three
D. Four`)).toThrow('duplicate option A');
  });

  it('rejects documents without recognizable questions', () => {
    expect(() => parseQuestionDocument(''))
      .toThrow('No questions were found');
  });

  it('ignores PDF title and notes around numbered questions', () => {
    const questions = parseQuestionDocument(`CAREER FIT ASSESSMENT
Sample questions for import
1. What would you enjoy?
A. Designing
B. Helping
C. Organizing
D. Building
Importer notes
Save this document as Word`);

    expect(questions).toHaveLength(1);
    expect(questions[0].question_text).toBe('What would you enjoy?');
    expect(questions[0].option_d).toBe('Building');
  });
});
