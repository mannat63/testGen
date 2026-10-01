import type { PaperPlan } from './paperAlgorithm';
import type { PromptConfig } from './generatePrompt';
import type { SourcedQuestion } from './questionSource';

/* ──────────────────────────────────────────────────────────────
   Scientific / LaTeX normalization
   Converts LLM math syntax into clean inline-styled HTML that
   renders identically in the browser preview, PDF (html2canvas)
   and Word DOC export. No external renderer, no web fonts.
   ────────────────────────────────────────────────────────────── */

// Longer / variant keys first so partial matches don't clash.
const MATH_SYMBOLS: [string, string][] = [
  ['\\varepsilon', 'ε'], ['\\epsilon', 'ε'], ['\\vartheta', 'ϑ'], ['\\varphi', 'φ'],
  ['\\Omega', 'Ω'], ['\\omega', 'ω'], ['\\Delta', 'Δ'], ['\\delta', 'δ'],
  ['\\Gamma', 'Γ'], ['\\gamma', 'γ'], ['\\Lambda', 'Λ'], ['\\lambda', 'λ'],
  ['\\Sigma', 'Σ'], ['\\sigma', 'σ'], ['\\Theta', 'Θ'], ['\\theta', 'θ'],
  ['\\Phi', 'Φ'], ['\\phi', 'φ'], ['\\Psi', 'Ψ'], ['\\psi', 'ψ'],
  ['\\Pi', 'Π'], ['\\pi', 'π'], ['\\alpha', 'α'], ['\\beta', 'β'],
  ['\\zeta', 'ζ'], ['\\eta', 'η'], ['\\iota', 'ι'], ['\\kappa', 'κ'],
  ['\\mu', 'μ'], ['\\nu', 'ν'], ['\\xi', 'ξ'], ['\\rho', 'ρ'],
  ['\\tau', 'τ'], ['\\upsilon', 'υ'], ['\\chi', 'χ'],
  ['\\times', '×'], ['\\cdot', '·'], ['\\div', '÷'], ['\\pm', '±'], ['\\mp', '∓'],
  ['\\leq', '≤'], ['\\le', '≤'], ['\\geq', '≥'], ['\\ge', '≥'],
  ['\\neq', '≠'], ['\\ne', '≠'], ['\\approx', '≈'], ['\\equiv', '≡'],
  ['\\propto', '∝'], ['\\infty', '∞'], ['\\partial', '∂'], ['\\nabla', '∇'],
  ['\\int', '∫'], ['\\oint', '∮'], ['\\sum', 'Σ'], ['\\prod', '∏'],
  ['\\Rightarrow', '⇒'], ['\\Leftarrow', '⇐'], ['\\leftrightarrow', '↔'],
  ['\\rightarrow', '→'], ['\\leftarrow', '←'], ['\\to', '→'],
  ['\\circ', '°'], ['\\degree', '°'], ['\\angle', '∠'], ['\\perp', '⊥'],
  ['\\parallel', '∥'], ['\\hbar', 'ℏ'], ['\\ell', 'ℓ'], ['\\odot', '⊙'],
  ['\\cdots', '⋯'], ['\\ldots', '…'], ['\\dots', '…'], ['\\prime', '′'],
  ['\\pi', 'π'], ['\\%', '%'], ['\\&', '&amp;'], ['\\_', '_'], ['\\#', '#'],
];

function fracSpan(num: string, den: string): string {
  return `<span class="math-frac" style="display:inline-block;vertical-align:-0.5em;text-align:center;margin:0 2px;font-size:0.92em;">` +
    `<span style="display:block;line-height:1.3;border-bottom:1.3px solid currentColor;padding:0 4px;">${num}</span>` +
    `<span style="display:block;line-height:1.3;padding:0 4px;">${den}</span></span>`;
}

