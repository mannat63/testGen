"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePaperStore } from '@/store/paperStore';
import { ArrowLeft, Download, RotateCcw, FileText, Pencil, Loader2, Settings2, ChevronUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

interface SectionInfo {
  id: string;
  name: string;
}

const REGEN_COOLDOWN_MS = 60_000;

export default function PreviewPage() {
  const router = useRouter();
  const { generatedPapers, config, setPapers } = usePaperStore();
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
      const { data } = await res.json();
      setPapers(Array.isArray(data) ? data : [data], config);
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

  const handleRegenerateQuestion = async (qNum: number) => {
    if (!paperRef.current || !config || regenCooldown > 0) return;

    const qEl = paperRef.current.querySelector(`#paper-q-${qNum}`);
    if (!qEl) {
      alert(`Question Q${qNum} not found in the paper.`);
      return;
    }

    const slotDataAttr = qEl.getAttribute('data-slot');
    if (!slotDataAttr) {
      alert('Cannot regenerate this question — missing slot data.');
      return;
    }

    let slotInfo: any;
    try {
      slotInfo = JSON.parse(slotDataAttr);
    } catch {
      alert('Invalid question data.');
      return;
    }

    setRegenLoading(qNum);
    scrollToQuestion(qNum);

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
        if (res.status === 429 || errData.error?.includes('rate')) {
          startCooldown();
          alert('Rate limit reached. Please wait 60 seconds.');
          return;
        }
        throw new Error(errData.error || 'Failed to regenerate');
      }

      const { question } = await res.json();
      if (!question) throw new Error('Empty response');

      const { main, options } = splitQuestionAndOptions(question);
      const font = "'Calibri', 'Arial', sans-serif";

      const optionsHtml = options.length > 0
        ? `<div style="margin:8px 0 8px 32px;display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:6px;">
            ${options.map(opt => `<div style="font-size:14px;font-family:${font};color:#374151;line-height:1.5;">${escHtml(opt)}</div>`).join('')}
           </div>`
        : '';

      qEl.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:8px;">
          <div style="font-size:15px;font-family:${font};color:#111827;font-weight:700;padding-top:2px;white-space:nowrap;">Q${qNum}.</div>
          <div style="font-size:15px;font-family:${font};color:#111827;line-height:1.7;flex-grow:1;">
            ${escHtml(main)} <span class="source-badge" style="font-size:9px;padding:2px 6px;border-radius:4px;background:#f3f4f6;color:#6b7280;font-weight:700;vertical-align:middle;margin:0 6px;">AI</span> <span style="color:#6b7280;font-weight:700;font-size:13px;white-space:nowrap;">[${slotInfo.marksEach} m]</span>
          </div>
        </div>
        ${optionsHtml}
      `;

      highlightQuestion(qEl, '#10b981');
      startCooldown();

    } catch {
      alert(`Failed to regenerate Q${qNum}. Please try again.`);
    } finally {
      setRegenLoading(null);
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

  const btnBase = "inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 shadow-sm";

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
          <div className="flex flex-wrap gap-2">
            <button onClick={handleRegenerate} disabled={isRegenerating || regenCooldown > 0}
              className={`${btnBase} bg-background border border-brand-border text-foreground hover:bg-brand-border/50 disabled:opacity-50`}>
              {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              {isRegenerating ? 'Generating...' : regenCooldown > 0 ? `Wait ${regenCooldown}s` : 'Regenerate All'}
            </button>
            <button onClick={handleBackToConfig}
              className={`${btnBase} bg-background border border-brand-border text-foreground hover:bg-brand-border/50`}>
              <Settings2 className="mr-2 h-4 w-4" /> Edit Config
            </button>
            <button onClick={handleDownloadDoc} className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700`}>
              <FileText className="mr-2 h-4 w-4" /> DOC
            </button>
            <button onClick={handleDownloadPdf} disabled={isGeneratingPdf}
              className={`${btnBase} text-white`} style={{ background: 'var(--brand-gold-gradient)', opacity: isGeneratingPdf ? 0.6 : 1 }}>
              <Download className="mr-2 h-4 w-4" /> {isGeneratingPdf ? 'Generating...' : 'PDF'}
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

function escHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
