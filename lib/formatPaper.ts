import { PromptConfig } from './generatePrompt';

export const formatPaper = (rawText: string, config: PromptConfig): string => {
  const lines = rawText.split('\n').map(l => l.trimEnd());
  const result: string[] = [];

  const fontSerif = `var(--font-garamond), 'EB Garamond', 'Times New Roman', serif`;
  const fontSans = `'Calibri', 'Arial', sans-serif`;

  // Guaranteed Header
  result.push(`<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;text-align:center;margin-bottom:32px;padding-bottom:20px;border-bottom:3px double #1f2937;">`);
  result.push(`<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;font-size:32px;font-weight:800;font-family:${fontSerif};color:#111827;letter-spacing:0.5px;margin-bottom:8px;">${config.schoolName || 'SCHOOL / INSTITUTE NAME'}</div>`);
  result.push(`<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;font-size:24px;font-weight:700;font-family:${fontSerif};color:#1f2937;margin-bottom:16px;">${config.examName || 'UNIT TEST'} — ${config.board}</div>`);
  result.push(`<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;font-size:16px;font-weight:600;font-family:${fontSans};color:#374151;margin-bottom:8px;">Subject: ${config.subject} &nbsp;|&nbsp; Class: ${config.class_grade} &nbsp;|&nbsp; Topic: ${config.topic}</div>`);
  result.push(`<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;font-size:16px;font-weight:600;font-family:${fontSans};color:#374151;">Date: ${config.examDate || '_____________'} &nbsp;|&nbsp; Time Allowed: ${config.examDuration || '2 Hours'} &nbsp;|&nbsp; Max. Marks: ${config.totalMarks}</div>`);
  result.push(`</div>`);

  let i = 0;
  // Skip any AI-generated headers if it accidentally generated them before General Instructions
  while (i < lines.length && !/^(general instructions|section\s+[A-Z])/i.test(lines[i].trim())) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      result.push('<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;height:12px;"></div>');
      i++;
      continue;
    }

    // ── SECTION HEADERS: SECTION A, SECTION B, etc. ──
    if (/^SECTION\s+[A-Z]/i.test(trimmed)) {
      result.push(
        `<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;font-size:22px;font-weight:bold;font-family:${fontSerif};color:#111827;margin:36px 0 16px 0;padding-bottom:6px;border-bottom:2px solid #111827;text-transform:uppercase;letter-spacing:1px;">${trimmed}</div>`
      );
      i++;
      continue;
    }

    // ── ANSWER KEY / MARKING SCHEME headers ──
    if (/^(ANSWER\s+KEY|MARKING\s+SCHEME)/i.test(trimmed)) {
      result.push(
        `<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;font-size:22px;font-weight:bold;font-family:${fontSerif};color:#374151;margin:40px 0 16px 0;padding-bottom:6px;border-bottom:2px solid #374151;text-transform:uppercase;letter-spacing:1px;">${trimmed}</div>`
      );
      i++;
      continue;
    }

    // ── GENERAL INSTRUCTIONS header ──
    if (/^general instructions/i.test(trimmed)) {
      result.push(
        `<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;font-size:16px;font-weight:bold;font-family:${fontSans};color:#111827;margin:16px 0 12px 0;">${trimmed}</div>`
      );
      i++;
      continue;
    }

    // ── NUMBERED QUESTIONS: "1." "Q1." "Q.1" etc. ──
    if (/^(Q\.?\s*)?\d+[\.\)]\s+\S/.test(trimmed)) {
      // Remove strong bolding from question lines to keep it professional
      let cleaned = trimmed.replace(/\*\*(.*?)\*\*/g, '$1');
      // Bold the question number
      cleaned = cleaned.replace(/^((?:Q\.?\s*)?\d+[\.\)])/, '<strong>$1</strong>');
      result.push(
        `<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;font-size:16px;font-weight:normal;font-family:${fontSans};color:#111827;margin:16px 0 8px 0;line-height:1.7;">${cleaned}</div>`
      );
      i++;
      continue;
    }

    // ── MCQ OPTIONS: "(a)" "(b)" "a)" "A." etc. ──
    if (/^\s*\([a-dA-D]\)|^[a-dA-D][\.\)]\s/.test(trimmed)) {
      let cleaned = trimmed.replace(/\*\*(.*?)\*\*/g, '$1');
      // Bold the option letter
      cleaned = cleaned.replace(/^(\s*(?:\([a-dA-D]\)|[a-dA-D][\.\)]))/, '<strong>$1</strong>');
      result.push(
        `<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;font-size:16px;font-family:${fontSans};color:#374151;margin:6px 0 6px 32px;line-height:1.6;">${cleaned}</div>`
      );
      i++;
      continue;
    }

    // ── INSTRUCTION LIST ITEMS: lines starting with number in instructions ──
    if (/^\d+\.\s/.test(trimmed)) {
      const cleaned = trimmed.replace(/\*\*(.*?)\*\*/g, '$1');
      result.push(
        `<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;font-size:15px;font-family:${fontSans};color:#4b5563;margin:6px 0 6px 20px;line-height:1.6;">${cleaned}</div>`
      );
      i++;
      continue;
    }

    // ── DEFAULT: any other line ──
    // Allow minimal bolding here.
    const styled = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    result.push(
      `<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;font-size:16px;font-family:${fontSans};color:#111827;margin:8px 0;line-height:1.7;">${styled}</div>`
    );
    i++;
  }

  return result.join('\n');
};
