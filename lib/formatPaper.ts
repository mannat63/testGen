import { PromptConfig } from './generatePrompt';

export const formatPaper = (rawText: string, config: PromptConfig): string => {
  const lines = rawText.split('\n').map(l => l.trimEnd());
  const result: string[] = [];

  const fontSerif = `var(--font-garamond), 'EB Garamond', 'Times New Roman', serif`;
  const fontSans = `'Calibri', 'Arial', sans-serif`;

  // Guaranteed Header
  result.push(`<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;text-align:center;margin-bottom:20px;">`);
  result.push(`  <div style="font-size:28px;font-weight:800;font-family:${fontSans};color:#111827;margin-bottom:12px;">${config.schoolName || 'SCHOOL / INSTITUTE NAME'}</div>`);
  result.push(`  <div style="font-size:20px;font-weight:700;font-family:${fontSans};color:#1f2937;margin-bottom:4px;">${config.examName || 'Examination'} : ${config.examDate || '_____________'}</div>`);
  result.push(`  <div style="font-size:18px;font-weight:700;font-family:${fontSans};color:#1f2937;margin-bottom:4px;">Class- ${config.class_grade}</div>`);
  result.push(`  <div style="font-size:18px;font-weight:700;font-family:${fontSans};color:#1f2937;margin-bottom:4px;">Subject : ${config.subject}</div>`);
  result.push(`  <div style="font-size:16px;font-weight:600;font-family:${fontSans};color:#374151;margin-bottom:20px;">Topic : ${config.topic}</div>`);
  result.push(`</div>`);
  
  result.push(`<table width="100%" style="margin-bottom:24px;border-collapse:collapse;font-size:18px;font-weight:700;font-family:${fontSans};color:#111827;">`);
  result.push(`  <tr>`);
  result.push(`    <td style="text-align:left;padding:0;">Time : ${config.examDuration || '3 Hrs.'}</td>`);
  result.push(`    <td style="text-align:right;padding:0;">M.M.: ${config.totalMarks || '100'}</td>`);
  result.push(`  </tr>`);
  result.push(`</table>`);

  result.push(`<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;font-size:18px;font-weight:700;font-family:${fontSans};color:#111827;text-align:left;margin-bottom:24px;">Note:- All questions are compulsory.</div>`);

  let i = 0;
  // Skip any AI-generated headers if it accidentally generated them before General Instructions
  while (i < lines.length && !/^(general instructions|section\s+[A-Z])/i.test(lines[i].trim())) {
    i++;
  }

  let beforeFirstQuestion = true;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      result.push('<div class="pdf-no-break" style="page-break-inside: avoid; break-inside: avoid;height:12px;"></div>');
      i++;
      continue;
    }

    if (/^SECTION\s+[A-Z]/i.test(trimmed) || /^(Q\.?\s*)?\d+[\.\)]\s+\S/.test(trimmed)) {
      beforeFirstQuestion = false;
    }

    if (beforeFirstQuestion && (/compulsory/i.test(trimmed) || /all questions/i.test(trimmed))) {
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
