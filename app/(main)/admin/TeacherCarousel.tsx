"use client";

import { useState } from 'react';

interface TeacherProfile {
  email: string;
  paperCount: number;
  setCount: number;
  totalMarks: number;
  totalQuestions: number;
  subjects: string[];
  boards: string[];
  chapters: string[];
  examTypes: string[];
  difficultyAvg: { easy: number; medium: number; hard: number };
  avgMarksPerPaper: number;
  avgQuestionsPerPaper: number;
  firstSeen: string;
  lastActive: string;
  logs: any[];
  boardBreakdown: Record<string, number>;
  subjectBreakdown: Record<string, number>;
  marksDistribution: number[];
}

function activityStatus(lastActive: string) {
  const days = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
  if (days === 0) return { label: 'Active today', color: '#22c55e' };
  if (days <= 7) return { label: `${days}d ago`, color: '#f97316' };
  if (days <= 30) return { label: `${days}d ago`, color: '#fb923c' };
  return { label: `Dormant ${days}d`, color: '#ef4444' };
}

type Tab = 'overview' | 'papers';

export default function TeacherCarousel({ teachers }: { teachers: TeacherProfile[] }) {
  const [idx, setIdx] = useState(0);
  const [tab, setTab] = useState<Tab>('overview');

  if (teachers.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center border border-admin-border"
        style={{ background: 'rgba(22,22,22,0.6)', backdropFilter: 'blur(16px)' }}>
        <p className="text-admin-muted text-sm">No teacher activity yet.</p>
      </div>
    );
  }

  const t = teachers[idx];
  const status = activityStatus(t.lastActive);
  const maxSubj = Math.max(...Object.values(t.subjectBreakdown), 1);
  const recent = t.logs.slice(0, 6);
  const maxMarks = Math.max(...t.marksDistribution, 1);

  return (
    <div className="rounded-2xl overflow-hidden border border-admin-border"
      style={{ background: 'rgba(22,22,22,0.6)', backdropFilter: 'blur(16px)' }}>

      {/* ── Header ── */}
      <div className="p-5 border-b border-admin-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Teacher identity */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-extrabold shrink-0"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff' }}>
              {t.email[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-admin-text truncate">{t.email}</div>
              <div className="flex items-center gap-3 mt-1 text-[11px]">
                <span className="flex items-center gap-1 font-semibold" style={{ color: status.color }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: status.color }} />
                  {status.label}
                </span>
                <span className="text-admin-muted">since {new Date(t.firstSeen).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                <span className="text-admin-muted">{t.boards.join(' · ')}</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setIdx(i => Math.max(0, i - 1)); setTab('overview'); }}
              disabled={idx === 0}
              className="w-8 h-8 rounded-xl border border-admin-border flex items-center justify-center text-admin-muted hover:text-admin-accent hover:border-admin-accent/40 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="text-xs text-admin-muted font-bold px-2 tabular-nums">{idx + 1} / {teachers.length}</span>
            <button
              onClick={() => { setIdx(i => Math.min(teachers.length - 1, i + 1)); setTab('overview'); }}
              disabled={idx === teachers.length - 1}
              className="w-8 h-8 rounded-xl border border-admin-border flex items-center justify-center text-admin-muted hover:text-admin-accent hover:border-admin-accent/40 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>

        {/* ── Quick Stats Row ── */}
        <div className="grid grid-cols-5 gap-3 mt-4">
          {[
            { label: 'Papers', value: t.paperCount, accent: true },
            { label: 'Sets', value: t.setCount, accent: false },
            { label: 'Chapters', value: t.chapters.length, accent: false },
            { label: 'Avg Marks', value: t.avgMarksPerPaper, accent: false },
            { label: 'Avg Q', value: t.avgQuestionsPerPaper, accent: false },
          ].map(m => (
            <div key={m.label} className="rounded-xl px-3 py-2 text-center border border-admin-border"
              style={{ background: 'rgba(17,17,17,0.7)' }}>
              <div className={`text-lg font-extrabold leading-none ${m.accent ? 'text-admin-accent' : 'text-admin-text'}`}>{m.value}</div>
              <div className="text-[8px] text-admin-muted font-bold uppercase tracking-wider mt-1">{m.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tab Switcher ── */}
        <div className="flex gap-1 mt-4 p-1 rounded-xl border border-admin-border" style={{ background: 'rgba(17,17,17,0.5)' }}>
          {([['overview', 'Overview'], ['papers', 'Recent Papers']] as [Tab, string][]).map(([key, lbl]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-2 rounded-lg transition-all ${
                tab === key
                  ? 'bg-admin-accent text-white shadow-lg shadow-admin-accent/20'
                  : 'text-admin-muted hover:text-admin-text'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="p-5">
        {tab === 'overview' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left: Subject Focus & Difficulty */}
            <div className="space-y-5">
              {/* Subject bars */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted mb-3">Subject Focus</h4>
                <div className="space-y-3">
                  {Object.entries(t.subjectBreakdown).sort((a, b) => b[1] - a[1]).map(([subj, cnt]) => {
                    const pct = Math.round((cnt / maxSubj) * 100);
                    return (
                      <div key={subj} className="group">
                        <div className="flex justify-between text-[11px] mb-1.5">
                          <span className="font-semibold text-admin-text group-hover:text-admin-accent transition-colors">{subj}</span>
                          <span className="text-admin-muted tabular-nums">{cnt} paper{cnt > 1 ? 's' : ''}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full transition-all duration-700 ease-out group-hover:shadow-lg group-hover:shadow-admin-accent/30"
                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #f97316, #fb923c)' }} />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(t.subjectBreakdown).length === 0 && <p className="text-admin-muted text-[11px]">No data</p>}
                </div>
              </div>

              {/* Difficulty bar */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted mb-3">Difficulty Distribution</h4>
                <div className="flex h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="transition-all duration-700" style={{ width: `${t.difficultyAvg.easy}%`, background: '#fdba74' }} />
                  <div className="transition-all duration-700" style={{ width: `${t.difficultyAvg.medium}%`, background: '#fb923c' }} />
                  <div className="transition-all duration-700" style={{ width: `${t.difficultyAvg.hard}%`, background: '#f97316' }} />
                </div>
                <div className="flex justify-between mt-2 text-[10px]">
                  <span className="text-admin-muted">Easy <span className="text-admin-text font-bold">{t.difficultyAvg.easy}%</span></span>
                  <span className="text-admin-muted">Medium <span className="text-admin-accent-light font-bold">{t.difficultyAvg.medium}%</span></span>
                  <span className="text-admin-muted">Hard <span className="text-admin-accent font-bold">{t.difficultyAvg.hard}%</span></span>
                </div>
              </div>

              {/* Board badges */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted mb-3">Boards & Exam Types</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(t.boardBreakdown).map(([board, cnt]) => (
                    <div key={board} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] border border-admin-accent/20"
                      style={{ background: 'rgba(249,115,22,0.08)' }}>
                      <span className="font-bold text-admin-accent">{board}</span>
                      <span className="text-admin-muted">{cnt}</span>
                    </div>
                  ))}
                  {t.examTypes.slice(0, 4).map(et => (
                    <span key={et} className="text-[10px] px-2.5 py-1.5 rounded-lg border border-admin-border text-admin-muted"
                      style={{ background: 'rgba(17,17,17,0.5)' }}>
                      {et}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Chapters & Marks Spread */}
            <div className="space-y-5">
              {/* Chapters (compact scrollable) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted">Chapters Covered</h4>
                  <span className="text-[10px] font-bold text-admin-accent">{t.chapters.length} unique</span>
                </div>
                <div className="max-h-[180px] overflow-y-auto pr-1 space-y-0.5 rounded-xl p-3 border border-admin-border"
                  style={{ background: 'rgba(17,17,17,0.4)' }}>
                  {t.chapters.map((ch, ci) => (
                    <div key={ci} className="flex items-center gap-2 py-1.5 group">
                      <span className="text-[9px] text-admin-accent font-bold w-5 text-right shrink-0">{ci + 1}</span>
                      <span className="text-[11px] text-admin-text-secondary leading-snug group-hover:text-admin-accent transition-colors">{ch}</span>
                    </div>
                  ))}
                  {t.chapters.length === 0 && <p className="text-admin-muted text-[11px] py-2">No chapter data</p>}
                </div>
              </div>

              {/* Marks sparkline */}
              {t.marksDistribution.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted mb-3">
                    Marks Trend ({t.marksDistribution.length} papers)
                  </h4>
                  <div className="flex items-end gap-1 h-12 rounded-xl p-3 border border-admin-border"
                    style={{ background: 'rgba(17,17,17,0.4)' }}>
                    {t.marksDistribution.slice(-20).map((m, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm cursor-default transition-colors hover:shadow-lg hover:shadow-admin-accent/30"
                        style={{
                          height: `${Math.max(10, (m / maxMarks) * 100)}%`,
                          background: 'linear-gradient(to top, #f97316, #fb923c80)',
                        }}
                        title={`${m} marks`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-admin-muted mt-1.5 px-1">
                    <span>Min: {Math.min(...t.marksDistribution)}m</span>
                    <span>Max: {Math.max(...t.marksDistribution)}m</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Papers Tab ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recent.map((log: any, i: number) => (
              <div key={i} className="rounded-xl p-4 border border-admin-border hover:border-admin-accent/30 transition-all group"
                style={{ background: 'rgba(17,17,17,0.5)' }}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-admin-text truncate group-hover:text-admin-accent transition-colors">{log.examName || 'Unnamed'}</div>
                    <div className="text-[10px] text-admin-muted mt-0.5">{log.board} · {log.classLevel} · {log.subject}</div>
                  </div>
                  <span className="text-[9px] text-admin-muted shrink-0 border border-admin-border rounded px-1.5 py-0.5">
                    {new Date(log.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[9px] px-2 py-1 rounded-md font-bold"
                    style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>
                    {log.totalMarks}m
                  </span>
                  <span className="text-[9px] px-2 py-1 rounded-md text-admin-muted border border-admin-border"
                    style={{ background: 'rgba(17,17,17,0.5)' }}>
                    {log.totalQuestions ?? '?'}Q
                  </span>
                  <span className="text-[9px] px-2 py-1 rounded-md text-admin-muted border border-admin-border"
                    style={{ background: 'rgba(17,17,17,0.5)' }}>
                    {log.numSets || 1} set{(log.numSets || 1) > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
            {t.logs.length === 0 && <p className="text-admin-muted text-xs col-span-full text-center py-6">No papers yet</p>}
          </div>
        )}
      </div>

      {/* ── Dot Navigation ── */}
      {teachers.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-3 border-t border-admin-border">
          {teachers.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); setTab('overview'); }}
              className="transition-all rounded-full"
              style={{
                width: i === idx ? 24 : 6,
                height: 6,
                background: i === idx ? '#f97316' : '#333',
              }}
              title={teachers[i].email}
            />
          ))}
        </div>
      )}
    </div>
  );
}