// Operates on an already HTML-escaped string.
function latexToHtml(input: string): string {
  let s = input;

  // Superscripts / subscripts (require a preceding token so normal prose is safe)
  s = s.replace(/(?<=[\w)\]}])\^\{([^{}]*)\}/g, (_m, x) => `<sup>${x}</sup>`);
  s = s.replace(/(?<=[\w)\]}])\^(\\?[A-Za-z0-9]+|[-+]?\d+)/g, (_m, x) => `<sup>${x}</sup>`);
  s = s.replace(/(?<=[\w)\]}])_\{([^{}]*)\}/g, (_m, x) => `<sub>${x}</sub>`);
  s = s.replace(/(?<=[\w)\]}])_(\\?[A-Za-z0-9]+)/g, (_m, x) => `<sub>${x}</sub>`);

  // Named symbols (literal replace, order-sensitive list above)
  for (const [k, v] of MATH_SYMBOLS) s = s.split(k).join(v);

  // Fractions (two passes handle one level of nesting)
  const fracRe = /\\d?frac\s*\{((?:[^{}]|\{[^{}]*\})*)\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;
  for (let i = 0; i < 2; i++) s = s.replace(fracRe, (_m, n, d) => fracSpan(n.trim(), d.trim()));

  // Roots, text, formatting wrappers, vectors
  s = s.replace(/\\sqrt\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g,
    (_m, x) => `√<span style="border-top:1.2px solid currentColor;padding:0 1px;">${x.trim()}</span>`);
  s = s.replace(/\\(?:text|mathrm|operatorname|mathsf)\s*\{([^{}]*)\}/g,
    (_m, x) => `<span style="font-style:normal;">${x}</span>`);
  s = s.replace(/\\(?:mathbf|boldsymbol)\s*\{([^{}]*)\}/g, (_m, x) => `<strong>${x}</strong>`);
  // Vectors/unit-vectors: use the boldface convention (renders cleanly in
  // browser, PDF and Word; combining arrow/caret glyphs show as tofu in many fonts).
  s = s.replace(/\\(?:vec|overrightarrow|hat)\s*\{([^{}]*)\}/g, (_m, x) => `<strong>${x}</strong>`);
  s = s.replace(/\\(?:bar|overline)\s*\{([^{}]*)\}/g, (_m, x) => `<span style="text-decoration:overline;">${x}</span>`);

  // Cleanup: spacing commands, line breaks, leftover unknown commands + braces
  s = s.replace(/\\left|\\right|\\!|\\,|\\;|\\:|\\quad|\\qquad/g, ' ');
  s = s.replace(/\\\\/g, ' ');
  s = s.replace(/\\([a-zA-Z]+)\b/g, '$1'); // unknown command → drop the backslash
  s = s.replace(/[{}]/g, '');
  s = s.replace(/[ \t]{2,}/g, ' ');
  return s;
}

/**
 * Render question / option / answer text that may contain LaTeX math
 * into safe, self-styled HTML. Strips $-delimiters and converts the math.
 */
export function formatScientific(input: string): string {
  if (!input) return '';
  let s = esc(input);                                  // HTML-escape literal text first
  s = s.replace(/\$\$|\$|\\\(|\\\)|\\\[|\\\]/g, '');    // drop math delimiters
  s = latexToHtml(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); // markdown bold leakage
  return s.trim();
}

export function parseAnswerKey(rawText: string, qNums: number[]): Map<number, string> {
  const answers = new Map<number, string>();
  const markerRegex = /(?:^|\n)\s*Q\.?\s*(\d+)[\.\)\:]?\s*/gi;
  const markers: { qNum: number; contentStart: number; matchStart: number }[] = [];
  let m;
  while ((m = markerRegex.exec(rawText)) !== null) {
    markers.push({ qNum: parseInt(m[1]), contentStart: m.index + m[0].length, matchStart: m.index });
  }
  for (let i = 0; i < markers.length; i++) {
    const end = i + 1 < markers.length ? markers[i + 1].matchStart : rawText.length;
    let text = rawText.substring(markers[i].contentStart, end).trim();
    text = text.replace(/^(?:Answer|Ans)\s*[:\-]\s*/i, '').trim();
    if (qNums.includes(markers[i].qNum) && text) {
      answers.set(markers[i].qNum, text);
    }
  }
  return answers;
}

