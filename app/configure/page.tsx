"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePaperStore } from '@/store/paperStore';
import { 
  BOARDS, BOARD_CLASSES, BOARD_SUBJECTS, BOARD_QUESTION_TYPES, TOPICS_BY_SUBJECT,
  DIFFICULTIES, MARKS, QUESTIONS_COUNTS, LANGUAGES 
} from '@/config/boards';
import { ArrowLeft, Loader2, Settings2, LayoutTemplate, Sparkles, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';

function ConfigureForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boardId = searchParams.get('board') || 'CBSE';
  const board = BOARDS.find(b => b.id === boardId) || BOARDS[0];
  
  const setPaper = usePaperStore(state => state.setPaper);
  const clearPaper = usePaperStore(state => state.clearPaper);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const availableClasses = BOARD_CLASSES[board.id] || BOARD_CLASSES['CBSE'];
  const availableSubjects = BOARD_SUBJECTS[board.id] || BOARD_SUBJECTS['CBSE'];
  const availableQuestionTypes = BOARD_QUESTION_TYPES[board.id] || BOARD_QUESTION_TYPES['CBSE'];

  const config = usePaperStore(state => state.config);
  
  const [formData, setFormData] = useState({
    schoolName: config?.schoolName || '',
    examName: config?.examName || '',
    examDate: config?.examDate || '',
    examDuration: config?.examDuration || '2 Hours',
    board: config?.board || board.id, 
    class_grade: config?.class_grade || availableClasses[0], 
    subject: config?.subject || availableSubjects[0], 
    topic: config?.topic || TOPICS_BY_SUBJECT[availableSubjects[0]]?.[0] || 'General Topics',
    difficulty: config?.difficulty || DIFFICULTIES[0], 
    questionTypes: config?.questionTypes || availableQuestionTypes[0],
    totalMarks: config?.totalMarks || MARKS[0], 
    numQuestions: config?.numQuestions || QUESTIONS_COUNTS[0], 
    language: config?.language || LANGUAGES[0],
  });

  useEffect(() => {
    const newSubjects = BOARD_SUBJECTS[board.id] || BOARD_SUBJECTS['CBSE'];
    const newClasses = BOARD_CLASSES[board.id] || BOARD_CLASSES['CBSE'];
    const newQTypes = BOARD_QUESTION_TYPES[board.id] || BOARD_QUESTION_TYPES['CBSE'];
    const newSubject = newSubjects[0];
    setFormData(prev => ({
      ...prev,
      class_grade: newClasses.includes(prev.class_grade) ? prev.class_grade : newClasses[0],
      subject: newSubjects.includes(prev.subject) ? prev.subject : newSubject,
      topic: TOPICS_BY_SUBJECT[newSubjects.includes(prev.subject) ? prev.subject : newSubject]?.[0] || 'General Topics',
      questionTypes: newQTypes.includes(prev.questionTypes) ? prev.questionTypes : newQTypes[0],
    }));
  }, [board.id]);

  useEffect(() => {
    const topics = TOPICS_BY_SUBJECT[formData.subject] || TOPICS_BY_SUBJECT['default'];
    if (!topics.includes(formData.topic)) {
      setFormData(prev => ({ ...prev, topic: topics[0] }));
    }
  }, [formData.subject, formData.topic]);

  useEffect(() => { clearPaper(); }, [clearPaper]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schoolName.trim()) { setError('Please provide a School / Institute Name'); return; }
    if (!formData.examName.trim()) { setError('Please provide an Exam Name'); return; }
    setIsLoading(true); setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) { const errData = await res.json(); throw new Error(errData.error || 'Failed to generate paper'); }
      const { data } = await res.json();
      setPaper(data, formData);
      router.push('/preview');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const selCls = "block w-full rounded-lg py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 bg-background border border-brand-border text-foreground transition-colors";
  const currentTopics = TOPICS_BY_SUBJECT[formData.subject] || TOPICS_BY_SUBJECT['default'];

  return (
    <div className="min-h-[100dvh] lg:h-screen w-full overflow-x-hidden lg:overflow-hidden flex flex-col transition-colors duration-300" style={{ background: 'var(--bg-gradient)' }}>
      
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 sm:px-6 md:px-12 py-3 border-b border-[#2a3050] bg-brand-navbar shrink-0">
        <div className="flex items-center space-x-3 sm:space-x-6">
          <Link href="/" className="flex items-center text-brand-navbar-muted hover:text-brand-gold-light transition-colors" title="Change Board">
            <ArrowLeft className="h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline text-sm">Change Board</span>
          </Link>

          <div className="flex items-center space-x-2 sm:space-x-3 pointer-events-none">
            <div className="bg-[#1a2038] p-1 rounded-md border border-[#2a3050] flex items-center justify-center shadow-sm">
              <Image src="/image.png" alt="Logo" width={20} height={20} className="rounded-sm sm:w-[24px] sm:h-[24px]" />
            </div>
            <span className="text-base sm:text-lg font-bold tracking-widest">
              <span className="text-white">INTEL</span><span className="text-brand-gold-light">LOGY</span>
            </span>
          </div>
        </div>
        <ThemeToggle />
      </nav>

      {/* Two-column layout — fills remaining height, no scroll on the outer container on desktop */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-x-hidden lg:overflow-hidden">

        {/* LEFT COLUMN — form */}
        <div className="w-full lg:w-[55%] xl:w-[58%] py-6 px-4 sm:px-6 lg:px-10 flex flex-col lg:overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto animate-fade-in-up w-full">
            {error && (
              <div className="rounded-lg px-4 py-3 flex items-center text-sm bg-red-500/10 border border-red-500/30 text-red-500">
                {error}
              </div>
            )}

            {/* Basic Details (Mobile Only) */}
            <div className="p-4 rounded-2xl border border-brand-border bg-brand-card shadow-sm lg:hidden">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-4 flex items-center">
                <Settings2 className="w-3.5 h-3.5 mr-2 text-brand-gold" /> Basic Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Institute Name</label>
                  <input type="text" name="schoolName" value={formData.schoolName} onChange={handleChange} placeholder="e.g. ABC Public School" className={selCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Exam Name</label>
                  <input type="text" name="examName" value={formData.examName} onChange={handleChange} placeholder="e.g. Mid Term" className={selCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Date</label>
                  <input type="date" name="examDate" value={formData.examDate} onChange={handleChange} className={selCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Duration</label>
                  <input type="text" name="examDuration" value={formData.examDuration} onChange={handleChange} placeholder="e.g. 2 Hours" className={selCls} />
                </div>
              </div>
            </div>

            {/* Curriculum Section */}
            <div className="p-4 rounded-2xl border border-brand-border bg-brand-card shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-4 flex items-center">
                <LayoutTemplate className="w-3.5 h-3.5 mr-2 text-brand-gold" /> Curriculum Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Board</label>
                  <input type="text" value={board.name} disabled className={`${selCls} opacity-60 cursor-not-allowed`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Class</label>
                  <select name="class_grade" value={formData.class_grade} onChange={handleChange} className={selCls}>
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Subject</label>
                  <select name="subject" value={formData.subject} onChange={handleChange} className={selCls}>
                    {availableSubjects.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Chapter / Topic</label>
                  <select name="topic" value={formData.topic} onChange={handleChange} className={selCls}>
                    {currentTopics.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Format Section */}
            <div className="p-4 rounded-2xl border border-brand-border bg-brand-card shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-4 flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-2 text-brand-gold" /> Paper Format
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Difficulty</label>
                  <select name="difficulty" value={formData.difficulty} onChange={handleChange} className={selCls}>
                    {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
                  </select>
                  {formData.difficulty === 'Mixed' && (
                    <div className="mt-2 text-[11px] flex gap-1 flex-wrap">
                      <span className="bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-medium border border-green-500/20">30% Easy</span>
                      <span className="bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded font-medium border border-blue-500/20">50% Medium</span>
                      <span className="bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded font-medium border border-red-500/20">20% Hard</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Question Types</label>
                  <select name="questionTypes" value={formData.questionTypes} onChange={handleChange} className={selCls}>
                    {availableQuestionTypes.map(q => <option key={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Total Marks</label>
                  <input type="number" min="1" max="500" name="totalMarks" value={formData.totalMarks} onChange={handleChange} className={selCls} placeholder="e.g. 50" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">No. of Questions</label>
                  <input type="number" min="1" max="200" name="numQuestions" value={formData.numQuestions} onChange={handleChange} className={selCls} placeholder="e.g. 20" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-brand-muted">Language</label>
                  <select name="language" value={formData.language} onChange={handleChange} className={selCls}>
                    {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-1 flex flex-col items-center">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-4 rounded-xl text-base font-bold disabled:opacity-50 text-white transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                style={{ background: isLoading ? 'var(--brand-muted)' : 'var(--brand-gold-gradient)' }}
              >
                {isLoading
                  ? <><Loader2 className="animate-spin mr-3 h-5 w-5" />Applying {board.id} pattern...</>
                  : 'Generate Test Paper'
                }
              </button>
              <div className="mt-3 text-xs text-brand-muted font-medium flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1.5" /> Takes approximately 5 to 10 seconds
              </div>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN — fixed skeleton preview, no scroll */}
        <div className="hidden lg:flex w-full lg:w-[45%] xl:w-[42%] border-l border-brand-border bg-brand-card/30 overflow-hidden flex-col">
          


          {/* Skeleton Paper — scrollable within the right column */}
          <div className="flex-1 overflow-y-auto p-6 flex justify-center">
            <div
              className="w-full max-w-lg bg-white shadow-xl rounded-xl overflow-hidden text-black"
              style={{ fontFamily: "'EB Garamond', 'Garamond', 'Calibri', Georgia, serif", fontSize: '13px', lineHeight: '1.7' }}
            >
              <div className="p-8" style={{ fontFamily: "'Calibri', Arial, sans-serif" }}>
                {/* School Name & Info */}
                <div className="text-center mb-5">
                  <input
                    type="text"
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleChange}
                    placeholder="SCHOOL / INSTITUTE NAME"
                    className="w-full text-center text-[22px] font-extrabold bg-transparent border-0 focus:outline-none focus:border-b-2 focus:border-gray-400 placeholder:text-gray-300 transition-all text-gray-900"
                  />
                  <div className="mt-2 text-[15px] font-bold text-gray-800 text-center">
                    <input
                      type="text"
                      name="examName"
                      value={formData.examName}
                      onChange={handleChange}
                      placeholder="Examination"
                      className="text-right bg-transparent border-0 focus:outline-none focus:border-b focus:border-gray-400 placeholder:text-gray-300 transition-all inline-block"
                      style={{ width: `${Math.max(40, (formData.examName.length || 11) * 8.5)}px` }}
                    />
                    <span className="mx-1">:</span>
                    <input
                      type="date"
                      name="examDate"
                      value={formData.examDate}
                      onChange={handleChange}
                      className="bg-transparent border-0 focus:outline-none text-gray-800 cursor-pointer inline-block"
                      style={{ width: '110px' }}
                    />
                  </div>
                  <div className="mt-1 text-[14px] font-bold text-gray-800">
                    Class- {formData.class_grade}
                  </div>
                  <div className="mt-1 text-[14px] font-bold text-gray-800">
                    Subject : {formData.subject}
                  </div>
                  <div className="mt-1 text-[13px] font-semibold text-gray-600">
                    Topic : {formData.topic}
                  </div>
                </div>

                {/* Time & Marks Row */}
                <table className="w-full text-[14px] font-bold text-gray-900 mb-5 border-collapse">
                  <tbody>
                    <tr>
                      <td className="text-left p-0">
                        <div className="flex items-center">
                          <span>Time :</span>
                          <input
                            type="text"
                            name="examDuration"
                            value={formData.examDuration}
                            onChange={handleChange}
                            className="bg-transparent border-0 focus:outline-none text-gray-900 ml-1 w-[60px]"
                          />
                        </div>
                      </td>
                      <td className="text-right p-0">M.M.: {formData.totalMarks}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="text-[13px] font-bold text-gray-900 mb-4 text-left">
                  Note:- All questions are compulsory.
                </div>

                {/* Skeleton Content */}
                <div className="space-y-5 text-xs text-gray-700" style={{ fontFamily: "'Calibri', Arial, sans-serif" }}>
                  <div>
                    <div className="font-bold text-sm uppercase tracking-wide border-b border-gray-300 pb-1 mb-2" style={{ fontFamily: "'EB Garamond', 'Garamond', serif" }}>Section A</div>
                    <ol className="list-decimal pl-4 space-y-2">
                      <li><div className="h-2.5 w-3/4 bg-gray-200 rounded animate-pulse"></div></li>
                      <li><div className="h-2.5 w-5/6 bg-gray-200 rounded animate-pulse"></div></li>
                      <li><div className="h-2.5 w-2/3 bg-gray-200 rounded animate-pulse"></div></li>
                    </ol>
                  </div>

                  {['CBSE', 'ICSE', 'GSEB'].includes(board.id) && (
                    <div>
                      <div className="font-bold text-sm uppercase tracking-wide border-b border-gray-300 pb-1 mb-2" style={{ fontFamily: "'EB Garamond', 'Garamond', serif" }}>Section B</div>
                      <ol className="list-decimal pl-4 space-y-2">
                        <li><div className="h-2.5 w-full bg-gray-200 rounded animate-pulse"></div><div className="h-2.5 w-2/3 bg-gray-200 rounded animate-pulse mt-1"></div></li>
                        <li><div className="h-2.5 w-4/5 bg-gray-200 rounded animate-pulse"></div><div className="h-2.5 w-1/2 bg-gray-200 rounded animate-pulse mt-1"></div></li>
                      </ol>
                    </div>
                  )}

                  {['CBSE', 'ICSE'].includes(board.id) && (
                    <div>
                      <div className="font-bold text-sm uppercase tracking-wide border-b border-gray-300 pb-1 mb-2" style={{ fontFamily: "'EB Garamond', 'Garamond', serif" }}>Section C</div>
                      <ol className="list-decimal pl-4 space-y-2">
                        <li><div className="h-2.5 w-full bg-gray-200 rounded animate-pulse"></div><div className="h-2.5 w-3/4 bg-gray-200 rounded animate-pulse mt-1"></div><div className="h-2.5 w-1/2 bg-gray-200 rounded animate-pulse mt-1"></div></li>
                      </ol>
                    </div>
                  )}

                  <div className="pt-4 text-center border-t border-gray-200">
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Answer Key — Auto Generated</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
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
