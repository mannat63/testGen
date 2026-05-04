export interface PromptConfig {
  board: string;
  class_grade: string;
  subject: string;
  topic: string;
  difficulty: string;
  questionTypes: string;
  totalMarks: string | number;
  numQuestions: string | number;
  language: string;
  schoolName: string;
  examName: string;
  examDate: string;
  examDuration: string;
  year?: string;
}

export const generateTestPrompt = ({
  board, class_grade, subject, topic, difficulty, questionTypes, totalMarks, numQuestions, language,
}: PromptConfig) => {

  const total = Number(numQuestions);
  const marks = Number(totalMarks);

  // Calculate balanced section distribution with exact math
  let sectionPlan = '';
  let grandTotalLine = '';
  let sectionAHeader = '';
  let sectionBHeader = '';
  let sectionCHeader = '';

  let mcqCount = 0;
  let shortCount = 0;
  let longCount = 0;

  const isMCQOnly = questionTypes.toLowerCase().includes('mcq') || questionTypes.toLowerCase().includes('multiple choice');
  const isLongOnly = questionTypes.toLowerCase().includes('long');
  const isShortOnly = questionTypes.toLowerCase().includes('short');

  if (isMCQOnly) {
    mcqCount = total;
    const perQ = Math.floor(marks / total);
    const actualTotal = perQ * total;
    sectionAHeader = `SECTION A — MCQ (${total} questions × ${perQ} mark each = ${actualTotal} marks)`;
    sectionPlan = sectionAHeader;
    grandTotalLine = `Grand Total: Section A (${total} × ${perQ}) = ${actualTotal} marks`;
  } else if (isLongOnly) {
    longCount = total;
    const perQ = Math.floor(marks / total);
    const actualTotal = perQ * total;
    sectionAHeader = `SECTION A — Long Answer (${total} questions × ${perQ} marks each = ${actualTotal} marks)`;
    sectionPlan = sectionAHeader;
    grandTotalLine = `Grand Total: Section A (${total} × ${perQ}) = ${actualTotal} marks`;
  } else if (isShortOnly) {
    shortCount = total;
    const perQ = Math.floor(marks / total);
    const actualTotal = perQ * total;
    sectionAHeader = `SECTION A — Short Answer (${total} questions × ${perQ} marks each = ${actualTotal} marks)`;
    sectionPlan = sectionAHeader;
    grandTotalLine = `Grand Total: Section A (${total} × ${perQ}) = ${actualTotal} marks`;
  } else {
    // Mixed: Better algorithm to distribute marks based on weightings
    mcqCount = Math.max(1, Math.round(total * 0.40));
    shortCount = Math.max(1, Math.round(total * 0.35));
    longCount = total - mcqCount - shortCount;

    // Fix counts if total < 3 or longCount < 1
    if (longCount < 1 && total >= 3) {
      longCount = 1;
      if (shortCount > 1) shortCount--;
      else mcqCount--;
    } else if (total === 2) {
      mcqCount = 1; shortCount = 1; longCount = 0;
    } else if (total === 1) {
      mcqCount = 1; shortCount = 0; longCount = 0;
    }

    const mcqMarks = mcqCount; // always 1 mark each
    let remainingMarks = marks - mcqMarks;
    
    let shortPerQ = 1;
    let longPerQ = 1;

    if (remainingMarks > 0 && (shortCount > 0 || longCount > 0)) {
      const weight = (shortCount * 2) + (longCount * 4);
      const ratio = weight > 0 ? remainingMarks / weight : 0;
      
      shortPerQ = Math.max(1, Math.round(2 * ratio));
      longPerQ = Math.max(1, Math.round(4 * ratio));

      // Prevent overshoot
      while ((shortCount * shortPerQ) + (longCount * longPerQ) > remainingMarks) {
        if (longPerQ > shortPerQ && longPerQ > 1) {
          longPerQ--;
        } else if (shortPerQ > 1) {
          shortPerQ--;
        } else if (longPerQ > 1) {
          longPerQ--;
        } else {
          break;
        }
      }
    }

    const actualShortTotal = shortPerQ * shortCount;
    const actualLongTotal = longPerQ * longCount;

    // Handle any leftover marks (add to last long question)
    const leftover = Math.max(0, marks - (mcqMarks + actualShortTotal + actualLongTotal));

    sectionAHeader = `SECTION A — MCQ (${mcqCount} questions × 1 mark each = ${mcqMarks} marks)`;
    if (shortCount > 0) {
      sectionBHeader = `SECTION B — Short Answer (${shortCount} questions × ${shortPerQ} marks each = ${actualShortTotal} marks)`;
    }
    if (longCount > 0) {
      sectionCHeader = `SECTION C — Long Answer (${longCount} questions × ${longPerQ} marks each = ${actualLongTotal}${leftover > 0 ? ` + ${leftover} bonus mark on last question` : ''} marks)`;
    }

    const verifiedTotal = mcqMarks + actualShortTotal + actualLongTotal + leftover;

    sectionPlan = `${sectionAHeader}
${sectionBHeader}
${sectionCHeader}
VERIFIED TOTAL: ${mcqCount}×1 + ${shortCount}×${shortPerQ} + ${longCount}×${longPerQ}${leftover > 0 ? `+${leftover}` : ''} = ${verifiedTotal} marks

EACH QUESTION MARK VALUE:
- Section A questions: 1 mark
${shortCount > 0 ? `- Section B questions: ${shortPerQ} marks` : ''}
${longCount > 0 ? `- Section C questions: ${longPerQ} marks${leftover > 0 ? ` (last one: ${longPerQ + leftover} marks)` : ''}` : ''}`;

    grandTotalLine = `Grand Total Verification:
Part A: ${mcqCount} × 1 = ${mcqMarks} marks
${shortCount > 0 ? `Part B: ${shortCount} × ${shortPerQ} = ${actualShortTotal} marks` : ''}
${longCount > 0 ? `Part C: ${longCount} × ${longPerQ} = ${actualLongTotal}${leftover > 0 ? ` (+${leftover} on last question)` : ''} marks` : ''}
TOTAL: ${mcqMarks} + ${actualShortTotal} + ${actualLongTotal + leftover} = ${verifiedTotal} marks`;
  }

return `You are an expert ${board} question paper setter and academic evaluator.
Your task is to generate a highly accurate, board-level exam for Class ${class_grade} ${subject}.

STRICT EXAM CONFIGURATION:
- Board/Exam: ${board}
- Topic/Chapter: ${topic}
- Difficulty Level: ${difficulty} (Ensure questions strictly align with this complexity level)
- Question Types: ${questionTypes}
- Total Questions: ${total}
- Total Marks: ${marks}
- Language: ${language}

MANDATORY SECTION BREAKDOWN — FOLLOW EXACTLY:
${sectionPlan}

CRITICAL INSTRUCTIONS FOR QUALITY & ACCURACY:
1. Questions MUST BE conceptually sound, error-free, and appropriate for ${difficulty} difficulty.
2. For "Hard" difficulty, emphasize application-based, analytical, and higher-order thinking (HOTS) questions.
3. For "Easy" or "Medium" difficulty, focus on core concepts, standard applications, and fundamental understanding.
4. STRICTLY adhere to the section breakdown and mark allocation. Do NOT hallucinate different marks.
5. Questions must be numbered CONTINUOUSLY across all sections (1, 2, 3... until ${total}). Do NOT restart numbering at Section B or C.
6. NO out-of-syllabus questions. Focus only on: ${topic}.
7. ALL answers must be provided ONLY in the ANSWER KEY section at the end. DO NOT include answers immediately after the questions.
8. MCQ OPTIONS: Provide 4 options. Each option MUST be on its own separate line (e.g. (a) ... \\n (b) ...).
9. MARKS: Show marks ONLY ONCE at the END of each question like this: [1 mark] or [3 marks].

OUTPUT FORMAT (plain text ONLY, no HTML, no markdown):

General Instructions:
1. Marks are indicated against each question.
2. All the best for exam.

${sectionAHeader || 'SECTION A'}

1. Question text here? [1 mark]
(a) First option
(b) Second option
(c) Third option
(d) Fourth option

${sectionBHeader ? `\n${sectionBHeader}\n\n${mcqCount + 1}. Question text? [X marks]\n` : ''}
${sectionCHeader ? `\n${sectionCHeader}\n\n${mcqCount + shortCount + 1}. Question text? [X marks]\n` : ''}
[Numbered continuing sequentially. Each option on a new line for MCQs.]

--- END OF PAPER ---

${grandTotalLine}

ANSWER KEY

Q1. (b) Correct answer
Q2. (a) Correct answer
Q3. Full written answer...

Generate now. Be accurate, educational, and strict about the mark distribution. Output plain text only. Start directly from General Instructions.`;
}
