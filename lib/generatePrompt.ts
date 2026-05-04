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
  year = '2024'
}: PromptConfig) => {

return `You are an expert question paper setter for Indian educational boards and competitive examinations.

Generate a complete test paper with the following specifications:

EXAM CONFIGURATION:
- Board/Exam: ${board}
- Class/Level: ${class_grade}
- Subject: ${subject}
- Topic/Chapter: ${topic}
- Difficulty: ${difficulty}
- Question Types: ${questionTypes}
- Total Questions: ${numQuestions}
- Total Marks: ${totalMarks}
- Language: ${language}

STRICT REQUIREMENTS:
1. Follow exact ${board} question paper format and pattern
2. Questions must be from ${topic} only — no out-of-syllabus questions
3. For CBSE: follow NEP 2020 competency-based question pattern
4. For GSEB: follow Gujarat state board prescribed format exactly
5. For JEE: follow JEE Mains pattern — 4 marks correct, -1 wrong for MCQ
6. For NEET: follow NTA NEET pattern — 4 marks correct, -1 wrong
7. For UPSC: follow UPSC preliminary pattern for MCQ, mains pattern for descriptive
8. Include answer key at the end
9. Mark distribution clearly shown
10. Difficulty distribution: Easy 30%, Medium 50%, Hard 20% (for Mixed)
11. DO NOT bold the questions. Use bold ONLY for headings.

OUTPUT FORMAT (output plain text ONLY, no HTML tags, no markdown code blocks):

General Instructions:
1. All questions are compulsory.
2. Marks are indicated against each question.

SECTION A

[Write all Section A questions here, numbered and with marks]

SECTION B

[Write all Section B questions here, if applicable]

SECTION C

[Write all Section C questions here, if applicable]

ANSWER KEY

[Complete answers with explanations where needed]

MARKING SCHEME

[Detailed marking scheme]

Generate now. Be accurate. Be board-specific. Output plain text only. Do not include the school name or exam name header, start directly from General Instructions.`
}
