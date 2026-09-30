import { getQuestionBankStats } from '@/lib/questionBankStats';
import Link from 'next/link';

export default async function QuestionBankAnalysis() {
  const stats = await getQuestionBankStats();
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const topBoards = Object.entries(stats.byBoard).sort((a, b) => b[1] - a[1]);
  const topSubjects = Object.entries(stats.bySubject).sort((a, b) => b[1] - a[1]);
  const topChapters = Object.entries(stats.byChapter).sort((a, b) => b[1] - a[1]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-foreground-muted hover:text-accent transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold tracking-tight">Question Bank Analysis</h1>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8 space-y-8 animate-fade-in-up">
        {/* HERO */}
        <div>
          <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-1">{dateLabel}</p>
          <h2 className="text-3xl font-extrabold tracking-tight">
            Database <span className="text-accent">Insights</span>
          </h2>
          <p className="text-sm text-foreground-muted mt-2 max-w-xl">
            Detailed breakdown of all verified questions across boards, subjects, and chapters stored in common_db.
          </p>
        </div>

        {/* TOP LEVEL KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="kpi-card border-accent/40 bg-accent-soft/30 p-6 rounded-2xl relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
              </div>
            </div>
            <div className="text-4xl font-black text-accent">{stats.totalQuestions.toLocaleString()}</div>
            <div className="mt-1 text-sm font-medium text-foreground-muted">Total Verified Questions</div>
          </div>
          
          <div className="kpi-card p-6 rounded-2xl border border-border/40 bg-card">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold">{Object.keys(stats.byBoard).length}</div>
            <div className="mt-1 text-sm text-foreground-muted">Supported Boards / Courses</div>
          </div>

          <div className="kpi-card p-6 rounded-2xl border border-border/40 bg-card">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold">{Object.keys(stats.bySubject).length}</div>
            <div className="mt-1 text-sm text-foreground-muted">Distinct Subjects</div>
          </div>
        </div>

        {/* DETAILED BREAKDOWNS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* BOARDS & SUBJECTS */}
          <div className="space-y-6">
            <div className="kpi-card p-5 sm:p-6 bg-card border border-border/50 rounded-2xl">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                Questions by Course (Board)
              </h3>
              <div className="space-y-4">
                {topBoards.length === 0 && <p className="text-sm text-foreground-muted">No data available.</p>}
                {topBoards.map(([board, count]) => (
                  <div key={board}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">{board}</span>
                      <span className="text-foreground-muted font-mono">{count} Qs</span>
                    </div>
                    <div className="w-full bg-border/50 rounded-full h-2">
                      <div className="bg-accent h-2 rounded-full" style={{ width: `${Math.max((count / stats.totalQuestions) * 100, 2)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="kpi-card p-5 sm:p-6 bg-card border border-border/50 rounded-2xl">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                Questions by Subject
              </h3>
              <div className="space-y-4">
                {topSubjects.length === 0 && <p className="text-sm text-foreground-muted">No data available.</p>}
                {topSubjects.map(([subject, count]) => (
                  <div key={subject}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">{subject}</span>
                      <span className="text-foreground-muted font-mono">{count} Qs</span>
                    </div>
                    <div className="w-full bg-border/50 rounded-full h-2">
                      <div className="bg-accent h-2 rounded-full" style={{ width: `${Math.max((count / stats.totalQuestions) * 100, 2)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CHAPTERS */}
          <div className="kpi-card p-5 sm:p-6 bg-card border border-border/50 rounded-2xl flex flex-col h-[700px]">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              Chapter Distribution
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {topChapters.length === 0 && <p className="text-sm text-foreground-muted">No data available.</p>}
              {topChapters.map(([chapter, count]) => (
                <div key={chapter} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/40 hover:border-accent/30 transition-colors">
                  <div className="text-sm font-medium pr-4">{chapter}</div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-xs text-foreground-muted font-mono">{((count / stats.totalQuestions) * 100).toFixed(1)}%</div>
                    <div className="text-sm font-bold text-accent w-12 text-right">{count}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
