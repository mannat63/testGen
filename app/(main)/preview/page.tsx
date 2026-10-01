"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePaperStore } from '@/store/paperStore';
import { ArrowLeft, Download, RotateCcw, FileText, Pencil, Loader2, Settings2, ChevronUp, RefreshCw, BookOpen, ShieldCheck, AlertTriangle, ChevronDown, Wrench } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { validateSingleQuestion, buildValidationReport } from '@/lib/validatePaper';
import { splitQuestionAndOptions, renderQuestionInner } from '@/lib/formatPaper';

interface SectionInfo {
  id: string;
  name: string;
}

const REGEN_COOLDOWN_MS = 60_000;
const AUTO_REPAIR_DELAY_MS = 5_000;
const MAX_AUTO_REPAIR = 12;

export default function PreviewPage() {
  const router = useRouter();
  const { generatedPapers, answerKeys, validation, config, setPapers, setValidation } = usePaperStore();
  const paperRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeSet, setActiveSet] = useState(0);
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  const [showBackToTop, setShowBackToTop] = useState(false);

  const [regenQNum, setRegenQNum] = useState('');
  const [regenLoading, setRegenLoading] = useState<number | null>(null);
  const [regenCooldown, setRegenCooldown] = useState(0);
  const regenTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairProgress, setRepairProgress] = useState<{ done: number; total: number } | null>(null);

  const papers = generatedPapers;
  const setLabels = ['A', 'B', 'C'];

  useEffect(() => {
    if (!papers || papers.length === 0) { router.push('/'); }
  }, [papers, router]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      if (regenTimerRef.current) clearInterval(regenTimerRef.current);
    };
  }, []);

  const startCooldown = () => {
    setRegenCooldown(REGEN_COOLDOWN_MS / 1000);
    if (regenTimerRef.current) clearInterval(regenTimerRef.current);
    regenTimerRef.current = setInterval(() => {
      setRegenCooldown(prev => {
        if (prev <= 1) {
          if (regenTimerRef.current) clearInterval(regenTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleBackToConfig = () => {
    router.push(`/configure?board=${config?.board || 'CBSE'}`);
  };

  const handleNavigation = (path: string) => {
    if (window.confirm('Are you sure you want to leave? All unsaved progress will be lost.')) {
      router.push(path);
    }
  };

  useEffect(() => {
    if (papers[activeSet] && paperRef.current) {
      paperRef.current.innerHTML = papers[activeSet];
      extractSections();
    }
  }, [papers, activeSet]);

  const extractSections = useCallback(() => {
    if (!paperRef.current) return;
    const sectionEls = paperRef.current.querySelectorAll('[id^="paper-section-"]');
    const infos: SectionInfo[] = [];
    sectionEls.forEach(el => {
      infos.push({
        id: el.id,
        name: el.getAttribute('data-section-name') || el.textContent?.split('\n')[0] || 'Section',
      });
    });
    setSections(infos);
  }, []);

  useEffect(() => {
    const container = document.querySelector('main');
    if (!container) return;

    const handleScroll = () => {
      setShowBackToTop(container.scrollTop > 400);

      if (!paperRef.current) return;
      const sectionEls = paperRef.current.querySelectorAll('[id^="paper-section-"]');
      let currentSection = '';
      const offset = 200;

      sectionEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < offset) {
          currentSection = el.id;
        }
      });

      if (currentSection) setActiveSection(currentSection);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [papers, activeSet]);

  if (!papers || papers.length === 0) return null;

  const scrollToSection = (sectionId: string) => {
    if (!paperRef.current) return;
    const el = paperRef.current.querySelector(`#${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    const container = document.querySelector('main');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const highlightQuestion = (qEl: Element, color: string) => {
    (qEl as HTMLElement).style.outline = `2px solid ${color}`;
    (qEl as HTMLElement).style.outlineOffset = '4px';
    (qEl as HTMLElement).style.borderRadius = '8px';
    setTimeout(() => {
      (qEl as HTMLElement).style.outline = 'none';
    }, 2500);
  };

  const scrollToQuestion = (qNum: number) => {
    if (!paperRef.current) return;
    const el = paperRef.current.querySelector(`#paper-q-${qNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightQuestion(el, '#f59e0b');
    }
  };

  const handleRegenerate = async () => {
    if (!config || regenCooldown > 0) return;
    setIsRegenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to regenerate');
      }
      const { data, answerKeys: newAnswerKeys, validation: newValidation } = await res.json();
      setPapers(Array.isArray(data) ? data : [data], config, newAnswerKeys, newValidation);
      setActiveSet(0);
      startCooldown();
    } catch (err: any) {
      if (err.message?.includes('rate') || err.message?.includes('429')) {
        alert('Rate limit reached. Please wait 60 seconds before regenerating.');
        startCooldown();
      } else {
        alert('Failed to regenerate paper. Please try again.');
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  // Core regeneration: reads slot data from DOM, calls the API, replaces the
  // question in place. Returns status + the new text and slot info (for
  // re-validation). No cooldown/scroll/highlight side effects so it can be
  // reused by both manual regen and batch auto-repair.
  const regenerateQuestionInPlace = async (
    qNum: number,
  ): Promise<{ status: 'ok' | 'ratelimit' | 'notfound' | 'error'; text?: string; slotInfo?: any }> => {
    if (!paperRef.current || !config) return { status: 'error' };

    const qEl = paperRef.current.querySelector(`#paper-q-${qNum}`);
    if (!qEl) return { status: 'notfound' };

    const slotDataAttr = qEl.getAttribute('data-slot');
    if (!slotDataAttr) return { status: 'notfound' };

    let slotInfo: any;
    try {
      slotInfo = JSON.parse(slotDataAttr);
    } catch {
      return { status: 'error' };
    }

    try {
      const res = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board: config.board,
          subject: config.subject,
          class_grade: config.class_grade,
          chapterName: slotInfo.chapterName,
          questionType: slotInfo.questionType,
          difficulty: slotInfo.difficulty,
          marksEach: slotInfo.marksEach,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 429 || errData.error?.includes('rate')) return { status: 'ratelimit' };
        return { status: 'error' };
      }

      const { question } = await res.json();
      if (!question) return { status: 'error' };

      const { main, options } = splitQuestionAndOptions(question);
      // Reuse the shared renderer so regenerated questions match the paper exactly
      // (math formatting, option alignment, badge, marks).
      qEl.innerHTML = renderQuestionInner(qNum, main, options, slotInfo.marksEach, 'AI Generated', true);

      // Reconstruct text in the same shape validateSingleQuestion expects
      const reconstructed = [main, ...options].join('\n');
      return { status: 'ok', text: reconstructed, slotInfo };
    } catch {
      return { status: 'error' };
    }
  };

  // Re-run per-question structural checks on a freshly regenerated question.
  const revalidateOne = (qNum: number, text: string, slotInfo: any) =>
    validateSingleQuestion({
      qNum,
      text,
      questionType: slotInfo?.questionType || '',
      chapterName: slotInfo?.chapterName || '',
      difficulty: slotInfo?.difficulty || '',
      marksEach: slotInfo?.marksEach || 0,
      source: 'AI Generated',
    });

  const handleRegenerateQuestion = async (qNum: number) => {
    if (!paperRef.current || !config || regenCooldown > 0) return;
    const qEl = paperRef.current.querySelector(`#paper-q-${qNum}`);
    if (!qEl) {
      alert(`Question Q${qNum} not found in the paper.`);
      return;
    }

    setRegenLoading(qNum);
    scrollToQuestion(qNum);
    try {
      const { status, text, slotInfo } = await regenerateQuestionInPlace(qNum);
      if (status === 'ratelimit') {
        startCooldown();
        alert('Rate limit reached. Please wait 60 seconds.');
      } else if (status === 'ok') {
        // Re-validate the regenerated question and update the report honestly.
        const fresh = revalidateOne(qNum, text || '', slotInfo);
        if (validation) {
          const others = validation.issues.filter(i => i.qNum !== qNum);
          setValidation(buildValidationReport([...others, ...fresh], validation.totalChecked));
        }
        highlightQuestion(qEl, fresh.length === 0 ? '#10b981' : '#f59e0b');
        startCooldown();
      } else {
        alert(`Failed to regenerate Q${qNum}. Please try again.`);
      }
    } finally {
      setRegenLoading(null);
    }
  };

  const handleAutoRepair = async () => {
    if (!validation || !config || isRepairing || regenCooldown > 0) return;

    // Errors first, then warnings; unique question numbers.
    const errorQNums = [...new Set(validation.issues.filter(i => i.severity === 'error').map(i => i.qNum))];
    const warningQNums = [...new Set(validation.issues.filter(i => i.severity === 'warning').map(i => i.qNum))]
      .filter(q => !errorQNums.includes(q));
    const toRepair = [...errorQNums, ...warningQNums].slice(0, MAX_AUTO_REPAIR);
    if (toRepair.length === 0) return;

    setIsRepairing(true);
    setRepairProgress({ done: 0, total: toRepair.length });

    // Work on a local copy to avoid stale-closure over `validation` across the loop.
    let workingIssues = [...validation.issues];
    let repairedCount = 0;
    let stillBrokenCount = 0;
    let hitRateLimit = false;

    for (let idx = 0; idx < toRepair.length; idx++) {
      const qNum = toRepair[idx];
      scrollToQuestion(qNum);
      const { status, text, slotInfo } = await regenerateQuestionInPlace(qNum);
      if (status === 'ratelimit') { hitRateLimit = true; break; }
      if (status === 'ok') {
        // Re-validate the freshly generated question rather than assuming it's fixed.
        const fresh = revalidateOne(qNum, text || '', slotInfo);
        workingIssues = workingIssues.filter(i => i.qNum !== qNum).concat(fresh);
        if (fresh.length === 0) repairedCount++; else stillBrokenCount++;
        const qEl = paperRef.current?.querySelector(`#paper-q-${qNum}`);
        if (qEl) highlightQuestion(qEl, fresh.length === 0 ? '#10b981' : '#f59e0b');
      }
      setRepairProgress({ done: idx + 1, total: toRepair.length });
      if (idx < toRepair.length - 1) await new Promise(r => setTimeout(r, AUTO_REPAIR_DELAY_MS));
    }

    setValidation(buildValidationReport(workingIssues, validation.totalChecked));

    setIsRepairing(false);
    setRepairProgress(null);
    if (hitRateLimit) {
      startCooldown();
      alert(`Fixed ${repairedCount} question(s) before hitting the rate limit. Wait 60s and repair the rest.`);
    } else if (stillBrokenCount > 0) {
      alert(`Fixed ${repairedCount} question(s). ${stillBrokenCount} still have issues after regeneration — try Auto-Repair again or edit them manually.`);
    }
  };

  const handleRegenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(regenQNum);
    if (!num || num < 1) return;
    handleRegenerateQuestion(num);
    setRegenQNum('');
  };

  const handleDownloadDoc = () => {
    if (!paperRef.current) return;
    const clone = paperRef.current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.source-legend, .source-badge').forEach(el => el.remove());
    flattenMathForWord(clone);

    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Test Paper</title></head><body>";
    const footer = "</body></html>";
    const src = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(header + clone.innerHTML + footer);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.href = src;
    const setSuffix = papers.length > 1 ? `_Set${setLabels[activeSet]}` : '';
    a.download = `${config?.examName || config?.board || 'Exam'}_${config?.subject || 'Paper'}${setSuffix}.doc`;
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadPdf = async () => {
    if (!paperRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const clone = paperRef.current.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.source-legend, .source-badge').forEach(el => el.remove());
      
      const html2pdf = (await import('html2pdf.js')).default;
      const setSuffix = papers.length > 1 ? `_Set${setLabels[activeSet]}` : '';
      await html2pdf().set({
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: `${config?.examName || config?.board || 'Exam'}_${config?.subject || 'Paper'}${setSuffix}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: '.pdf-no-break' }
      } as any).from(clone).save();
    } catch {
      alert('Failed to generate PDF. Please try again.');
    } finally { setIsGeneratingPdf(false); }
  };

  const handleDownloadAnswerKey = () => {
    const akHtml = answerKeys?.[activeSet];
    if (!akHtml) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = akHtml;
    flattenMathForWord(tmp);
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Answer Key</title></head><body>";
    const footer = "</body></html>";
    const src = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(header + tmp.innerHTML + footer);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.href = src;
    const setSuffix = papers.length > 1 ? `_Set${setLabels[activeSet]}` : '';
    a.download = `${config?.examName || config?.board || 'Exam'}_${config?.subject || 'Paper'}${setSuffix}_AnswerKey.doc`;
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAnswerKeyPdf = async () => {
    const akHtml = answerKeys?.[activeSet];
    if (!akHtml) return;
    setIsGeneratingPdf(true);
    try {
      const container = document.createElement('div');
      container.innerHTML = akHtml;
      container.style.padding = '20px';
      container.style.background = '#ffffff';
      document.body.appendChild(container);

      const html2pdf = (await import('html2pdf.js')).default;
      const setSuffix = papers.length > 1 ? `_Set${setLabels[activeSet]}` : '';
      await html2pdf().set({
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: `${config?.examName || config?.board || 'Exam'}_${config?.subject || 'Paper'}${setSuffix}_AnswerKey.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      } as any).from(container).save();

      document.body.removeChild(container);
    } catch {
      alert('Failed to generate Answer Key PDF. Please try again.');
    } finally { setIsGeneratingPdf(false); }
  };

  const btnBase = "inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 shadow-sm";
  const btnSecondary = `${btnBase} bg-background border border-brand-border text-foreground hover:bg-brand-border/40`;

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ background: 'var(--bg-gradient)' }}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 sm:px-6 md:px-12 py-3 border-b border-[#2a3050] bg-brand-navbar shrink-0 no-print">
        <div className="flex items-center space-x-3 sm:space-x-6">
          <button onClick={() => handleNavigation('/')} className="flex items-center space-x-3">
            <div className="flex items-center justify-center transition-transform hover:scale-105">
              <img src="/image.png" alt="Logo" className="h-7 w-auto object-contain drop-shadow-sm" />
            </div>
            <span className="text-lg font-bold tracking-widest hidden sm:inline">
              <span className="text-foreground">INTELLOGY</span><span className="text-[#d4af37] ml-1.5 text-sm uppercase">Corporation</span>
            </span>
          </button>
          <button onClick={handleBackToConfig} className="hidden sm:flex items-center text-sm text-brand-navbar-muted hover:text-brand-gold-light transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Config
          </button>
        </div>
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Link href="/how-it-works" className="text-xs font-bold tracking-widest uppercase text-brand-muted hover:text-brand-gold transition-colors mr-2 hidden sm:inline">How it works</Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Toolbar */}
      <div className="px-4 sm:px-6 md:px-12 py-4 no-print">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-brand-card border border-brand-border shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-brand-muted">
              <span className="font-bold text-foreground">{config?.examName || config?.board}</span> • {config?.subject}
            </span>
            {papers.length > 1 && (
              <div className="flex gap-1">
                {papers.map((_, idx) => (
                  <button key={idx} onClick={() => setActiveSet(idx)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeSet === idx ? 'bg-brand-gold text-white' : 'bg-background border border-brand-border text-brand-muted hover:text-brand-gold'}`}>
                    Set {setLabels[idx]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Actions (tertiary, ghost) */}
            <button onClick={handleRegenerate} disabled={isRegenerating || regenCooldown > 0}
              className={`${btnSecondary} disabled:opacity-50`}>
              {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              {isRegenerating ? 'Generating...' : regenCooldown > 0 ? `Wait ${regenCooldown}s` : 'Regenerate All'}
            </button>
            <button onClick={handleBackToConfig} className={btnSecondary}>
              <Settings2 className="mr-2 h-4 w-4" /> Edit Config
            </button>

            <span className="hidden sm:block w-px h-6 bg-brand-border mx-1" aria-hidden />

            {/* Exports (secondary neutral) */}
            <button onClick={handleDownloadDoc} className={btnSecondary}>
              <FileText className="mr-2 h-4 w-4" /> DOC
            </button>
            {answerKeys.length > 0 && answerKeys[activeSet] && (
              <>
                <button onClick={handleDownloadAnswerKey} className={btnSecondary}>
                  <BookOpen className="mr-2 h-4 w-4" /> Answer Key
                </button>
                <button onClick={handleDownloadAnswerKeyPdf} disabled={isGeneratingPdf}
                  className={`${btnSecondary} disabled:opacity-50`}>
                  <BookOpen className="mr-2 h-4 w-4" /> Key PDF
                </button>
              </>
            )}

            {/* Primary export */}
            <button onClick={handleDownloadPdf} disabled={isGeneratingPdf}
              className={`${btnBase} bg-brand-gold text-white hover:bg-brand-gold-light disabled:opacity-60`}>
              <Download className="mr-2 h-4 w-4" /> {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Section Navigation + Regenerate Bar */}
      <div className="px-4 sm:px-6 md:px-12 no-print paper-nav-bar">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-3 mb-4">
          {/* Section Pills */}
          {sections.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-muted mr-1">Jump to:</span>
              {sections.map(sec => (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                    activeSection === sec.id
                      ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                      : 'border-brand-border text-brand-muted hover:text-foreground hover:border-brand-gold/50'
                  }`}
                >
                  {sec.name.length > 25 ? sec.name.substring(0, 25) + '...' : sec.name}
                </button>
              ))}
            </div>
          )}

          {/* Regenerate Question Input */}
          <form onSubmit={handleRegenSubmit} className="regen-toolbar flex items-center gap-2 ml-auto">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-muted whitespace-nowrap">
              <RefreshCw className="w-3 h-3 inline mr-1" />Regen Q#
            </span>
            <input
              type="number"
              min={1}
              value={regenQNum}
              onChange={e => setRegenQNum(e.target.value)}
              placeholder="#"
              className="w-14 text-center text-xs py-1.5 rounded-lg border border-brand-border bg-background text-foreground focus:ring-1 focus:ring-brand-gold/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!regenQNum || regenLoading !== null || regenCooldown > 0}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-brand-gold text-brand-gold hover:bg-brand-gold/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {regenLoading !== null ? <Loader2 className="w-3 h-3 animate-spin" /> : regenCooldown > 0 ? `${regenCooldown}s` : 'Go'}
            </button>
          </form>
        </div>
      </div>

      <main className="flex-1 px-4 sm:px-6 md:px-12 pb-8 overflow-auto">
        {/* Validation banner */}
        {validation && (
          <div className="max-w-5xl mx-auto mb-4 no-print">
            <div
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium shadow-sm transition-colors ${
                validation.errorCount > 0
                  ? 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
                  : validation.warningCount > 0
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <button
                onClick={() => setShowValidation(v => !v)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                {validation.errorCount > 0 || validation.warningCount > 0
                  ? <AlertTriangle className="w-4 h-4 shrink-0" />
                  : <ShieldCheck className="w-4 h-4 shrink-0" />}
                <span>
                  {validation.errorCount === 0 && validation.warningCount === 0
                    ? `Quality check passed — all ${validation.totalChecked} questions look good.`
                    : `Quality check: ${validation.errorCount} error${validation.errorCount !== 1 ? 's' : ''}, ${validation.warningCount} warning${validation.warningCount !== 1 ? 's' : ''} across ${validation.totalChecked} questions.`}
                </span>
                {validation.issues.length > 0 && (
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showValidation ? 'rotate-180' : ''}`} />
                )}
              </button>

              {validation.issues.length > 0 && papers.length === 1 && (
                <button
                  onClick={handleAutoRepair}
                  disabled={isRepairing || regenCooldown > 0}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-gold text-white hover:bg-brand-gold-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Automatically regenerate all flagged questions"
                >
                  {isRepairing
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Repairing {repairProgress?.done}/{repairProgress?.total}</>
                    : regenCooldown > 0
                      ? <><Wrench className="w-3.5 h-3.5" /> Wait {regenCooldown}s</>
                      : <><Wrench className="w-3.5 h-3.5" /> Auto-Repair</>}
                </button>
              )}
            </div>

            {showValidation && validation.issues.length > 0 && (
              <div className="mt-2 rounded-lg border border-brand-border bg-brand-card divide-y divide-brand-border/60 overflow-hidden">
                {papers.length > 1 && (
                  <div className="px-4 py-2 text-[11px] text-brand-muted bg-brand-border/20">
                    Question numbers refer to the base ordering. Jump-to and Auto-Repair are available for single-set papers.
                  </div>
                )}
                {validation.issues.map((issue, idx) => {
                  const inner = (
                    <>
                      <span className={`shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        issue.severity === 'error'
                          ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}>
                        {issue.severity}
                      </span>
                      <span className="shrink-0 text-xs font-bold text-foreground">Q{issue.qNum}</span>
                      <span className="text-xs text-brand-muted flex-1">
                        <span className="text-foreground-soft">{issue.category}</span> — {issue.message}
                      </span>
                    </>
                  );
                  return papers.length === 1 ? (
                    <button
                      key={idx}
                      onClick={() => scrollToQuestion(issue.qNum)}
                      className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-brand-border/30 transition-colors"
                    >
                      {inner}
                    </button>
                  ) : (
                    <div key={idx} className="w-full flex items-start gap-3 px-4 py-2.5 text-left">
                      {inner}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="max-w-5xl mx-auto mb-4 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold font-medium px-4 py-3 rounded-lg flex items-center justify-center text-sm shadow-sm animate-fade-in-up no-print">
          <Pencil className="w-4 h-4 mr-2" />
          Click inside the paper to edit. Use "Regen Q#" above to replace any question.
        </div>

        <div className="max-w-5xl mx-auto rounded-xl overflow-hidden shadow-xl border border-brand-border animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div
            ref={paperRef}
            className="p-6 md:p-16 leading-relaxed text-sm sm:text-base outline-none cursor-text"
            style={{ color: '#0f172a', backgroundColor: '#ffffff', fontFamily: "'Calibri', 'EB Garamond', Georgia, serif" }}
            contentEditable={true}
            suppressContentEditableWarning={true}
          />
        </div>
      </main>

      {/* Back to Top */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="no-print fixed bottom-6 right-6 w-10 h-10 rounded-full bg-brand-gold text-white shadow-lg flex items-center justify-center hover:bg-brand-gold-light transition-all z-40"
          title="Back to top"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}

      {/* Mobile Back to Config */}
      <div className="sm:hidden no-print px-4 pb-4">
        <button onClick={handleBackToConfig} className="w-full py-3 rounded-xl text-sm font-bold border border-brand-border text-brand-muted flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Config
        </button>
      </div>

      <footer className="flex items-center justify-center py-4 border-t border-brand-border text-xs text-brand-muted bg-background/50 backdrop-blur-md shrink-0 no-print">
        Powered by <span className="font-semibold ml-1 text-brand-gold">Intellogy Corporation</span>
      </footer>
    </div>
  );
}

// Word cannot render the inline-block stacked fractions, so for DOC export we
// flatten each one to an inline "(num)/(den)" that renders cleanly everywhere.
function flattenMathForWord(root: HTMLElement) {
  root.querySelectorAll('.math-frac').forEach(el => {
    const spans = el.querySelectorAll(':scope > span');
    const num = (spans[0]?.textContent || '').trim();
    const den = (spans[1]?.textContent || '').trim();
    const wrap = (t: string) => (/[\s+\-×·/=]/.test(t) ? `(${t})` : t);
    el.replaceWith(document.createTextNode(`${wrap(num)}/${wrap(den)}`));
  });
}