export function parseQuestions(rawText: string, expectedCount: number): string[] {
  const fallback = '[Question could not be generated. Please add manually.]';
  const questions: string[] = new Array(expectedCount).fill(fallback);

  const cleaned = rawText
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1');

  const markerRegex = /(?:^|\n)\s*(?:Q\.?|Question)\s*(\d+)[\.\)\:]?\s*/gi;
  const markers: Array<{ num: number; contentStart: number; matchStart: number }> = [];
  let m;

  while ((m = markerRegex.exec(cleaned)) !== null) {
    markers.push({
      num: parseInt(m[1]),
      contentStart: m.index + m[0].length,
      matchStart: m.index,
    });
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].contentStart;
    const end = i + 1 < markers.length ? markers[i + 1].matchStart : cleaned.length;
    let text = cleaned.substring(start, end).trim();

    text = text.replace(/^[A-Z_]+\[C\d+,[EMH]\]\s*/i, '').trim();

    text = text
      .replace(/\n\s*(Answer|Ans|Correct Answer|Solution|Explanation|Note)\s*[:\-].*/gi, '')
      .replace(/\n\s*(Answer|Ans)\s*:\s*\([a-d]\).*/gi, '')
      .trim();

    const idx = markers[i].num - 1;
    if (idx >= 0 && idx < expectedCount && text) {
      questions[idx] = text;
    }
  }

  return questions;
}

const TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  sa1: 'Short Answer',
  sa2: 'Short Answer',
  la: 'Long Answer',
  numerical: 'Numerical',
  case_study: 'Case-Based',
  assertion_reason: 'Assertion-Reason',
};

const SOURCE_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  'Question Bank':     { color: '#1d4ed8', bg: '#eff6ff', label: 'QB' },
  'Coaching Material': { color: '#b45309', bg: '#fffbeb', label: 'CM' },
  'AI Generated':      { color: '#6b7280', bg: '#f3f4f6', label: 'AI' },
};

function getSourceStyle(source: string) {
  if (SOURCE_STYLES[source]) return SOURCE_STYLES[source];
  return { color: '#0f766e', bg: '#f0fdfa', label: source };
}

const PAPER_FONT = "'Calibri', 'Segoe UI', 'Arial', sans-serif";

/**
 * Inner HTML for a single question block (header row + options).
 * Shared by buildPaperHtml and the client-side regenerate path so the
 * layout stays identical everywhere. Uses tables for alignment because
 * tables render consistently in the browser, PDF and Word.
 */
export function renderQuestionInner(
  displayNum: number,
  main: string,
  options: string[],
  marksEach: number,
  source?: string,
  showSource?: boolean,
): string {
  const f = PAPER_FONT;
  let badge = '';
  if (showSource && source) {
    const st = getSourceStyle(source);
    const label = st.label === source ? 'DB' : st.label;
    badge = ` <span class="source-badge" style="font-size:9px;padding:1px 5px;border-radius:4px;background:${st.bg};color:${st.color};font-weight:700;vertical-align:middle;">${label}</span>`;
  }

  let h = '';
  // Header row: Q# | question text | marks (right-aligned)
  h += `<table style="width:100%;border-collapse:collapse;margin:0;"><tbody><tr>`;
  h += `<td style="width:30px;vertical-align:top;font-size:15px;font-family:${f};font-weight:700;color:#111827;white-space:nowrap;padding:0;">Q${displayNum}.</td>`;
  h += `<td style="vertical-align:top;font-size:15px;font-family:${f};color:#111827;line-height:1.8;padding:0 10px 0 0;">${formatScientific(main)}${badge}</td>`;
  h += `<td style="width:52px;vertical-align:top;text-align:right;font-size:13px;font-family:${f};font-weight:700;color:#64748b;white-space:nowrap;padding:1px 0 0 0;">[${marksEach} m]</td>`;
  h += `</tr></tbody></table>`;

  // Options: consistent 2-column table, aligned under the question text
  if (options.length > 0) {
    h += `<table style="margin:7px 0 2px 30px;border-collapse:collapse;width:calc(100% - 30px);"><tbody>`;
    for (let i = 0; i < options.length; i += 2) {
      h += `<tr>`;
      h += `<td style="width:50%;vertical-align:top;font-size:14px;font-family:${f};color:#374151;line-height:1.65;padding:3px 14px 3px 0;">${formatScientific(options[i])}</td>`;
      h += options[i + 1]
        ? `<td style="width:50%;vertical-align:top;font-size:14px;font-family:${f};color:#374151;line-height:1.65;padding:3px 0;">${formatScientific(options[i + 1])}</td>`
        : `<td style="width:50%;padding:0;"></td>`;
      h += `</tr>`;
    }
    h += `</tbody></table>`;
  }

  return h;
}

