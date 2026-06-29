import { PaperPlan } from './paperAlgorithm';
import { PromptConfig } from './generatePrompt';
import { SourcedQuestion } from './questionSource';

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
      const srcStyle = getSourceStyle(source);

      const slotData = JSON.stringify({
        chapterName: slot.chapterName,
        questionType: slot.questionType,
        difficulty: slot.difficulty,
        marksEach: slot.marksEach,
        sectionName: slot.sectionName,
      });

      lines.push(`<div class="pdf-no-break paper-question" id="paper-q-${displayNum}" data-slot='${escAttr(slotData)}' style="page-break-inside:avoid;margin:18px 0 10px 0;">`);
      lines.push(`<div style="display:flex;align-items:flex-start;gap:8px;">`);
      lines.push(`<div style="font-size:15px;font-family:${font};color:#111827;font-weight:700;padding-top:2px;white-space:nowrap;">Q${displayNum}.</div>`);
      lines.push(`<div style="font-size:15px;font-family:${font};color:#111827;line-height:1.7;flex-grow:1;">`);

      const srcBadge = showSources
        ? ` <span class="source-badge" style="font-size:9px;padding:2px 6px;border-radius:4px;background:${srcStyle.bg};color:${srcStyle.color};font-weight:700;vertical-align:middle;margin:0 6px;">${srcStyle.label === source ? 'DB' : srcStyle.label}</span>`
        : '';

      lines.push(`${esc(main)}${srcBadge} <span style="color:#6b7280;font-weight:700;font-size:13px;white-space:nowrap;">[${slot.marksEach} m]</span>`);
      lines.push(`</div></div>`);

      if (options.length > 0) {
        lines.push(`<div style="margin:8px 0 8px 32px;display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:6px;">`);
        for (const opt of options) {
          lines.push(`<div style="font-size:14px;font-family:${font};color:#374151;line-height:1.5;">${esc(opt)}</div>`);
        }
        lines.push(`</div>`);
      }

      lines.push(`</div>`);
      displayNum++;
    }
  }

  // ── Footer ──
  lines.push(`<div style="font-size:14px;font-weight:700;font-family:${font};color:#6b7280;margin:32px 0 0 0;text-align:center;letter-spacing:2px;">&mdash; END OF QUESTION PAPER &mdash;</div>`);
  lines.push(`<div style="font-size:10px;font-family:${font};color:#9ca3af;margin-top:10px;text-align:center;border-top:1px solid #e5e7eb;padding-top:6px;">Total Questions: ${plan.totalQuestions} | Total Marks: ${plan.totalMarks} | Generated by Intellogy Corporation</div>`);

  return lines.join('\n');
}

function splitQuestionAndOptions(text: string): { main: string; options: string[] } {
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
