"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePaperStore } from '@/store/paperStore';
import { BOARDS, BOARD_CLASSES, BOARD_SUBJECTS, LANGUAGES } from '@/config/boards';
import { getChapters, Chapter } from '@/config/chapters';
import { getDefaultPattern, ExamPattern, EXAM_PATTERNS, QUESTION_TYPE_OPTIONS } from '@/config/examPatterns';
import { ArrowLeft, Loader2, Sparkles, Clock, BookOpen, BarChart3, Settings2, Save, Layers, Database, Plus, Trash2, RotateCcw, Eye } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

interface ChapterWeight {
  chapter: Chapter;
  selected: boolean;
  weightage: number;
}

const PRESET_PATTERNS: { id: string; label: string; description: string }[] = [
  { id: 'board-default', label: 'Board Default', description: 'Official exam pattern' },
  { id: 'Weekly-25', label: 'Weekly (25m)', description: '25-mark test' },
  { id: 'Monthly-50', label: 'Monthly (50m)', description: '50-mark test' },
  { id: 'Revision-80', label: 'Revision (80m)', description: '80-mark test' },
];

const SECTION_COLORS = ['#d4af37', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
const TYPE_COLORS: Record<string, string> = {
  mcq: '#3b82f6', sa1: '#10b981', sa2: '#8b5cf6', la: '#f59e0b',
  numerical: '#06b6d4', case_study: '#ec4899', assertion_reason: '#ef4444',
};

const SESSION_KEY = 'intellogy_configure_draft';

function saveDraft(data: any) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {}
}

function loadDraft(): any | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearDraft() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

function ConfigureForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boardId = searchParams.get('board') || 'CBSE';
  const board = BOARDS.find(b => b.id === boardId) || BOARDS[0];

  const setPapers = usePaperStore(s => s.setPapers);
  const clearPaper = usePaperStore(s => s.clearPaper);
  const resetConfig = usePaperStore(s => s.resetConfig);
  const lastUsedConfig = usePaperStore(s => s.lastUsedConfig);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [saveConfigName, setSaveConfigName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [rightTab, setRightTab] = useState<'summary' | 'preview'>('summary');

  const classes = BOARD_CLASSES[board.id] || BOARD_CLASSES['CBSE'];
  const subjects = BOARD_SUBJECTS[board.id] || BOARD_SUBJECTS['CBSE'];

  // Restore priority: sessionStorage draft > lastUsedConfig > defaults
  const draft = useRef(loadDraft()).current;
  const hasDraft = draft && draft.board === boardId;
  const hasRestored = hasDraft || (lastUsedConfig && lastUsedConfig.board === boardId);
  const src = hasDraft ? draft : (lastUsedConfig && lastUsedConfig.board === boardId ? lastUsedConfig : null);

  const [classLevel, setClassLevel] = useState(src ? src.class_grade : classes[0]);
  const [subject, setSubject] = useState(src ? src.subject : subjects[0]);
  const [chapterWeights, setChapterWeights] = useState<ChapterWeight[]>([]);

  const [pattern, setPattern] = useState<ExamPattern | null>(null);
  const [customSections, setCustomSections] = useState<ExamPattern['sections']>([]);
  const [activePreset, setActivePreset] = useState<string>('board-default');

  const [diffDist, setDiffDist] = useState(src?.difficulty || { easy: 30, medium: 50, hard: 20 });
  const [schoolName, setSchoolName] = useState(src?.schoolName || '');
  const [examName, setExamName] = useState(src?.examName || '');
  const [examDate, setExamDate] = useState(src?.examDate || '');
  const [examDuration, setExamDuration] = useState(src?.examDuration || '3 Hours');
  const [language, setLanguage] = useState(src?.language || 'English');
  const [numSets, setNumSets] = useState(src?.numSets || 1);
  const [sourceMix, setSourceMix] = useState(src?.sourceMix || { questionBank: 70, coaching: 0, ai: 30 });

  const restoredRef = useRef(false);

  useEffect(() => { clearPaper(); }, [clearPaper]);

  useEffect(() => {
    if (src && !restoredRef.current) {
      restoredRef.current = true;
      const chs = getChapters(src.board || boardId, src.class_grade, src.subject);
      const chaptersData = src.chapters || [];
      setChapterWeights(chs.map(ch => {
        const found = chaptersData.find((tc: any) => tc.chapterId === ch.id);
        return { chapter: ch, selected: !!found, weightage: found?.weightage || ch.defaultMarks };
      }));
      if (src.sections) {
        setCustomSections(JSON.parse(JSON.stringify(src.sections)));
        setActivePreset('custom');
      }
      const p = getDefaultPattern(src.board || boardId, src.class_grade, src.subject);
      if (p) setPattern(p);
      return;
    }

    const chs = getChapters(board.id, classLevel, subject);
    setChapterWeights(chs.map(c => ({ chapter: c, selected: true, weightage: c.defaultMarks })));
    const p = getDefaultPattern(board.id, classLevel, subject);
    if (p) {
      setPattern(p);
      setCustomSections(JSON.parse(JSON.stringify(p.sections)));
      setActivePreset('board-default');
    }
  }, [board.id, classLevel, subject]);

  // Auto-save draft to sessionStorage on every config change
  const selectedChapters = chapterWeights.filter(cw => cw.selected);
  useEffect(() => {
    if (!restoredRef.current && !src) return;
    saveDraft({
      board: board.id,
      class_grade: classLevel,
      subject,
      chapters: selectedChapters.map(cw => ({ chapterId: cw.chapter.id, chapterName: cw.chapter.name, weightage: cw.weightage })),
      sections: customSections,
      difficulty: diffDist,
      schoolName, examName, examDate, examDuration,
      language, numSets, sourceMix,
    });
  }, [board.id, classLevel, subject, chapterWeights, customSections, diffDist, schoolName, examName, examDate, examDuration, language, numSets, sourceMix]);

  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(d => setTemplates(d.data || [])).catch(() => {});
    fetch('/api/configs').then(r => r.json()).then(d => setSavedConfigs(d.data || [])).catch(() => {});
  }, []);

  const loadTemplate = useCallback((tmpl: any) => {
    if (tmpl.board) {
      setClassLevel(tmpl.classLevel || classes[0]);
      setSubject(tmpl.subject || subjects[0]);
    }
    if (tmpl.chapters?.length) {
      const chs = getChapters(tmpl.board || board.id, tmpl.classLevel || classLevel, tmpl.subject || subject);
      setChapterWeights(chs.map(c => {
        const found = tmpl.chapters.find((tc: any) => tc.chapterId === c.id);
        return { chapter: c, selected: !!found, weightage: found?.weightage || c.defaultMarks };
      }));
    }
    if (tmpl.sections?.length) {
      setCustomSections(JSON.parse(JSON.stringify(tmpl.sections)));
      setActivePreset('custom');
    }
    if (tmpl.difficulty) setDiffDist(tmpl.difficulty);
    if (tmpl.duration) setExamDuration(tmpl.duration + ' min');
    if (tmpl.language) setLanguage(tmpl.language);
  }, [board.id, classLevel, subject, classes, subjects]);

  const loadSavedConfig = useCallback((cfg: any) => {
    const c = cfg.config;
    if (c.class_grade) setClassLevel(c.class_grade);
    if (c.subject) setSubject(c.subject);
    if (c.schoolName) setSchoolName(c.schoolName);
    if (c.examName) setExamName(c.examName);
    if (c.examDate) setExamDate(c.examDate);
    if (c.examDuration) setExamDuration(c.examDuration);
    if (c.language) setLanguage(c.language);
    if (c.numSets) setNumSets(c.numSets);
    if (c.difficulty) setDiffDist(c.difficulty);
    if (c.sections) {
      setCustomSections(JSON.parse(JSON.stringify(c.sections)));
      setActivePreset('custom');
    }
    if (c.chapters) {
      const chs = getChapters(c.board || board.id, c.class_grade || classLevel, c.subject || subject);
      setChapterWeights(chs.map(ch => {
        const found = c.chapters.find((tc: any) => tc.chapterId === ch.id);
        return { chapter: ch, selected: !!found, weightage: found?.weightage || ch.defaultMarks };
      }));
    }
    if (c.sourceMix) setSourceMix(c.sourceMix);
  }, [board.id, classLevel, subject]);

  const applyPreset = (presetId: string) => {
    setActivePreset(presetId);
    if (presetId === 'board-default') {
      const p = getDefaultPattern(board.id, classLevel, subject);
      if (p) {
        setPattern(p);
        setCustomSections(JSON.parse(JSON.stringify(p.sections)));
      }
    } else if (EXAM_PATTERNS[presetId]) {
      const p = EXAM_PATTERNS[presetId];
      setCustomSections(JSON.parse(JSON.stringify(p.sections)));
    }
  };

  const handleResetToDefault = () => {
    resetConfig();
    clearDraft();
    const chs = getChapters(board.id, classLevel, subject);
    setChapterWeights(chs.map(c => ({ chapter: c, selected: true, weightage: c.defaultMarks })));
    const p = getDefaultPattern(board.id, classLevel, subject);
    if (p) {
      setPattern(p);
      setCustomSections(JSON.parse(JSON.stringify(p.sections)));
    }
    setActivePreset('board-default');
    setDiffDist({ easy: 30, medium: 50, hard: 20 });
    setSchoolName('');
    setExamName('');
    setExamDate('');
    setExamDuration('3 Hours');
    setLanguage('English');
    setNumSets(1);
    setSourceMix({ questionBank: 70, coaching: 0, ai: 30 });
  };

  const toggleChapter = (idx: number) => {
    setChapterWeights(prev => prev.map((cw, i) => i === idx ? { ...cw, selected: !cw.selected } : cw));
  };

  const updateWeightage = (idx: number, val: number) => {
    setChapterWeights(prev => prev.map((cw, i) => i === idx ? { ...cw, weightage: val } : cw));
  };

  const selectAllChapters = () => setChapterWeights(prev => prev.map(cw => ({ ...cw, selected: true })));
  const clearAllChapters = () => setChapterWeights(prev => prev.map(cw => ({ ...cw, selected: false })));

  const updateSectionQType = (sIdx: number, qIdx: number, field: string, value: number) => {
    setCustomSections(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[sIdx].questionTypes[qIdx][field] = value;
      return next;
    });
    setActivePreset('custom');
  };

  const addQuestionType = (sIdx: number, typeValue: string) => {
    const typeOpt = QUESTION_TYPE_OPTIONS.find(o => o.value === typeValue);
    if (!typeOpt) return;
    const defaultMarks: Record<string, number> = { mcq: 1, sa1: 2, sa2: 3, la: 5, numerical: 4, case_study: 4, assertion_reason: 1 };
    setCustomSections(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[sIdx].questionTypes.push({
        type: typeValue,
        label: typeOpt.label,
        marksEach: defaultMarks[typeValue] || 1,
        count: 5,
      });
      return next;
    });
    setActivePreset('custom');
  };

  const removeQuestionType = (sIdx: number, qIdx: number) => {
    setCustomSections(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[sIdx].questionTypes.splice(qIdx, 1);
      if (next[sIdx].questionTypes.length === 0) {
        next.splice(sIdx, 1);
      }
      return next;
    });
    setActivePreset('custom');
  };

  const addSection = () => {
    const sectionNum = customSections.length + 1;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const letter = letters[sectionNum - 1] || sectionNum.toString();
    setCustomSections(prev => [
      ...prev,
      { name: `Section ${letter}`, questionTypes: [{ type: 'mcq' as const, label: 'MCQ', marksEach: 1, count: 5 }] },
    ]);
    setActivePreset('custom');
  };

  const removeSection = (sIdx: number) => {
    setCustomSections(prev => prev.filter((_, i) => i !== sIdx));
    setActivePreset('custom');
  };

  const updateSectionName = (sIdx: number, name: string) => {
    setCustomSections((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[sIdx].name = name;
      return next;
    });
  };

  const handleDiffChange = (key: 'easy' | 'medium' | 'hard', val: number) => {
    const others = (['easy', 'medium', 'hard'] as const).filter(k => k !== key);
    const remaining = 100 - val;
    const otherTotal = diffDist[others[0]] + diffDist[others[1]];
    setDiffDist((prev: any) => {
      const next = { ...prev, [key]: val };
      if (otherTotal > 0) {
        next[others[0]] = Math.round((prev[others[0]] / otherTotal) * remaining);
        next[others[1]] = remaining - next[others[0]];
      } else {
        next[others[0]] = Math.floor(remaining / 2);
        next[others[1]] = remaining - next[others[0]];
      }
      return next;
    });
  };

  const handleSourceChange = (dbPct: number) => {
    const clamped = Math.max(0, Math.min(100, dbPct));
    setSourceMix({ questionBank: clamped, coaching: 0, ai: 100 - clamped });
  };

  const totalMarks = customSections.reduce((sum, sec) =>
    sum + sec.questionTypes.reduce((s, qt) => s + qt.marksEach * qt.count, 0), 0);
  const totalQuestions = customSections.reduce((sum, sec) =>
    sum + sec.questionTypes.reduce((s, qt) => s + qt.count, 0), 0);

  const buildConfig = () => ({
    board: board.id,
    class_grade: classLevel,
    subject,
    chapters: selectedChapters.map(cw => ({
      chapterId: cw.chapter.id,
      chapterName: cw.chapter.name,
      weightage: cw.weightage,
    })),
    sections: customSections,
    difficulty: diffDist,
    totalMarks,
    duration: parseInt(examDuration) || 180,
    language,
    schoolName,
    examName,
    examDate,
    examDuration,
    numSets,
    sourceMix,
  });

  const handleSaveConfig = async () => {
    if (!saveConfigName.trim()) return;
    try {
      await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveConfigName, config: buildConfig() }),
      });
      const res = await fetch('/api/configs');
      const d = await res.json();
      setSavedConfigs(d.data || []);
      setShowSaveModal(false);
      setSaveConfigName('');
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) { setError('Please provide a School / Institute Name'); return; }
    if (!examName.trim()) { setError('Please provide an Exam Name'); return; }
    if (selectedChapters.length === 0) { setError('Please select at least one chapter'); return; }
    if (totalQuestions === 0) { setError('Please configure at least one question type'); return; }

    setIsLoading(true);
    setError('');

    try {
      const config = buildConfig();
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate paper');
      }
      const { data, answerKeys, validation } = await res.json();
      setPapers(Array.isArray(data) ? data : [data], config, answerKeys, validation);
      clearDraft();
      router.push('/preview');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const sel = "block w-full rounded-lg py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 bg-background border border-brand-border text-foreground transition-colors";
  const cardCls = "p-4 rounded-2xl border border-brand-border bg-brand-card shadow-sm";
  const headCls = "text-xs font-bold uppercase tracking-wider text-brand-muted mb-4 flex items-center";

  // Build question numbering for paper preview
  let qCounter = 0;
  const previewSections = customSections.map((sec, sIdx) => {
    const questions = sec.questionTypes.flatMap(qt =>
      Array.from({ length: qt.count }, () => { qCounter++; return { num: qCounter, type: qt.type, label: qt.label, marks: qt.marksEach }; })
    );
    return { name: sec.name, questions, sIdx };
  });

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col transition-colors duration-300" style={{ background: 'var(--bg-gradient)' }}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 sm:px-6 md:px-12 py-3 border-b border-[#2a3050] bg-brand-navbar shrink-0 z-10">
        <div className="flex items-center space-x-3 sm:space-x-6">
          <Link href="/" className="flex items-center text-brand-navbar-muted hover:text-brand-gold-light transition-colors">
            <ArrowLeft className="h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline text-sm">Dashboard</span>
          </Link>
          <div className="flex items-center space-x-3 pointer-events-none">
            <img src="/image.png" alt="Logo" className="h-7 w-auto object-contain drop-shadow-sm" />
            <span className="text-lg font-bold tracking-widest hidden sm:inline-block">
              <span className="text-foreground">INTELLOGY</span><span className="text-[#d4af37] ml-1.5 text-sm uppercase">Corporation</span>
            </span>
          </div>
        </div>
        <ThemeToggle />
      </nav>

      {/* ═══ MAIN: two-column, left scrolls, right fixed ═══ */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">

        {/* ── LEFT: scrollable config ── */}
        <div className="flex-1 overflow-y-auto py-6 px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5 animate-fade-in-up">

            {/* Banner */}
            <div className="relative w-full h-28 sm:h-36 rounded-2xl overflow-hidden shadow-sm border border-brand-border">
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/5 z-10" />
              <img src="/hero_landscape.png" alt="Banner" className="absolute inset-0 w-full h-full object-cover opacity-90" />
              <div className="relative z-20 h-full flex flex-col justify-center px-8">
                <p className="text-xs font-bold text-brand-gold uppercase tracking-widest mb-1">
                  {(() => { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'; })()} 👋
                </p>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mb-1">Configure Paper</h1>
                <p className="text-sm text-brand-muted font-medium">Set up exam parameters for {board.name}</p>
              </div>
            </div>

            {(hasRestored || hasDraft) && (
              <div className="rounded-lg px-4 py-3 text-sm bg-brand-gold/10 border border-brand-gold/30 text-brand-gold flex items-center justify-between">
                <span>{hasDraft ? 'Restored your unsaved draft.' : 'Restored from your last generated paper.'} Edit or start fresh.</span>
                <button type="button" onClick={handleResetToDefault} className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-brand-gold/40 hover:bg-brand-gold/20 transition-colors shrink-0">
                  <RotateCcw className="w-3 h-3" /> Start Fresh
                </button>
              </div>
            )}

            {error && (
              <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-500">{error}</div>
            )}

            {/* Quick Start */}
            {(templates.length > 0 || savedConfigs.length > 0) && (
              <div className={cardCls}>
                <h3 className={headCls}><Layers className="w-3.5 h-3.5 mr-2 text-brand-gold" /> Quick Start</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {templates.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Admin Templates</label>
                      <select onChange={e => { const t = templates.find((t: any) => t._id === e.target.value); if (t) loadTemplate(t); }} className={sel} defaultValue="">
                        <option value="" disabled>Choose template...</option>
                        {templates.map((t: any) => <option key={t._id} value={t._id}>{t.name} ({t.type}) — {t.subject}</option>)}
                      </select>
                    </div>
                  )}
                  {savedConfigs.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Saved Configurations</label>
                      <select onChange={e => { const c = savedConfigs.find((c: any) => c._id === e.target.value); if (c) loadSavedConfig(c); }} className={sel} defaultValue="">
                        <option value="" disabled>Load saved config...</option>
                        {savedConfigs.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Exam Setup */}
            <div className={cardCls}>
              <h3 className={headCls}><Settings2 className="w-3.5 h-3.5 mr-2 text-brand-gold" /> Exam Setup</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Board</label>
                  <input type="text" value={board.name} disabled className={`${sel} opacity-60 cursor-not-allowed`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Class</label>
                  <select value={classLevel} onChange={e => setClassLevel(e.target.value)} className={sel}>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Subject</label>
                  <select value={subject} onChange={e => setSubject(e.target.value)} className={sel}>
                    {subjects.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Language</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)} className={sel}>
                    {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Chapter Selection */}
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`${headCls} mb-0`}><BookOpen className="w-3.5 h-3.5 mr-2 text-brand-gold" /> Chapters & Weightage</h3>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAllChapters} className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border border-brand-border text-brand-muted hover:text-brand-gold hover:border-brand-gold transition-colors">All</button>
                  <button type="button" onClick={clearAllChapters} className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border border-brand-border text-brand-muted hover:text-red-400 hover:border-red-400 transition-colors">Clear</button>
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
                {chapterWeights.map((cw, idx) => (
                  <div key={cw.chapter.id} className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${cw.selected ? 'bg-brand-gold/5 border border-brand-gold/20' : 'bg-background/50 border border-transparent'}`}>
                    <input type="checkbox" checked={cw.selected} onChange={() => toggleChapter(idx)} className="rounded border-brand-border text-brand-gold focus:ring-brand-gold/50 shrink-0" />
                    <span className={`flex-1 text-sm truncate ${cw.selected ? 'text-foreground font-medium' : 'text-brand-muted'}`}>{cw.chapter.name}</span>
                    {cw.selected && (
                      <div className="flex items-center gap-2 shrink-0">
                        <input type="number" min={1} max={100} value={cw.weightage} onChange={e => updateWeightage(idx, parseInt(e.target.value) || 1)} className="w-14 text-center text-xs py-1 px-1 rounded border border-brand-border bg-background text-foreground focus:ring-1 focus:ring-brand-gold/50 focus:outline-none" />
                        <span className="text-[10px] text-brand-muted w-4">wt</span>
                      </div>
                    )}
                  </div>
                ))}
                {chapterWeights.length === 0 && <p className="text-sm text-brand-muted italic py-4 text-center">No chapters available.</p>}
              </div>
              <div className="mt-3 text-xs text-brand-muted flex justify-between border-t border-brand-border pt-3">
                <span>{selectedChapters.length} of {chapterWeights.length} selected</span>
                <span>Total weightage: {selectedChapters.reduce((s, c) => s + c.weightage, 0)}</span>
              </div>
            </div>

            {/* Question Distribution Builder */}
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`${headCls} mb-0`}><BarChart3 className="w-3.5 h-3.5 mr-2 text-brand-gold" /> Question Distribution</h3>
                {pattern && (
                  <button type="button" onClick={() => applyPreset('board-default')} className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border border-brand-border text-brand-muted hover:text-brand-gold hover:border-brand-gold transition-colors">
                    <RotateCcw className="w-3 h-3 inline mr-1" />Reset
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {PRESET_PATTERNS.map(pp => (
                  <button key={pp.id} type="button" onClick={() => applyPreset(pp.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${activePreset === pp.id ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-brand-border text-brand-muted hover:border-brand-gold/50 hover:text-foreground'}`}
                    title={pp.description}>{pp.label}</button>
                ))}
                <button type="button" onClick={() => setActivePreset('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${activePreset === 'custom' ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-brand-border text-brand-muted hover:border-brand-gold/50 hover:text-foreground'}`}>Custom</button>
              </div>
              {customSections.map((sec, sIdx) => (
                <div key={sIdx} className="mb-5 last:mb-0 p-3 rounded-xl border border-brand-border/60 bg-background/30">
                  <div className="flex items-center justify-between mb-2">
                    <input type="text" value={sec.name} onChange={e => updateSectionName(sIdx, e.target.value)} className="text-xs font-bold text-foreground bg-transparent border-none focus:outline-none focus:ring-0 p-0 flex-1" />
                    {customSections.length > 1 && <button type="button" onClick={() => removeSection(sIdx)} className="text-brand-muted hover:text-red-500 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-brand-muted">
                        <th className="text-left py-1 px-2 font-semibold">Type</th>
                        <th className="text-center py-1 px-2 font-semibold">Count</th>
                        <th className="text-center py-1 px-2 font-semibold">Marks</th>
                        <th className="text-center py-1 px-2 font-semibold">Sub</th>
                        <th className="w-7"></th>
                      </tr></thead>
                      <tbody>
                        {sec.questionTypes.map((qt, qIdx) => (
                          <tr key={qIdx} className="border-t border-brand-border/50">
                            <td className="py-2 px-2 text-foreground font-medium">{qt.label}</td>
                            <td className="py-2 px-2 text-center"><input type="number" min={0} max={200} value={qt.count} onChange={e => updateSectionQType(sIdx, qIdx, 'count', parseInt(e.target.value) || 0)} className="w-14 text-center text-xs py-1 rounded border border-brand-border bg-background text-foreground focus:ring-1 focus:ring-brand-gold/50 focus:outline-none" /></td>
                            <td className="py-2 px-2 text-center"><input type="number" min={1} max={20} value={qt.marksEach} onChange={e => updateSectionQType(sIdx, qIdx, 'marksEach', parseInt(e.target.value) || 1)} className="w-14 text-center text-xs py-1 rounded border border-brand-border bg-background text-foreground focus:ring-1 focus:ring-brand-gold/50 focus:outline-none" /></td>
                            <td className="py-2 px-2 text-center font-semibold text-brand-gold">{qt.count * qt.marksEach}</td>
                            <td className="py-2 px-1 text-center"><button type="button" onClick={() => removeQuestionType(sIdx, qIdx)} className="text-brand-muted hover:text-red-500 transition-colors p-0.5"><Trash2 className="w-3 h-3" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 pt-2 border-t border-brand-border/30">
                    <select defaultValue="" onChange={e => { if (e.target.value) { addQuestionType(sIdx, e.target.value); e.target.value = ''; } }}
                      className="text-xs py-1.5 px-2 rounded-lg border border-dashed border-brand-border text-brand-muted bg-transparent hover:border-brand-gold/50 focus:outline-none focus:ring-1 focus:ring-brand-gold/50 cursor-pointer">
                      <option value="" disabled>+ Add question type...</option>
                      {QUESTION_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addSection} className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-brand-border text-xs font-bold text-brand-muted hover:text-brand-gold hover:border-brand-gold/50 transition-colors flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Section
              </button>
              <div className="mt-3 flex justify-between items-center border-t border-brand-border pt-3 text-sm font-bold">
                <span className="text-foreground">{totalQuestions} Questions</span>
                <span className="text-brand-gold">{totalMarks} Marks</span>
              </div>
            </div>

            {/* Difficulty */}
            <div className={cardCls}>
              <h3 className={headCls}><Sparkles className="w-3.5 h-3.5 mr-2 text-brand-gold" /> Difficulty Distribution</h3>
              <div className="grid grid-cols-3 gap-4">
                {(['easy', 'medium', 'hard'] as const).map(level => (
                  <div key={level} className="text-center">
                    <label className="block text-xs font-semibold mb-2 capitalize text-brand-muted">{level}</label>
                    <input type="range" min={0} max={100} value={diffDist[level]} onChange={e => handleDiffChange(level, parseInt(e.target.value))} className="w-full accent-brand-gold" />
                    <span className={`text-sm font-bold ${level === 'easy' ? 'text-green-500' : level === 'medium' ? 'text-blue-500' : 'text-red-500'}`}>{diffDist[level]}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Source Mix */}
            <div className={cardCls}>
              <h3 className={headCls}><Database className="w-3.5 h-3.5 mr-2 text-brand-gold" /> Question Source Mix</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-brand-muted">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Question Bank</span>
                  <span className="flex items-center gap-1.5">AI Generated <span className="w-2 h-2 rounded-full bg-gray-400" /></span>
                </div>
                <input type="range" min={0} max={100} step={5} value={sourceMix.questionBank}
                  onChange={e => handleSourceChange(parseInt(e.target.value))}
                  className="w-full accent-brand-gold" />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-blue-500">{sourceMix.questionBank}% DB</span>
                  <span className="text-gray-500">{sourceMix.ai}% AI</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-200">
                  <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${sourceMix.questionBank}%` }} />
                  <div className="h-full bg-gray-400 transition-all duration-200" style={{ width: `${sourceMix.ai}%` }} />
                </div>
                <p className="text-[10px] text-brand-muted">
                  {sourceMix.questionBank > 0
                    ? `~${Math.round(totalQuestions * sourceMix.questionBank / 100)} questions from database, ~${Math.round(totalQuestions * sourceMix.ai / 100)} AI-generated`
                    : 'All questions will be AI-generated'}
                  {sourceMix.questionBank > 0 && ' · AI questions are curated using DB question style'}
                </p>
              </div>
            </div>

            {/* Paper Details */}
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`${headCls} mb-0`}><Settings2 className="w-3.5 h-3.5 mr-2 text-brand-gold" /> Paper Details</h3>
                <button type="button" onClick={() => { setSchoolName("Intellogy Demo Institute"); setExamName("Mid Term Exam"); setExamDate(new Date().toISOString().split('T')[0]); setExamDuration("180 min"); }} className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border border-brand-border text-brand-muted hover:text-brand-gold hover:border-brand-gold transition-colors">Auto-fill</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Institute Name *</label>
                  <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. ABC Public School" className={sel} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Exam Name *</label>
                  <input type="text" value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g. Mid Term" className={sel} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Date</label>
                  <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className={sel} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Duration</label>
                  <input type="text" value={examDuration} onChange={e => setExamDuration(e.target.value)} placeholder="3 Hours" className={sel} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Number of Sets</label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(n => (
                      <button key={n} type="button" onClick={() => setNumSets(n)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${numSets === n ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-brand-border text-brand-muted hover:border-brand-gold/50'}`}>
                        {n === 1 ? 'Single' : `${n} Sets`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button type="button" onClick={() => setShowSaveModal(true)} className="flex items-center justify-center py-3 px-5 rounded-xl text-sm font-bold border border-brand-border text-brand-muted hover:text-brand-gold hover:border-brand-gold transition-all">
                <Save className="w-4 h-4 mr-2" /> Save
              </button>
              <button type="button" onClick={handleResetToDefault} className="flex items-center justify-center py-3 px-5 rounded-xl text-sm font-bold border border-brand-border text-brand-muted hover:text-red-400 hover:border-red-400 transition-all">
                <RotateCcw className="w-4 h-4 mr-2" /> Reset
              </button>
              <button type="submit" disabled={isLoading} className="flex-1 flex justify-center items-center py-4 rounded-xl text-base font-bold disabled:opacity-50 text-white transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                style={{ background: isLoading ? 'var(--brand-muted)' : 'var(--brand-gold-gradient)' }}>
                {isLoading
                  ? <><Loader2 className="animate-spin mr-3 h-5 w-5" />Generating — please wait, AI batching in progress...</>
                  : <>Generate {numSets > 1 ? `${numSets} Sets` : 'Test Paper'}</>}
              </button>
            </div>
            <div className="text-center text-xs text-brand-muted font-medium flex items-center justify-center pb-6">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              {(() => {
                const aiQ = Math.round(totalQuestions * sourceMix.ai / 100);
                const chunks = Math.ceil(aiQ / 8);
                if (numSets > 1) return `~${numSets * 2} min (${numSets} sets × API rate limits)`;
                if (chunks <= 1) return '~10-15 seconds';
                return `~${Math.ceil(chunks * 15 / 60)}-${Math.ceil(chunks * 18 / 60)} min (${aiQ} AI questions in ${chunks} batches)`;
              })()}
            </div>
          </form>
        </div>

        {/* ── RIGHT: fixed panel with tabs ── */}
        <div className="hidden xl:flex xl:w-[400px] shrink-0 border-l border-brand-border flex-col overflow-hidden" style={{ background: 'var(--bg-gradient)' }}>
          {/* Tab bar */}
          <div className="flex border-b border-brand-border shrink-0">
            <button onClick={() => setRightTab('summary')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${rightTab === 'summary' ? 'text-brand-gold border-b-2 border-brand-gold bg-brand-card/50' : 'text-brand-muted hover:text-foreground'}`}>
              <BarChart3 className="w-3.5 h-3.5" /> Summary
            </button>
            <button onClick={() => setRightTab('preview')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${rightTab === 'preview' ? 'text-brand-gold border-b-2 border-brand-gold bg-brand-card/50' : 'text-brand-muted hover:text-foreground'}`}>
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>

            {rightTab === 'summary' && (
              <div className="space-y-5 animate-fade-in-up">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total Marks', value: totalMarks, color: 'text-brand-gold' },
                    { label: 'Questions', value: totalQuestions, color: 'text-blue-500' },
                    { label: 'Sections', value: customSections.length, color: 'text-purple-500' },
                    { label: 'Est. Duration', value: `${Math.round(totalMarks * 1.2)}m`, color: 'text-green-500' },
                  ].map(stat => (
                    <div key={stat.label} className="text-center p-3 rounded-xl bg-brand-card border border-brand-border/40">
                      <div className={`text-xl font-extrabold ${stat.color}`}>{stat.value}</div>
                      <div className="text-[9px] font-semibold text-brand-muted uppercase tracking-wider">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Marks by Section bar */}
                <div className="rounded-xl border border-brand-border bg-brand-card p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">Marks by Section</div>
                  <div className="w-full h-7 rounded-lg overflow-hidden flex">
                    {customSections.map((sec, idx) => {
                      const secMarks = sec.questionTypes.reduce((s, qt) => s + qt.marksEach * qt.count, 0);
                      const pct = totalMarks > 0 ? (secMarks / totalMarks) * 100 : 0;
                      if (pct === 0) return null;
                      return (
                        <div key={idx} className="h-full flex items-center justify-center text-white text-[9px] font-bold transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: SECTION_COLORS[idx % SECTION_COLORS.length], minWidth: '20px' }}
                          title={`${sec.name}: ${secMarks}m (${Math.round(pct)}%)`}>
                          {pct >= 14 && `${secMarks}m`}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {customSections.map((sec, idx) => {
                      const secMarks = sec.questionTypes.reduce((s, qt) => s + qt.marksEach * qt.count, 0);
                      if (secMarks === 0) return null;
                      return (
                        <div key={idx} className="flex items-center gap-1 text-[9px] text-brand-muted">
                          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: SECTION_COLORS[idx % SECTION_COLORS.length] }} />
                          <span className="truncate max-w-[100px]">{sec.name}</span>
                          <span className="font-bold text-foreground">{secMarks}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Question Type Bars */}
                <div className="rounded-xl border border-brand-border bg-brand-card p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">Question Types</div>
                  <div className="space-y-1.5">
                    {(() => {
                      const typeTotals: Record<string, { count: number; marks: number; label: string }> = {};
                      customSections.forEach(sec => {
                        sec.questionTypes.forEach(qt => {
                          if (!typeTotals[qt.type]) typeTotals[qt.type] = { count: 0, marks: 0, label: qt.label };
                          typeTotals[qt.type].count += qt.count;
                          typeTotals[qt.type].marks += qt.count * qt.marksEach;
                        });
                      });
                      return Object.entries(typeTotals).map(([type, data]) => {
                        const pct = totalMarks > 0 ? (data.marks / totalMarks) * 100 : 0;
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <div className="w-16 text-[10px] font-medium text-foreground truncate">{data.label}</div>
                            <div className="flex-1 h-3.5 rounded bg-background/60 border border-brand-border/30 overflow-hidden">
                              <div className="h-full rounded transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: TYPE_COLORS[type] || '#6b7280' }} />
                            </div>
                            <div className="w-16 text-right text-[10px] text-brand-muted">
                              <span className="font-bold text-foreground">{data.count}</span>Q <span className="font-bold text-foreground">{data.marks}</span>m
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Difficulty Mix */}
                <div className="rounded-xl border border-brand-border bg-brand-card p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">Difficulty Mix</div>
                  <div className="w-full h-5 rounded-lg overflow-hidden flex">
                    <div className="h-full flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${diffDist.easy}%`, backgroundColor: '#22c55e', minWidth: diffDist.easy > 0 ? '16px' : '0' }}>
                      {diffDist.easy >= 18 && `${diffDist.easy}%`}
                    </div>
                    <div className="h-full flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${diffDist.medium}%`, backgroundColor: '#3b82f6', minWidth: diffDist.medium > 0 ? '16px' : '0' }}>
                      {diffDist.medium >= 18 && `${diffDist.medium}%`}
                    </div>
                    <div className="h-full flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${diffDist.hard}%`, backgroundColor: '#ef4444', minWidth: diffDist.hard > 0 ? '16px' : '0' }}>
                      {diffDist.hard >= 18 && `${diffDist.hard}%`}
                    </div>
                  </div>
                  <div className="flex justify-between mt-1.5 text-[9px] font-semibold">
                    <span className="text-green-500">Easy ~{Math.round(totalQuestions * diffDist.easy / 100)}Q</span>
                    <span className="text-blue-500">Med ~{Math.round(totalQuestions * diffDist.medium / 100)}Q</span>
                    <span className="text-red-500">Hard ~{Math.round(totalQuestions * diffDist.hard / 100)}Q</span>
                  </div>
                </div>
              </div>
            )}

            {rightTab === 'preview' && (
              <div className="animate-fade-in-up">
                {/* Mini paper mockup */}
                <div className="rounded-xl border border-brand-border bg-white overflow-hidden shadow-inner" style={{ fontFamily: "'Calibri', 'Arial', sans-serif" }}>
                  <div className="px-4 py-3 border-b border-gray-200 text-center">
                    <div className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">
                      {schoolName || 'School / Institute Name'}
                    </div>
                    <div className="text-[10px] font-semibold text-gray-700 mt-0.5">
                      {examName || 'Exam Name'} — {subject}
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-500 mt-1 px-2">
                      <span>Class: {classLevel}</span>
                      <span>Marks: {totalMarks}</span>
                      <span>Time: {examDuration}</span>
                    </div>
                    {examDate && <div className="text-[9px] text-gray-400 mt-0.5">Date: {examDate}</div>}
                  </div>

                  <div className="px-3 py-2">
                    {previewSections.map(sec => {
                      const secMarks = customSections[sec.sIdx].questionTypes.reduce((s, qt) => s + qt.marksEach * qt.count, 0);
                      return (
                        <div key={sec.sIdx} className="mb-3 last:mb-1">
                          <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-gray-100">
                            <div className="w-1.5 h-4 rounded-sm" style={{ backgroundColor: SECTION_COLORS[sec.sIdx % SECTION_COLORS.length] }} />
                            <span className="text-[10px] font-bold text-gray-700 flex-1">{sec.name}</span>
                            <span className="text-[9px] text-gray-400 font-semibold">{secMarks}m</span>
                          </div>
                          <div className="space-y-1 pl-3">
                            {sec.questions.slice(0, 8).map(q => (
                              <div key={q.num} className="flex items-start gap-1.5">
                                <span className="text-[9px] font-bold text-gray-500 w-5 shrink-0 pt-px">Q{q.num}.</span>
                                <div className="flex-1">
                                  <div className="h-2 rounded-sm bg-gray-100 w-full" />
                                  {(q.type === 'mcq' || q.type === 'assertion_reason') && (
                                    <div className="flex gap-3 mt-0.5 ml-1">
                                      {['a', 'b', 'c', 'd'].map(opt => (
                                        <div key={opt} className="flex items-center gap-0.5">
                                          <span className="text-[7px] text-gray-400">({opt})</span>
                                          <div className="h-1.5 w-8 rounded-sm bg-gray-50" />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="text-[8px] text-gray-400 font-semibold shrink-0">[{q.marks}m]</span>
                              </div>
                            ))}
                            {sec.questions.length > 8 && (
                              <div className="text-[8px] text-gray-400 italic pl-5">+{sec.questions.length - 8} more questions...</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {previewSections.length === 0 && (
                      <div className="text-center py-6 text-[10px] text-gray-400 italic">Configure sections to see preview</div>
                    )}
                  </div>

                  <div className="px-4 py-1.5 border-t border-gray-100 text-center">
                    <div className="text-[8px] text-gray-300">— End of Paper —</div>
                  </div>
                </div>
                <div className="mt-3 text-center text-[10px] text-brand-muted">Live preview updates as you configure</div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: collapsible summary below (shown only on smaller screens) */}
        <div className="xl:hidden px-4 pb-6">
          <details className="rounded-2xl border border-brand-border bg-brand-card shadow-sm">
            <summary className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-brand-muted cursor-pointer flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-brand-gold" />
              Assessment Summary — {totalQuestions}Q · {totalMarks}m
            </summary>
            <div className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Marks', value: totalMarks, color: 'text-brand-gold' },
                  { label: 'Questions', value: totalQuestions, color: 'text-blue-500' },
                  { label: 'Sections', value: customSections.length, color: 'text-purple-500' },
                  { label: 'Duration', value: `${Math.round(totalMarks * 1.2)}m`, color: 'text-green-500' },
                ].map(s => (
                  <div key={s.label} className="text-center p-2 rounded-lg bg-background/60">
                    <div className={`text-base font-extrabold ${s.color}`}>{s.value}</div>
                    <div className="text-[8px] font-semibold text-brand-muted uppercase">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Save Config Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowSaveModal(false)}>
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground mb-4">Save Configuration</h3>
            <input type="text" value={saveConfigName} onChange={e => setSaveConfigName(e.target.value)} placeholder="e.g. Physics Weekly Chapter 1-3" className={`${sel} mb-4`} autoFocus />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowSaveModal(false)} className="flex-1 py-2 rounded-lg border border-brand-border text-brand-muted font-semibold text-sm hover:bg-background transition-colors">Cancel</button>
              <button type="button" onClick={handleSaveConfig} disabled={!saveConfigName.trim()} className="flex-1 py-2 rounded-lg text-white font-semibold text-sm disabled:opacity-50 transition-all" style={{ background: 'var(--brand-gold-gradient)' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfigurePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-10 h-10 animate-spin text-brand-gold" /></div>}>
      <ConfigureForm />
    </Suspense>
  );
}