export function buildPaperHtml(
  plan: PaperPlan,
  questions: string[],
  config: PromptConfig,
  setLabel?: string,
  sources?: (SourcedQuestion['source'] | null)[],
): string {
  const font = "'Calibri', 'Arial', sans-serif";
  const lines: string[] = [];
  const showSources = sources && sources.length > 0;

  // ── Header ──
  lines.push(`<div style="text-align:center;margin-bottom:18px;">`);
  lines.push(`<div style="font-size:26px;font-weight:800;font-family:${font};color:#111827;margin-bottom:8px;">${esc(config.schoolName || 'SCHOOL / INSTITUTE NAME')}</div>`);
  if (setLabel) {
    lines.push(`<div style="font-size:15px;font-weight:700;font-family:${font};color:#dc2626;margin-bottom:6px;letter-spacing:2px;">SET ${setLabel}</div>`);
  }
  lines.push(`<div style="font-size:18px;font-weight:700;font-family:${font};color:#1f2937;margin-bottom:3px;">${esc(config.examName || 'Examination')}${config.examDate ? ' : ' + esc(config.examDate) : ''}</div>`);
  const classText = config.class_grade.toLowerCase().startsWith('class') ? config.class_grade : `Class ${config.class_grade}`;
  lines.push(`<div style="font-size:16px;font-weight:600;font-family:${font};color:#1f2937;">${esc(classText)} &mdash; ${esc(config.subject)}</div>`);
  const chapterNames = config.chapters.map(c => c.chapterName).join(', ');
  lines.push(`<div style="font-size:12px;font-weight:500;font-family:${font};color:#6b7280;margin-top:3px;">Chapters: ${esc(chapterNames)}</div>`);
  lines.push(`</div>`);

  // ── Time / Marks ──
  lines.push(`<table width="100%" style="margin-bottom:18px;border-collapse:collapse;font-size:16px;font-weight:700;font-family:${font};color:#111827;">`);
  lines.push(`<tr><td style="text-align:left;padding:0;">Time: ${esc(String(config.examDuration || config.duration + ' min'))}</td>`);
  lines.push(`<td style="text-align:right;padding:0;">Maximum Marks: ${plan.totalMarks}</td></tr></table>`);

  // ── Instructions ──
  lines.push(`<div style="font-size:13px;font-family:${font};color:#374151;margin-bottom:14px;padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;">`);
  lines.push(`<strong>General Instructions:</strong> All questions are compulsory. Marks for each question are indicated in brackets.`);
  lines.push(`</div>`);

  // ── Source legend ──
  if (showSources) {
    const counts: Record<string, number> = { 'Question Bank': 0, 'Coaching Material': 0, 'AI Generated': 0 };
    for (const s of sources!) {
      const key = s ?? 'AI Generated';
      counts[key] = (counts[key] || 0) + 1;
    }
    const parts = (Object.entries(counts) as [SourcedQuestion['source'], number][])
      .filter(([, n]) => n > 0)
      .map(([k, n]) => {
        const st = getSourceStyle(k);
        return `<span style="display:inline-block;margin:0 10px 0 0;"><span style="padding:1px 6px;border-radius:3px;background:${st.bg};color:${st.color};font-weight:700;">${st.label === k ? 'DB' : st.label}</span> ${k}: ${n}</span>`;
      })
      .join('');
    lines.push(`<div class="source-legend" style="font-size:10px;font-family:${font};color:#6b7280;margin-bottom:14px;padding:5px 10px;border:1px solid #e5e7eb;border-radius:4px;">`);
    lines.push(`<strong>Sources:</strong> ${parts}`);
    lines.push(`</div>`);
  }

  // ── Sections ──
  let displayNum = 1;

  for (let sIdx = 0; sIdx < plan.sections.length; sIdx++) {
    const section = plan.sections[sIdx];
    const sectionMarks = section.slots.reduce((s, sl) => s + sl.marksEach, 0);

    const typeGroups: Record<string, { count: number; marksEach: number; label: string }> = {};
    for (const slot of section.slots) {
      const key = `${slot.questionType}-${slot.marksEach}`;
      if (!typeGroups[key]) typeGroups[key] = { count: 0, marksEach: slot.marksEach, label: TYPE_LABELS[slot.questionType] || slot.questionType };
      typeGroups[key].count++;
    }
    const summary = Object.values(typeGroups)
      .map(g => `${g.count} &times; ${g.label} @ ${g.marksEach}m`)
      .join(' &bull; ');

    lines.push(`<div id="paper-section-${sIdx}" data-section-name="${escAttr(section.name)}" style="margin:26px 0 12px 0;padding-bottom:5px;border-bottom:2px solid #1e293b;">`);
    lines.push(`<div style="font-size:17px;font-weight:800;font-family:${font};color:#1e293b;text-transform:uppercase;letter-spacing:0.5px;">${esc(section.name)}</div>`);
    lines.push(`<div style="font-size:11px;font-weight:500;font-family:${font};color:#6b7280;margin-top:2px;">${summary} = ${sectionMarks} marks</div>`);
    lines.push(`</div>`);

    for (const slot of section.slots) {
      const origIdx = slot.originalIndex ?? (displayNum - 1);
      const qText = questions[origIdx] || '[Question not generated]';
      const { main, options } = splitQuestionAndOptions(qText);

      const source: SourcedQuestion['source'] = sources?.[origIdx] ?? 'AI Generated';

      const slotData = JSON.stringify({
        chapterName: slot.chapterName,
        questionType: slot.questionType,
        difficulty: slot.difficulty,
        marksEach: slot.marksEach,
        sectionName: slot.sectionName,
      });

      lines.push(`<div class="pdf-no-break paper-question" id="paper-q-${displayNum}" data-slot='${escAttr(slotData)}' style="page-break-inside:avoid;margin:16px 0;">`);
      lines.push(renderQuestionInner(displayNum, main, options, slot.marksEach, source, showSources));
      lines.push(`</div>`);
      displayNum++;
    }
  }

  // ── Footer ──
  lines.push(`<div style="font-size:14px;font-weight:700;font-family:${font};color:#6b7280;margin:32px 0 0 0;text-align:center;letter-spacing:2px;">&mdash; END OF QUESTION PAPER &mdash;</div>`);
  lines.push(`<div style="font-size:10px;font-family:${font};color:#9ca3af;margin-top:10px;text-align:center;border-top:1px solid #e5e7eb;padding-top:6px;">Total Questions: ${plan.totalQuestions} | Total Marks: ${plan.totalMarks} | Generated by Intellogy Corporation</div>`);

  return lines.join('\n');
}

