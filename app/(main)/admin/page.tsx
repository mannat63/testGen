import { currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAllowedUserModel } from '@/models/AllowedUser';
import { DEMO_ADMIN_ENABLED, DEMO_ADMIN_COOKIE, DEMO_ADMIN_TOKEN } from '@/lib/demoAdmin';
import { demoAdminLogout } from '@/app/admin-login/actions';
import { getTemplateModel } from '@/models/Template';
import { getGenerationLogModel } from '@/models/GenerationLog';
import { addAllowedUser, removeAllowedUser, createTemplate, deleteTemplate } from './actions';
import { BOARDS } from '@/config/boards';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import TeacherCarousel from './TeacherCarousel';
import { DonutChart, RadialGauge, BarSparkline, StackedBar, MiniStat } from './AdminCharts';

/* ── Types ── */
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
  firstSeen: Date;
  lastActive: Date;
  logs: any[];
  boardBreakdown: Record<string, number>;
  subjectBreakdown: Record<string, number>;
  marksDistribution: number[];
  weeklyActivity: Record<string, number>;
}

/* ── Helpers ── */
function getWeekKey(d: Date): string {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function avgDiff(logs: any[]) {
  const total = logs.length || 1;
  return {
    easy: Math.round(logs.reduce((s, l) => s + (l.difficulty?.easy || 30), 0) / total),
    medium: Math.round(logs.reduce((s, l) => s + (l.difficulty?.medium || 50), 0) / total),
    hard: Math.round(logs.reduce((s, l) => s + (l.difficulty?.hard || 20), 0) / total),
  };
}

function buildTeacherProfile(email: string, logs: any[]): TeacherProfile {
  const subjects = new Set<string>();
  const boards = new Set<string>();
  const chapters = new Set<string>();
  const examTypes = new Set<string>();
  const boardBreakdown: Record<string, number> = {};
  const subjectBreakdown: Record<string, number> = {};
  const weeklyActivity: Record<string, number> = {};
  const marksDistribution: number[] = [];

  let totalMarks = 0, totalQuestions = 0, setCount = 0;

  for (const log of logs) {
    if (log.subject) subjects.add(log.subject);
    if (log.board) { boards.add(log.board); boardBreakdown[log.board] = (boardBreakdown[log.board] || 0) + 1; }
    if (log.subject) subjectBreakdown[log.subject] = (subjectBreakdown[log.subject] || 0) + 1;
    for (const ch of (log.chapters || [])) if (ch.chapterName) chapters.add(ch.chapterName);
    if (log.examName) examTypes.add(log.examName);
    totalMarks += log.totalMarks || 0;
    totalQuestions += log.totalQuestions || 0;
    setCount += log.numSets || 1;
    if (log.totalMarks) marksDistribution.push(log.totalMarks);
    const wk = getWeekKey(new Date(log.generatedAt));
    weeklyActivity[wk] = (weeklyActivity[wk] || 0) + 1;
  }

  const dates = logs.map(l => new Date(l.generatedAt)).sort((a, b) => a.getTime() - b.getTime());

  return {
    email, paperCount: logs.length, setCount, totalMarks, totalQuestions,
    subjects: Array.from(subjects), boards: Array.from(boards),
    chapters: Array.from(chapters), examTypes: Array.from(examTypes),
    difficultyAvg: avgDiff(logs),
    avgMarksPerPaper: logs.length ? Math.round(totalMarks / logs.length) : 0,
    avgQuestionsPerPaper: logs.length ? Math.round(totalQuestions / logs.length) : 0,
    firstSeen: dates[0] || new Date(), lastActive: dates[dates.length - 1] || new Date(),
    logs, boardBreakdown, subjectBreakdown, marksDistribution, weeklyActivity,
  };
}

/* ── Business Insight Engine ── */
interface Insight { type: 'opportunity' | 'warning' | 'success' | 'trend'; title: string; body: string; }

function generateInsights(
  teachers: TeacherProfile[], subjectBreakdown: Record<string, number>,
  boardBreakdown: Record<string, number>, chapterCoverage: Record<string, number>,
  totalPapers: number, templates: any[],
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const activeThisWeek = teachers.filter(t => t.lastActive >= sevenDaysAgo).length;
  if (activeThisWeek < teachers.length * 0.4 && teachers.length > 2) {
    insights.push({ type: 'warning', title: 'Low Weekly Engagement', body: `Only ${activeThisWeek} of ${teachers.length} teachers generated papers in the last 7 days.` });
  } else if (activeThisWeek >= teachers.length * 0.7) {
    insights.push({ type: 'success', title: 'High Weekly Engagement', body: `${activeThisWeek} of ${teachers.length} teachers are actively generating papers this week.` });
  }

  const subjectEntries = Object.entries(subjectBreakdown).sort((a, b) => b[1] - a[1]);
  if (subjectEntries.length > 0) {
    const topSubject = subjectEntries[0];
    const topPct = Math.round((topSubject[1] / totalPapers) * 100);
    if (topPct > 50) {
      insights.push({ type: 'opportunity', title: `${topSubject[0]} Dominates (${topPct}%)`, body: `Over half of all papers are ${topSubject[0]}. Consider more templates for other subjects.` });
    }
  }

  if (templates.length === 0 && totalPapers > 5) {
    insights.push({ type: 'opportunity', title: 'No Admin Templates', body: `${totalPapers} papers generated but no templates exist. Templates reduce teacher setup time significantly.` });
  } else if (templates.length > 0) {
    insights.push({ type: 'success', title: `${templates.length} Templates Live`, body: `Templates are available to all teachers for standardized paper generation.` });
  }

  const allLogs = teachers.flatMap(t => t.logs);
  const multiSetLogs = allLogs.filter(l => (l.numSets || 1) > 1);
  const multiSetPct = totalPapers > 0 ? Math.round((multiSetLogs.length / totalPapers) * 100) : 0;
  if (multiSetPct >= 40) {
    insights.push({ type: 'success', title: `Strong Multi-Set Usage (${multiSetPct}%)`, body: `Teachers are leveraging Set A/B/C variants for exam security.` });
  }

  const papersLast7 = allLogs.filter(l => new Date(l.generatedAt) >= sevenDaysAgo).length;
  const papersPrev7 = allLogs.filter(l => { const d = new Date(l.generatedAt); return d < sevenDaysAgo && d >= new Date(sevenDaysAgo.getTime() - 7 * 86400000); }).length;
  if (papersPrev7 > 0) {
    const growth = Math.round(((papersLast7 - papersPrev7) / papersPrev7) * 100);
    if (growth > 20) insights.push({ type: 'trend', title: `+${growth}% Growth`, body: `${papersLast7} papers this week vs ${papersPrev7} last week.` });
    else if (growth < -20) insights.push({ type: 'warning', title: `${growth}% Drop`, body: `${papersLast7} papers this week vs ${papersPrev7} last week.` });
  }

  return insights;
}

/* ── Time Greeting ── */
function getGreeting(): string {
  const hour = new Date().getUTCHours() + 5.5; // IST offset
  const h = hour >= 24 ? hour - 24 : hour;
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/* ── Chart Colors ── */
const CHART_COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#fff7ed'];
const BOARD_COLORS: Record<string, string> = { JEE: '#f97316', CBSE: '#fb923c', GSEB: '#fdba74', NEET: '#fed7aa' };

/* ── Page ── */
export default async function AdminPage() {
  // Temporary demo admin bypass (admin/admin) — see lib/demoAdmin.ts
  const demoAdmin = DEMO_ADMIN_ENABLED &&
    (await cookies()).get(DEMO_ADMIN_COOKIE)?.value === DEMO_ADMIN_TOKEN;

  if (!demoAdmin) {
    const user = await currentUser();
    const primaryEmail = user?.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;
    if (primaryEmail?.toLowerCase() !== 'teamintellogy@gmail.com') redirect('/');
  }

  const AllowedUser = await getAllowedUserModel();
  const users = await AllowedUser.find({}).sort({ addedAt: -1 }).lean();

  const Template = await getTemplateModel();
  const templates = await Template.find({}).sort({ createdAt: -1 }).lean();

  let allLogs: any[] = [];
  let teacherProfiles: TeacherProfile[] = [];
  let subjectBreakdown: Record<string, number> = {};
  let boardBreakdown: Record<string, number> = {};
  let chapterCoverage: Record<string, number> = {};
  let insights: Insight[] = [];
  let recentLogs: any[] = [];
  let totalPapers = 0, totalSets = 0, totalMarksAllTime = 0;

  try {
    const GenerationLog = await getGenerationLogModel();
    allLogs = await GenerationLog.find({}).sort({ generatedAt: -1 }).lean();
    totalPapers = allLogs.length;
    totalSets = allLogs.reduce((s: number, l: any) => s + (l.numSets || 1), 0);
    totalMarksAllTime = allLogs.reduce((s: number, l: any) => s + (l.totalMarks || 0), 0);

    const emailMap: Record<string, any[]> = {};
    for (const log of allLogs) {
      const e = log.userEmail || 'unknown';
      if (!emailMap[e]) emailMap[e] = [];
      emailMap[e].push(log);
      if (log.subject) subjectBreakdown[log.subject] = (subjectBreakdown[log.subject] || 0) + 1;
      if (log.board) boardBreakdown[log.board] = (boardBreakdown[log.board] || 0) + 1;
      for (const ch of (log.chapters || [])) if (ch.chapterName) chapterCoverage[ch.chapterName] = (chapterCoverage[ch.chapterName] || 0) + 1;
    }

    teacherProfiles = Object.entries(emailMap)
      .map(([email, logs]) => buildTeacherProfile(email, logs))
      .sort((a, b) => b.paperCount - a.paperCount);

    recentLogs = allLogs.slice(0, 20).map((l: any) => ({
      userEmail: l.userEmail ?? '', examName: l.examName ?? null, board: l.board ?? null,
      subject: l.subject ?? null, totalMarks: l.totalMarks ?? 0, numSets: l.numSets ?? 1,
      generatedAt: l.generatedAt instanceof Date ? l.generatedAt.toISOString() : String(l.generatedAt ?? ''),
    }));
    insights = generateInsights(teacherProfiles, subjectBreakdown, boardBreakdown, chapterCoverage, totalPapers, templates);
  } catch { /* DB not ready */ }

  const topChapters = Object.entries(chapterCoverage).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const greeting = getGreeting();
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Engagement metric
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const activeThisWeek = teacherProfiles.filter(t => t.lastActive >= sevenDaysAgo).length;
  const engagementPct = teacherProfiles.length > 0 ? activeThisWeek / teacherProfiles.length : 0;

  // Weekly sparkline data (last 8 weeks)
  const weeklyData: number[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekDate = new Date(Date.now() - i * 7 * 86400000);
    const wk = getWeekKey(weekDate);
    const count = allLogs.filter(l => getWeekKey(new Date(l.generatedAt)) === wk).length;
    weeklyData.push(count);
  }

  // Donut data
  const boardDonut = Object.entries(boardBreakdown).map(([board, count], i) => ({
    label: board, value: count, color: BOARD_COLORS[board] || CHART_COLORS[i % CHART_COLORS.length],
  }));
  const subjectDonut = Object.entries(subjectBreakdown).sort((a, b) => b[1] - a[1]).map(([subj, count], i) => ({
    label: subj, value: count, color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  // Difficulty stacked bar
  const allDiff = { easy: 0, medium: 0, hard: 0 };
  allLogs.forEach(l => {
    allDiff.easy += l.difficulty?.easy || 30;
    allDiff.medium += l.difficulty?.medium || 50;
    allDiff.hard += l.difficulty?.hard || 20;
  });
  const diffTotal = (allDiff.easy + allDiff.medium + allDiff.hard) || 1;

  const inp = "w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-2.5 text-admin-text text-sm focus:border-admin-accent focus:ring-1 focus:ring-admin-accent/30 focus:outline-none transition-colors placeholder:text-admin-muted";

  return (
    <div className="dark min-h-[100dvh] w-full bg-admin-bg text-admin-text" style={{ colorScheme: 'dark' }}>

      {/* ━━ Navbar ━━ */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-5 md:px-10 py-3 border-b border-admin-border bg-admin-bg/90 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center transition-transform group-hover:scale-105">
              <img src="/image.png" alt="Logo" className="h-7 w-auto object-contain drop-shadow-sm" />
            </div>
            <span className="text-base font-bold tracking-widest hidden sm:inline-block">
              <span className="text-admin-text">INTELLOGY</span>
              <span className="text-admin-accent ml-1.5 text-[10px] uppercase">Corporation</span>
            </span>
          </Link>
          <span className="hidden sm:inline text-[10px] text-admin-accent font-bold tracking-wider uppercase border border-admin-accent/30 bg-admin-accent/10 rounded-full px-3 py-1">
            Admin{demoAdmin ? ' · Demo' : ''}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-admin-muted hover:text-admin-accent transition-colors font-semibold">&larr; Dashboard</Link>
          {demoAdmin && (
            <form action={demoAdminLogout}>
              <button type="submit" className="flex items-center gap-1.5 text-xs font-semibold text-admin-muted hover:text-admin-accent transition-colors border border-admin-border hover:border-admin-accent/40 rounded-lg px-3 py-1.5">
                <LogOut className="w-3.5 h-3.5" /> Log out
              </button>
            </form>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-8">

        {/* ━━ Welcome Banner ━━ */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 animate-fade-in-up relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-admin-accent/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-admin-text tracking-tight">
                {greeting}, Admin <span className="inline-block animate-float">👋</span>
              </h1>
              <p className="text-sm text-admin-muted mt-1">{today} &bull; Platform Administration</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="glass-card-light rounded-xl px-4 py-2 text-center">
                <div className="text-lg font-extrabold text-admin-accent">{totalPapers}</div>
                <div className="text-[9px] text-admin-muted uppercase tracking-wider font-bold">Papers</div>
              </div>
              <div className="glass-card-light rounded-xl px-4 py-2 text-center">
                <div className="text-lg font-extrabold text-admin-accent">{teacherProfiles.length}</div>
                <div className="text-[9px] text-admin-muted uppercase tracking-wider font-bold">Teachers</div>
              </div>
            </div>
          </div>
        </div>

        {/* ━━ KPI Cards ━━ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniStat
            icon={<svg className="w-4 h-4 text-admin-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
            label="Papers" value={totalPapers} sub="all time" delay={0}
          />
          <MiniStat
            icon={<svg className="w-4 h-4 text-admin-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>}
            label="Sets" value={totalSets} sub="incl. A/B/C" delay={50}
          />
          <MiniStat
            icon={<svg className="w-4 h-4 text-admin-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
            label="Teachers" value={teacherProfiles.length} sub="active" delay={100}
          />
          <MiniStat
            icon={<svg className="w-4 h-4 text-admin-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
            label="Total Marks" value={`${(totalMarksAllTime / 1000).toFixed(1)}K`} sub="generated" delay={150}
          />
          <MiniStat
            icon={<svg className="w-4 h-4 text-admin-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>}
            label="Chapters" value={Object.keys(chapterCoverage).length} sub="unique" delay={200}
          />
          <MiniStat
            icon={<svg className="w-4 h-4 text-admin-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"/></svg>}
            label="Templates" value={templates.length} sub="published" delay={250}
          />
        </div>

        {/* ━━ Insights Row ━━ */}
        {insights.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-admin-accent animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-admin-muted">Intelligence</span>
              <div className="flex-1 h-px bg-admin-border" />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
              {insights.map((ins, i) => (
                <div key={i} className="glass-card rounded-xl p-4 shrink-0 snap-start w-[280px] hover:border-admin-accent/30 transition-colors group">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-lg bg-admin-accent/10 flex items-center justify-center text-xs">
                      {ins.type === 'success' ? '✓' : ins.type === 'warning' ? '⚠' : ins.type === 'trend' ? '↗' : '💡'}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-admin-accent">{ins.type}</span>
                  </div>
                  <div className="text-xs font-bold text-admin-text leading-snug mb-1 group-hover:text-admin-accent transition-colors">{ins.title}</div>
                  <p className="text-[11px] text-admin-muted leading-relaxed">{ins.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ━━ Charts Row ━━ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>

          {/* Board Donut */}
          <div className="rounded-2xl p-5 flex flex-col items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-admin-accent/10 border border-admin-border hover:border-admin-accent/30" style={{ background: 'rgba(22,22,22,0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted mb-4 self-start">Papers by Board</h3>
            <DonutChart segments={boardDonut.length > 0 ? boardDonut : [{ label: 'None', value: 1, color: '#262626' }]} label="Total" />
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {boardDonut.map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px] text-admin-muted">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Donut */}
          <div className="rounded-2xl p-5 flex flex-col items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-admin-accent/10 border border-admin-border hover:border-admin-accent/30" style={{ background: 'rgba(22,22,22,0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted mb-4 self-start">Papers by Subject</h3>
            <DonutChart segments={subjectDonut.length > 0 ? subjectDonut : [{ label: 'None', value: 1, color: '#262626' }]} label="Total" />
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {subjectDonut.map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px] text-admin-muted">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement Gauge */}
          <div className="rounded-2xl p-5 flex flex-col items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-admin-accent/10 border border-admin-border hover:border-admin-accent/30" style={{ background: 'rgba(22,22,22,0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted mb-4 self-start">Weekly Engagement</h3>
            <RadialGauge value={activeThisWeek} max={teacherProfiles.length || 1} label="Active" size={140} />
            <p className="text-[10px] text-admin-muted mt-3 text-center">
              {activeThisWeek} of {teacherProfiles.length} teachers active this week
            </p>
          </div>

          {/* Weekly Trend Sparkline */}
          <div className="rounded-2xl p-5 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-admin-accent/10 border border-admin-border hover:border-admin-accent/30" style={{ background: 'rgba(22,22,22,0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted mb-4">Weekly Trend</h3>
            <div className="flex-1 flex flex-col justify-end">
              <BarSparkline data={weeklyData} height={80} />
            </div>
            <div className="flex justify-between text-[9px] text-admin-muted mt-2">
              <span>8 weeks ago</span>
              <span>This week</span>
            </div>

            {/* Difficulty Stacked */}
            <div className="mt-4 pt-4 border-t border-admin-border">
              <div className="text-[9px] font-bold uppercase tracking-widest text-admin-muted mb-2">Avg Difficulty</div>
              <StackedBar segments={[
                { label: 'Easy', value: allDiff.easy, color: '#fdba74' },
                { label: 'Medium', value: allDiff.medium, color: '#fb923c' },
                { label: 'Hard', value: allDiff.hard, color: '#f97316' },
              ]} />
              <div className="flex gap-3 mt-1.5 text-[9px] text-admin-muted">
                <span>Easy {Math.round((allDiff.easy / diffTotal) * 100)}%</span>
                <span>Medium {Math.round((allDiff.medium / diffTotal) * 100)}%</span>
                <span>Hard {Math.round((allDiff.hard / diffTotal) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ━━ Top Chapters ━━ */}
        {topChapters.length > 0 && (
          <div className="glass-card rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted mb-4">Top Chapters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {topChapters.map(([ch, count], idx) => {
                const maxCount = topChapters[0]?.[1] || 1;
                return (
                  <div key={ch} className="flex items-center gap-3 group py-1">
                    <span className="text-[10px] font-extrabold text-admin-accent w-5 text-right shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-admin-text truncate mb-1 group-hover:text-admin-accent transition-colors">{ch}</div>
                      <div className="h-1 rounded-full bg-admin-border">
                        <div className="h-full rounded-full bg-gradient-to-r from-admin-accent to-admin-accent-light transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-admin-muted shrink-0">{count}×</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ━━ Per-Teacher Carousel ━━ */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-admin-accent" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-admin-muted">Per-Teacher Analytics</span>
            <div className="flex-1 h-px bg-admin-border" />
            <span className="text-[10px] text-admin-muted font-semibold">{teacherProfiles.length} teachers</span>
          </div>
          <TeacherCarousel
            teachers={teacherProfiles.map(t => ({
              email: t.email, paperCount: t.paperCount, setCount: t.setCount,
              totalMarks: t.totalMarks, totalQuestions: t.totalQuestions,
              subjects: t.subjects, boards: t.boards, chapters: t.chapters, examTypes: t.examTypes,
              difficultyAvg: t.difficultyAvg, avgMarksPerPaper: t.avgMarksPerPaper, avgQuestionsPerPaper: t.avgQuestionsPerPaper,
              firstSeen: t.firstSeen.toISOString(), lastActive: t.lastActive.toISOString(),
              boardBreakdown: t.boardBreakdown, subjectBreakdown: t.subjectBreakdown, marksDistribution: t.marksDistribution,
              logs: t.logs.map((l: any) => ({
                examName: l.examName ?? null, board: l.board ?? null, classLevel: l.classLevel ?? null,
                subject: l.subject ?? null, totalMarks: l.totalMarks ?? 0, totalQuestions: l.totalQuestions ?? 0,
                numSets: l.numSets ?? 1,
                difficulty: l.difficulty ? { easy: l.difficulty.easy ?? 30, medium: l.difficulty.medium ?? 50, hard: l.difficulty.hard ?? 20 } : null,
                generatedAt: l.generatedAt instanceof Date ? l.generatedAt.toISOString() : String(l.generatedAt ?? ''),
                chapters: (l.chapters ?? []).map((c: any) => ({ chapterId: String(c.chapterId ?? ''), chapterName: String(c.chapterName ?? '') })),
              })),
            }))}
          />
        </div>

        {/* ━━ Activity Feed ━━ */}
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
          <div className="px-5 py-3.5 border-b border-admin-border flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted">Activity Feed</h3>
            <span className="text-[10px] text-admin-muted">{recentLogs.length} recent</span>
          </div>
          <div className="divide-y divide-admin-border max-h-[350px] overflow-y-auto">
            {recentLogs.map((log: any, i: number) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-admin-card-hover transition-colors">
                <div className="w-7 h-7 rounded-full bg-admin-accent/10 border border-admin-accent/20 flex items-center justify-center text-admin-accent text-[10px] font-bold shrink-0">
                  {(log.userEmail || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-admin-text">{log.userEmail}</span>
                  <span className="text-[11px] text-admin-muted ml-2">generated</span>
                  <span className="text-[11px] font-semibold text-admin-text ml-1">{log.examName || 'a test'}</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-admin-surface text-admin-muted">{log.board} · {log.subject}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-admin-accent/10 text-admin-accent font-bold">{log.totalMarks}m</span>
                  </div>
                </div>
                <span className="text-[10px] text-admin-muted shrink-0">{new Date(log.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            ))}
            {recentLogs.length === 0 && <p className="text-admin-muted text-sm italic p-6 text-center">No activity yet.</p>}
          </div>
        </div>

        {/* ━━ Management Divider ━━ */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-admin-border" />
          <span className="text-[10px] text-admin-accent font-bold uppercase tracking-widest">Management</span>
          <div className="flex-1 h-px bg-admin-border" />
        </div>

        {/* ━━ User Access ━━ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-admin-border">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted">Add Teacher Access</h3>
            </div>
            <div className="p-5">
              <form action={addAllowedUser} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-admin-muted mb-1.5">Teacher Name</label>
                    <input type="text" name="name" required placeholder="e.g. Rahul Sharma" className={inp} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-admin-muted mb-1.5">Email Address</label>
                    <input type="email" name="email" required placeholder="teacher@school.edu" className={inp} />
                  </div>
                </div>
                <button type="submit" className="w-full bg-admin-accent text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-admin-accent-dark transition-colors">
                  Grant Access
                </button>
              </form>
            </div>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-admin-border flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted">Whitelisted ({users.length})</h3>
            </div>
            <div className="max-h-[250px] overflow-y-auto divide-y divide-admin-border">
              {users.map((u: any) => (
                <div key={u._id.toString()} className="flex items-center justify-between px-5 py-3 hover:bg-admin-card-hover transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-admin-accent/10 flex items-center justify-center text-[10px] text-admin-accent font-bold">
                      {(u.name || u.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-admin-text">{u.name || '—'}</div>
                      <div className="text-[10px] text-admin-muted">{u.email}</div>
                    </div>
                  </div>
                  <form action={async () => { 'use server'; await removeAllowedUser(u.email); }}>
                    <button type="submit" className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 border border-admin-border rounded-lg text-admin-muted hover:text-red-400 hover:border-red-400/30 transition-colors">Revoke</button>
                  </form>
                </div>
              ))}
              {users.length === 0 && <p className="text-admin-muted text-xs italic p-5">No users yet.</p>}
            </div>
          </div>
        </div>

        {/* ━━ Template Management ━━ */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-admin-border flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted">Create Admin Template</h3>
            <span className="text-[10px] text-admin-muted">Shared with all teachers</span>
          </div>
          <div className="p-5">
            <form action={createTemplate}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-admin-muted mb-1.5">Template Name</label>
                  <input type="text" name="name" required placeholder="e.g. Physics Weekly Ch 1-3" className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-admin-muted mb-1.5">Type</label>
                  <select name="type" className={inp}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="revision">Revision</option>
                    <option value="mock">Mock</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-admin-muted mb-1.5">Board</label>
                  <select name="board" className={inp}>
                    {BOARDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-admin-muted mb-1.5">Class</label>
                  <input type="text" name="classLevel" defaultValue="Class 12" className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-admin-muted mb-1.5">Subject</label>
                  <input type="text" name="subject" required placeholder="e.g. Physics" className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-admin-muted mb-1.5">Total Marks</label>
                  <input type="number" name="totalMarks" defaultValue={50} required className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-admin-muted mb-1.5">Duration (min)</label>
                  <input type="number" name="duration" defaultValue={90} required className={inp} />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="submit" className="bg-admin-accent text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-admin-accent-dark transition-colors">Create Template</button>
              </div>
            </form>
          </div>
        </div>

        {/* ━━ Templates Table ━━ */}
        {templates.length > 0 && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-admin-border">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-admin-muted">Published Templates ({templates.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-admin-border bg-admin-surface/50">
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-admin-muted">Name</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-admin-muted">Type</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-admin-muted">Board</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-admin-muted">Subject</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-admin-muted">Marks</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-admin-muted">Duration</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-admin-muted"></th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t: any) => (
                    <tr key={t._id.toString()} className="border-b border-admin-border hover:bg-admin-card-hover transition-colors">
                      <td className="px-4 py-3 font-semibold text-admin-text">{t.name}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-admin-accent/10 text-admin-accent">{t.type}</span></td>
                      <td className="px-4 py-3 text-admin-muted">{t.board}</td>
                      <td className="px-4 py-3 text-admin-muted">{t.subject}</td>
                      <td className="px-4 py-3 font-bold text-admin-accent">{t.totalMarks}</td>
                      <td className="px-4 py-3 text-admin-muted">{t.duration}m</td>
                      <td className="px-4 py-3">
                        <form action={async () => { 'use server'; await deleteTemplate(t._id.toString()); }}>
                          <button type="submit" className="text-[9px] font-bold uppercase px-2 py-1 border border-admin-border rounded-lg text-admin-muted hover:text-red-400 hover:border-red-400/30 transition-colors">Delete</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
