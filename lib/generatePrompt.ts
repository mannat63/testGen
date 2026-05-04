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

  const isMCQOnly = questionTypes.toLowerCase().includes('mcq') || questionTypes.toLowerCase().includes('multiple choice');
  const isLongOnly = questionTypes.toLowerCase().includes('long');
  const isShortOnly = questionTypes.toLowerCase().includes('short');

  if (isMCQOnly) {
    const perQ = Math.floor(marks / total);
    const actualTotal = perQ * total;
    sectionAHeader = `SECTION A — MCQ (${total} questions × ${perQ} mark each = ${actualTotal} marks)`;
    sectionPlan = sectionAHeader;
    grandTotalLine = `Grand Total: Section A (${total} × ${perQ}) = ${actualTotal} marks`;
  } else if (isLongOnly) {
    const perQ = Math.floor(marks / total);
    const actualTotal = perQ * total;
    sectionAHeader = `SECTION A — Long Answer (${total} questions × ${perQ} marks each = ${actualTotal} marks)`;
    sectionPlan = sectionAHeader;
    grandTotalLine = `Grand Total: Section A (${total} × ${perQ}) = ${actualTotal} marks`;
  } else if (isShortOnly) {
    const perQ = Math.floor(marks / total);
    const actualTotal = perQ * total;
    sectionAHeader = `SECTION A — Short Answer (${total} questions × ${perQ} marks each = ${actualTotal} marks)`;
    sectionPlan = sectionAHeader;
    grandTotalLine = `Grand Total: Section A (${total} × ${perQ}) = ${actualTotal} marks`;
  } else {
    // Mixed: MCQ always 1 mark, distribute remaining cleanly
    const mcqCount = Math.round(total * 0.40);
    const shortCount = Math.round(total * 0.35);
    const longCount = total - mcqCount - shortCount;

    const mcqMarks = mcqCount; // always 1 mark each
    const remainingMarks = marks - mcqMarks;

    // Pick clean short per-Q value
    const shortPerQ = Math.floor(remainingMarks * 0.40 / shortCount);
    const actualShortTotal = shortPerQ * shortCount;

    // Remaining all goes to long answers
    const longRemainingMarks = remainingMarks - actualShortTotal;
    const longPerQ = Math.floor(longRemainingMarks / longCount);
    const actualLongTotal = longPerQ * longCount;

    // Handle any leftover marks (add to last long question)
    const leftover = marks - (mcqMarks + actualShortTotal + actualLongTotal);

    sectionAHeader = `SECTION A — MCQ (${mcqCount} questions × 1 mark each = ${mcqMarks} marks)`;
    sectionBHeader = `SECTION B — Short Answer (${shortCount} questions × ${shortPerQ} marks each = ${actualShortTotal} marks)`;
    sectionCHeader = `SECTION C — Long Answer (${longCount} questions × ${longPerQ} marks each = ${actualLongTotal}${leftover > 0 ? ` + ${leftover} bonus mark on last question` : ''} marks)`;

    const verifiedTotal = mcqMarks + actualShortTotal + actualLongTotal + leftover;

    sectionPlan = `${sectionAHeader}
${sectionBHeader}
${sectionCHeader}
VERIFIED TOTAL: ${mcqCount}×1 + ${shortCount}×${shortPerQ} + ${longCount}×${longPerQ}${leftover > 0 ? `+${leftover}` : ''} = ${verifiedTotal} marks

EACH QUESTION MARK VALUE:
- Section A questions: 1 mark
- Section B questions: ${shortPerQ} marks
- Section C questions: ${longPerQ} marks${leftover > 0 ? ` (last one: ${longPerQ + leftover} marks)` : ''}`;

    grandTotalLine = `Grand Total Verification:
Section A: ${mcqCount} × 1 = ${mcqMarks} marks
Section B: ${shortCount} × ${shortPerQ} = ${actualShortTotal} marks
Section C: ${longCount} × ${longPerQ} = ${actualLongTotal}${leftover > 0 ? ` (+${leftover} on last question)` : ''} marks
TOTAL: ${mcqMarks} + ${actualShortTotal} + ${actualLongTotal + leftover} = ${verifiedTotal} marks`;
  }

return `You are an expert question paper setter for Indian educational boards and competitive examinations.

Generate a complete test paper with the following specifications:

EXAM CONFIGURATION:
- Board/Exam: ${board}
- Class/Level: ${class_grade}
- Subject: ${subject}
- Topic/Chapter: ${topic}
- Difficulty: ${difficulty}
- Question Types: ${questionTypes}
- Total Questions: ${total}
- Total Marks: ${marks}
- Language: ${language}

MANDATORY SECTION BREAKDOWN — FOLLOW EXACTLY:
${sectionPlan}

STRICT REQUIREMENTS:
1. Follow exact ${board} question paper format and pattern.
2. Questions must be from ${topic} only — no out-of-syllabus questions.
3. STRICTLY follow the section breakdown above. Question counts and marks per question are fixed.
4. Questions must be numbered CONTINUOUSLY across all sections (never restart).
5. DO NOT write any answer inside the question paper. Questions only.
6. ALL answers must appear ONLY in the ANSWER KEY section at the end.
7. In the ANSWER KEY: MCQs → "Q1. (b) Answer". Written → full answer.
8. Every single question MUST have an answer in the ANSWER KEY.
9. DO NOT bold questions. Bold ONLY section headings.
10. For CBSE: NEP 2020 pattern. For JEE/NEET: 4 marks correct, -1 wrong.
11. MARKS: Show marks ONLY ONCE at the END of the question: [1 mark] or [3 marks]. NEVER at the start.
12. MCQ OPTIONS: Each option MUST be on its own separate line. Never on one line.

OUTPUT FORMAT (plain text ONLY, no HTML, no markdown):

General Instructions:
1. All questions are compulsory.
2. Marks are indicated against each question.

${sectionAHeader || 'SECTION A'}

1. Question text here? [1 mark]
(a) First option
(b) Second option
(c) Third option
(d) Fourth option

2. Question text here? [1 mark]
(a) First option
(b) Second option
(c) Third option
(d) Fourth option

${sectionBHeader || 'SECTION B — Short Answer'}

3. Question text? [X marks]

4. Question text? [X marks]

${sectionCHeader || 'SECTION C — Long Answer'}

[Numbered continuing from Section B. Each option on new line for MCQs.]

${grandTotalLine}

ANSWER KEY

Q1. (b) Correct answer
Q2. (a) Correct answer
Q3. Full written answer...

Generate now. Be accurate. Be board-specific. Output plain text only. Do not include school name or exam name. Start directly from General Instructions.`
}