export function splitQuestionAndOptions(text: string): { main: string; options: string[] } {
  const rawLines = text.split('\n').map(l => l.trim()).filter(l => l);
  const options: string[] = [];
  const mainLines: string[] = [];

  for (const line of rawLines) {
    if (/^(\([a-dA-D]\)|[a-dA-D]\.)\s/.test(line)) {
      options.push(line);
    } else {
      mainLines.push(line);
    }
  }

  return { main: mainLines.join(' ').trim(), options };
}

function esc(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface AnswerEntry {
  qNum: number;
  questionType: string;
  marksEach: number;
  chapterName: string;
  answer: string;
  source: string;
}

export function buildAnswerKeyHtml(
  answers: AnswerEntry[],
  config: PromptConfig,
  setLabel?: string,
): string {
  const font = "'Calibri', 'Arial', sans-serif";
  const lines: string[] = [];

  lines.push(`<div style="text-align:center;margin-bottom:18px;">`);
  lines.push(`<div style="font-size:22px;font-weight:800;font-family:${font};color:#111827;margin-bottom:6px;">${esc(config.schoolName || 'SCHOOL / INSTITUTE NAME')}</div>`);
  if (setLabel) {
    lines.push(`<div style="font-size:14px;font-weight:700;font-family:${font};color:#dc2626;margin-bottom:4px;letter-spacing:2px;">SET ${setLabel} — ANSWER KEY</div>`);
  } else {
    lines.push(`<div style="font-size:14px;font-weight:700;font-family:${font};color:#dc2626;margin-bottom:4px;letter-spacing:2px;">ANSWER KEY</div>`);
  }
  lines.push(`<div style="font-size:16px;font-weight:700;font-family:${font};color:#1f2937;">${esc(config.examName || 'Examination')}${config.examDate ? ' — ' + esc(config.examDate) : ''}</div>`);
  const classText = config.class_grade.toLowerCase().startsWith('class') ? config.class_grade : `Class ${config.class_grade}`;
  lines.push(`<div style="font-size:14px;font-weight:600;font-family:${font};color:#1f2937;">${esc(classText)} — ${esc(config.subject)}</div>`);
  lines.push(`</div>`);

  lines.push(`<div style="font-size:11px;font-family:${font};color:#6b7280;margin-bottom:16px;padding:6px 10px;background:#fef9c3;border:1px solid #fde68a;border-radius:4px;text-align:center;">`);
  lines.push(`<strong>CONFIDENTIAL — FOR TEACHER USE ONLY</strong>`);
  lines.push(`</div>`);

  lines.push(`<table style="width:100%;border-collapse:collapse;font-family:${font};font-size:14px;">`);
  lines.push(`<thead><tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1;">`);
  lines.push(`<th style="padding:8px 10px;text-align:left;font-weight:700;color:#334155;width:50px;">Q#</th>`);
  lines.push(`<th style="padding:8px 10px;text-align:left;font-weight:700;color:#334155;width:80px;">Type</th>`);
  lines.push(`<th style="padding:8px 10px;text-align:left;font-weight:700;color:#334155;width:50px;">Marks</th>`);
  lines.push(`<th style="padding:8px 10px;text-align:left;font-weight:700;color:#334155;">Answer / Key Points</th>`);
  lines.push(`</tr></thead><tbody>`);

  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    const sourceColor = a.source === 'Question Bank' ? '#1d4ed8' : '#6b7280';
    const sourceLabel = a.source === 'Question Bank' ? 'QB' : 'AI';

    const answerHtml = formatScientific(a.answer)
      .replace(/\n- /g, '<br>• ')
      .replace(/\n/g, '<br>');

    lines.push(`<tr style="background:${bg};border-bottom:1px solid #e2e8f0;">`);
    lines.push(`<td style="padding:8px 10px;font-weight:700;color:#1e293b;vertical-align:top;">Q${a.qNum}</td>`);
    lines.push(`<td style="padding:8px 10px;color:#475569;vertical-align:top;">${esc(TYPE_LABELS[a.questionType] || a.questionType)} <span style="font-size:9px;padding:1px 4px;border-radius:3px;color:${sourceColor};font-weight:700;">${sourceLabel}</span></td>`);
    lines.push(`<td style="padding:8px 10px;color:#475569;vertical-align:top;text-align:center;">${a.marksEach}</td>`);
    lines.push(`<td style="padding:8px 10px;color:#1e293b;line-height:1.6;vertical-align:top;">${answerHtml}</td>`);
    lines.push(`</tr>`);
  }

  lines.push(`</tbody></table>`);

  lines.push(`<div style="font-size:10px;font-family:${font};color:#9ca3af;margin-top:20px;text-align:center;border-top:1px solid #e5e7eb;padding-top:8px;">Answer Key — ${answers.length} questions | Generated by Intellogy Corporation</div>`);

  return lines.join('\n');
}
