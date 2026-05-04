"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePaperStore } from '@/store/paperStore';
import { ArrowLeft, Download, RotateCcw, FileText, Pencil, Loader2, Settings2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function PreviewPage() {
  const router = useRouter();
  const { generatedPaperHtml, config, setPaper } = usePaperStore();
  const paperRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (!generatedPaperHtml) { router.push('/'); }
  }, [generatedPaperHtml, router]);

  // Set innerHTML directly to avoid React contentEditable + dangerouslySetInnerHTML conflict
  useEffect(() => {
    if (generatedPaperHtml && paperRef.current) {
      paperRef.current.innerHTML = generatedPaperHtml;
    }
  }, [generatedPaperHtml]);

  if (!generatedPaperHtml) return null;

  const handleRegenerateSame = async () => {
    if (!config) return;
    setIsRegenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Failed to regenerate');
      const { data } = await res.json();
      setPaper(data, config);
    } catch (error) {
      alert('Failed to regenerate paper. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadDoc = () => {
    if (!paperRef.current) return;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Test Paper</title></head><body>";
    const footer = "</body></html>";
    const src = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(header + paperRef.current.innerHTML + footer);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.href = src;
    a.download = `${config?.examName || config?.board || 'Exam'}_${config?.subject || 'Paper'}.doc`;
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadPdf = async () => {
    if (!paperRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: `${config?.examName || config?.board || 'Exam'}_${config?.subject || 'Paper'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: '.pdf-no-break' }
      } as any).from(paperRef.current).save();
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally { setIsGeneratingPdf(false); }
  };

  const btnBase = "inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 shadow-sm";

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ background: 'var(--bg-gradient)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-3 border-b border-[#2a3050] bg-brand-navbar shrink-0">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-3">
            <div className="bg-[#1a2038] p-1 rounded-md border border-[#2a3050] flex items-center justify-center shadow-sm">
              <Image src="/image.png" alt="Logo" width={24} height={24} className="rounded-sm" />
            </div>
            <span className="text-lg font-bold tracking-widest">
              <span className="text-white">INTEL</span><span className="text-brand-gold-light">LOGY</span>
            </span>
          </Link>
          <Link href={`/configure?board=${config?.board || 'CBSE'}`} className="hidden sm:flex items-center text-sm text-brand-navbar-muted hover:text-brand-gold-light transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Config
          </Link>
        </div>
        <ThemeToggle />
      </nav>

      {/* Controls */}
      <div className="px-6 md:px-12 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-brand-card border border-brand-border shadow-sm">
          <span className="text-sm font-medium text-brand-muted">
            <span className="font-bold text-foreground">{config?.examName || config?.board}</span> • {config?.subject} • {config?.topic}
          </span>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleRegenerateSame} 
              disabled={isRegenerating}
              className={`${btnBase} bg-background border border-brand-border text-foreground hover:bg-brand-border/50 disabled:opacity-50`}
            >
              {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              {isRegenerating ? 'Generating...' : 'Regenerate'}
            </button>
            <button 
              onClick={() => router.push(`/configure?board=${config?.board || 'CBSE'}`)} 
              className={`${btnBase} bg-background border border-brand-border text-foreground hover:bg-brand-border/50`}
            >
              <Settings2 className="mr-2 h-4 w-4" /> Edit / New
            </button>
            <button onClick={handleDownloadDoc} className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700`}>
              <FileText className="mr-2 h-4 w-4" /> Download DOC
            </button>
            <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className={`${btnBase} text-white`} style={{ background: 'var(--brand-gold-gradient)', opacity: isGeneratingPdf ? 0.6 : 1 }}>
              <Download className="mr-2 h-4 w-4" /> {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Paper Container */}
      <main className="flex-1 px-6 md:px-12 pb-8 overflow-auto">
        
        {/* Editable Banner Hint */}
        <div className="max-w-5xl mx-auto mb-4 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold font-medium px-4 py-3 rounded-lg flex items-center justify-center text-sm shadow-sm animate-fade-in-up">
          <Pencil className="w-4 h-4 mr-2" />
          Pro Tip: Click anywhere inside the paper below to edit text, fix typos, or delete questions before downloading!
        </div>

        <div className="max-w-5xl mx-auto rounded-xl overflow-hidden shadow-xl border border-brand-border animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* contentEditable div — innerHTML set via useEffect to avoid React conflict */}
          <div 
            ref={paperRef} 
            className="p-6 md:p-16 leading-relaxed text-sm sm:text-base outline-none cursor-text"
            style={{ color: '#0f172a', backgroundColor: '#ffffff', fontFamily: "'Calibri', 'EB Garamond', Georgia, serif" }} 
            contentEditable={true}
            suppressContentEditableWarning={true}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-center py-4 border-t border-brand-border text-xs text-brand-muted bg-background/50 backdrop-blur-md shrink-0">
        Powered by <span className="font-semibold ml-1 text-brand-gold">Intellogy LLP</span>
      </footer>
    </div>
  );
}
