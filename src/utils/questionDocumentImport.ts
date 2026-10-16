export interface ImportedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks_a: number;
  marks_b: number;
  marks_c: number;
  marks_d: number;
  is_active: boolean;
}

interface ParsedOption {
  text: string;
  marks: number;
}

interface QuestionDraft {
  text: string;
  options: Partial<Record<'A' | 'B' | 'C' | 'D', ParsedOption>>;
}

const DEFAULT_MARKS = [4, 3, 2, 1];
const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

function questionTextFromMarker(line: string): string | null {
  const numbered = line.match(/^(?:(?:question|q)\s*)?\d+\s*[.):\-]\s*(.+)$/i);
  if (numbered) return numbered[1].trim();

  const named = line.match(/^(?:question|q)\s*\d*\s*:\s*(.+)$/i);
  return named?.[1].trim() ?? null;
}

function parseOption(line: string): { label: typeof OPTION_KEYS[number]; value: string } | null {
  const match = line.match(/^(?:option\s+)?([A-D])\s*[).:\-]\s*(.*)$/i);
  if (!match) return null;
  return {
    label: match[1].toUpperCase() as typeof OPTION_KEYS[number],
    value: match[2].trim(),
  };
}

function parseMarks(value: string, fallback: number): ParsedOption {
  const match = value.match(/^(.*?)(?:\s*\(\s*(\d+)\s*(?:marks?|mk)\s*\)|\s*[-–—]?\s*(\d+)\s*(?:marks?|mk))\s*$/i);
  if (!match) return { text: value.trim(), marks: fallback };

  return {
    text: match[1].trim(),
    marks: Number(match[2] ?? match[3]),
  };
}

export function parseQuestionDocument(text: string): ImportedQuestion[] {
  const questions: ImportedQuestion[] = [];
  const errors: string[] = [];
  let current: QuestionDraft | null = null;

  const finishCurrent = () => {
    if (!current) return;

    const questionNumber = questions.length + errors.length + 1;
    const missingOptions = OPTION_KEYS.filter(label => !current?.options[label]?.text);
    if (!current.text.trim()) {
      errors.push(`Question ${questionNumber} has no question text.`);
    } else if (missingOptions.length > 0) {
      errors.push(`Question ${questionNumber} is missing option${missingOptions.length > 1 ? 's' : ''} ${missingOptions.join(', ')}.`);
    } else {
      const options = current.options as Record<typeof OPTION_KEYS[number], ParsedOption>;
      questions.push({
        question_text: current.text.trim(),
        option_a: options.A.text,
        option_b: options.B.text,
        option_c: options.C.text,
        option_d: options.D.text,
        marks_a: options.A.marks,
        marks_b: options.B.marks,
        marks_c: options.C.marks,
        marks_d: options.D.marks,
        is_active: true,
      });
    }
    current = null;
  };

  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .flatMap(line => line.split('\t'))
    .map(line => line.replace(/\u00a0/g, ' ').trim())
    .filter(Boolean);

  for (const line of lines) {
    const markedQuestion = questionTextFromMarker(line);
    if (markedQuestion !== null) {
      finishCurrent();
      current = { text: markedQuestion, options: {} };
      continue;
    }

    const option = parseOption(line);
    if (option) {
      if (!current) {
        current = { text: '', options: {} };
      }
      if (current.options[option.label]) {
        errors.push(`Question ${questions.length + errors.length + 1} has duplicate option ${option.label}.`);
        continue;
      }
      const fallback = DEFAULT_MARKS[OPTION_KEYS.indexOf(option.label)];
      current.options[option.label] = parseMarks(option.value, fallback);
      continue;
    }

    if (!current) continue;
    if (OPTION_KEYS.every(label => current.options[label])) {
      finishCurrent();
    } else if (Object.keys(current.options).length === 0) {
      current.text = `${current.text} ${line}`.trim();
    } else {
      const lastOption = [...OPTION_KEYS].reverse().find(label => current?.options[label]);
      if (lastOption && current.options[lastOption]) {
        current.options[lastOption]!.text = `${current.options[lastOption]!.text} ${line}`.trim();
      }
    }
  }
  finishCurrent();

  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }
  if (questions.length === 0) {
    throw new Error('No questions were found. Use numbered question lines followed by options A, B, C, and D.');
  }

  return questions;
}

export async function readQuestionsFromDocx(file: File): Promise<ImportedQuestion[]> {
  const mammoth = (await import('mammoth')).default;
  const { value } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const document = new DOMParser().parseFromString(value, 'text/html');
  const blocks = Array.from(document.body.querySelectorAll('p, li, h1, h2, h3, h4, tr'));
  const lines = blocks.flatMap(block => {
    if (block.tagName === 'TR') {
      return [Array.from(block.querySelectorAll('th, td')).map(cell => cell.textContent ?? '').join('\t')];
    }
    if (block.closest('tr')) return [];
    return [(block.textContent ?? '').replace(/\s+/g, ' ')];
  });

  return parseQuestionDocument(lines.join('\n'));
}

async function readQuestionsFromPdf(file: File): Promise<ImportedQuestion[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const document = await loadingTask.promise;
  try {
    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = '';
      let previousY: number | undefined;
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const y = item.transform[5];
        if (previousY !== undefined && Math.abs(previousY - y) > 1.5 && !pageText.endsWith('\n')) {
          pageText += '\n';
        } else if (pageText && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
          pageText += ' ';
        }
        pageText += item.str;
        previousY = y;
        if (item.hasEOL) {
          pageText += '\n';
          previousY = undefined;
        }
      }
      pageTexts.push(pageText);
    }
    const text = pageTexts.join('\n').replace(/[ \t]+\n/g, '\n');
    if (!text.trim()) {
      throw new Error('This PDF contains no selectable text. Scanned/image-only PDFs are not supported.');
    }
    return parseQuestionDocument(text);
  } finally {
    await loadingTask.destroy();
  }
}

export async function readQuestionsFromFile(file: File): Promise<ImportedQuestion[]> {
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension === 'docx') return readQuestionsFromDocx(file);
  if (extension === 'pdf') return readQuestionsFromPdf(file);
  throw new Error('Choose a Word .docx or PDF file.');
}
