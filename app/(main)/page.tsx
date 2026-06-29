import Link from 'next/link';
import Image from 'next/image';
import { BOARDS } from '@/config/boards';
import { ThemeToggle } from '@/components/ThemeToggle';
import { currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { getSavedConfigModel } from '@/models/SavedConfig';
import { getTemplateModel } from '@/models/Template';
import { getGenerationLogModel } from '@/models/GenerationLog';
import { getAllowedUserModel } from '@/models/AllowedUser';
import { getQuestionBankModel } from '@/models/QuestionBank';

/* ────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────*/
function getGreeting(): string {
  const hour = new Date().getUTCHours() + 5.5;
  const h = hour >= 24 ? hour - 24 : hour;
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function buildSparklinePath(values: number[], width = 80, height = 24): string {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function startOfDayUTC(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/* ────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────*/
export default async function Home() {
  const user = await currentUser();
  const primaryEmail = user?.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId
  )?.emailAddress;
  const isAdmin = primaryEmail?.toLowerCase() === 'teamintellogy@gmail.com';

  /* ── Display name ── */
  let displayName = user?.firstName || 'Teacher';
  try {
    if (primaryEmail) {
      const AllowedUser = await getAllowedUserModel();
      const allowedUser = await AllowedUser.findOne({ email: primaryEmail.toLowerCase() }).lean();
      if (allowedUser && (allowedUser as any).name) {
        displayName = (allowedUser as any).name.split(' ')[0];
      }
    }
  } catch { /* ignore */ }

  /* ── Data fetch ── */
  let savedConfigs: any[] = [];
  let templates: any[] = [];
  let recentPapers: any[] = [];
  let myPaperCount = 0;
  let papersToday = 0;
  let papersThisWeek = 0;
  let papersLastWeek = 0;
  let activeTeachers = 0;
  let activeTeachersLastWeek = 0;
  let questionBankSize = 0;
  let tokensToday = 0;
  let papersSparkline: number[] = [];
  let teacherSparkline: number[] = [];

  try {
    if (user) {
      const now = new Date();
      const today = startOfDayUTC(now);
      const sevenDaysAgo = new Date(today); sevenDaysAgo.setUTCDate(today.getUTCDate() - 6);
      const fourteenDaysAgo = new Date(today); fourteenDaysAgo.setUTCDate(today.getUTCDate() - 13);

      const SavedConfig = await getSavedConfigModel();
      const Template = await getTemplateModel();
      const GenerationLog = await getGenerationLogModel();

      const configFilter = { $or: [{ userId: user.id }, { userEmail: primaryEmail }] };
      const emailFilter = { $or: [{ userId: user.id }, { userEmail: primaryEmail }] };

      const [
        cfgs, tmps, rps, myCount, todayCount, todayTokenDocs, weekLogs, lastWeekLogs, teacherLogs7,
      ] = await Promise.all([
        SavedConfig.find(configFilter).sort({ savedAt: -1 }).limit(5).lean(),
        Template.find({}).sort({ createdAt: -1 }).limit(6).lean(),
        GenerationLog.find(emailFilter).sort({ generatedAt: -1 }).limit(5).lean(),
        GenerationLog.countDocuments(emailFilter),
        GenerationLog.countDocuments({ ...emailFilter, generatedAt: { $gte: today } }),
        GenerationLog.aggregate([
          { $match: { generatedAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$tokensUsed' } } },
        ]),
        GenerationLog.find({ generatedAt: { $gte: sevenDaysAgo } }).select('generatedAt userEmail userId').lean(),
        GenerationLog.find({ generatedAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }).select('generatedAt userEmail').lean(),
        GenerationLog.find({ generatedAt: { $gte: sevenDaysAgo } }).select('userEmail userId').lean(),
      ]);

      savedConfigs = cfgs;
      templates = tmps;
      recentPapers = rps;
      myPaperCount = myCount;
      papersToday = todayCount;
      tokensToday = todayTokenDocs.length > 0 ? todayTokenDocs[0].total : 0;
      papersThisWeek = weekLogs.length;
      papersLastWeek = lastWeekLogs.length;

      // Sparkline: papers per day, last 7 days
      const dayBuckets = new Array(7).fill(0);
      for (const l of weekLogs as any[]) {
        const d = startOfDayUTC(new Date(l.generatedAt));
        const offset = Math.round((d.getTime() - sevenDaysAgo.getTime()) / 86400000);
        if (offset >= 0 && offset < 7) dayBuckets[offset]++;
      }
      papersSparkline = dayBuckets;

      // Unique teachers this week vs last week
      const uniq = new Set((teacherLogs7 as any[]).map(l => l.userEmail || l.userId).filter(Boolean));
      activeTeachers = uniq.size;
      const uniqLast = new Set((lastWeekLogs as any[]).map(l => l.userEmail).filter(Boolean));
      activeTeachersLastWeek = uniqLast.size;

      // Teacher sparkline — unique teachers per day (7 days)
      const teacherDays: Set<string>[] = Array.from({ length: 7 }, () => new Set<string>());
      for (const l of teacherLogs7 as any[]) {
        const d = startOfDayUTC(new Date(l.generatedAt || new Date()));
        const offset = Math.round((d.getTime() - sevenDaysAgo.getTime()) / 86400000);
        if (offset >= 0 && offset < 7 && (l.userEmail || l.userId)) {
          teacherDays[offset].add(l.userEmail || l.userId);
        }
      }
      teacherSparkline = teacherDays.map(s => s.size);

      try {
        const QB = await getQuestionBankModel();
        questionBankSize = await QB.countDocuments();
      } catch { /* QB optional */ }
    }
  } catch { /* DB not ready */ }

  const papersChange = pctChange(papersThisWeek, papersLastWeek);
  const teachersChange = pctChange(activeTeachers, activeTeachersLastWeek);
  const templatesCount = templates.length;
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const kpis = [
    {
      label: "Today's Tokens",
      value: tokensToday >= 1000 ? `${(tokensToday / 1000).toFixed(1)}K` : tokensToday,
      sub: `${papersToday} papers today`,
      change: 0,
      spark: [],
      highlight: true,
      tokenPct: Math.min(Math.round((tokensToday / 500000) * 100), 100),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: 'Total Papers',
      value: myPaperCount,
      sub: `${papersThisWeek} this week`,
      change: papersChange,
      spark: papersSparkline,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M8 13h8M8 17h5" />
        </svg>
      ),
    },
    {
      label: 'Active Teachers',
      value: activeTeachers,
      sub: 'last 7 days',
      change: teachersChange,
      spark: teacherSparkline,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Question Bank',
      value: questionBankSize.toLocaleString(),
      sub: 'verified questions',
      change: 0,
      spark: [],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      ),
    },
  ];

  const quickActions = [
    {
      title: 'Generate Paper',
      desc: 'Start from a board template',
      href: '/configure?board=CBSE',
      accent: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-5 h-5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
    },
    {
      title: 'Browse Templates',
      desc: `${templatesCount} ready to use`,
      href: '/configure?board=CBSE',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-5 h-5">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
        </svg>
      ),
    },
    {
      title: isAdmin ? 'View Analytics' : 'My Activity',
      desc: isAdmin ? 'Org-wide insights' : 'See your history',
      href: isAdmin ? '/admin' : '#recent',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-5 h-5">
          <path d="M3 3v18h18M7 15l4-4 4 4 5-6" />
        </svg>
      ),
    },
    {
      title: 'How It Works',
      desc: 'Learn the workflow',
      href: '/how-it-works',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-5 h-5">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 sm:px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center transition-transform hover:scale-105">
              <img src="/image.png" alt="Logo" className="h-7 w-auto object-contain drop-shadow-sm" />
            </div>
            <span className="text-[15px] font-extrabold tracking-tight">
              Intellogy
              <span className="text-foreground-soft font-medium ml-1.5 text-xs uppercase tracking-widest">corporation</span>
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/how-it-works" className="hidden sm:inline-block text-[12px] font-semibold text-foreground-muted hover:text-foreground transition-colors px-3 py-1.5">
              How it works
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-border hover:border-border-strong hover:bg-surface transition-colors">
                Admin
              </Link>
            )}
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-10">

        {/* ── HERO BLOCK ── */}
        <section className="animate-fade-in-up">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-1">
            <div>
              <p className="text-xs font-semibold text-foreground-muted uppercase tracking-widest mb-1">{dateLabel}</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {getGreeting()}, <span className="text-accent">{displayName}</span>
              </h1>
              <p className="text-[15px] text-foreground-muted mt-2 max-w-xl">
                Configure syllabus, difficulty, and source mix — generate exam-ready papers in seconds.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/configure?board=CBSE" className="btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Quick Generate
              </Link>
              <Link href="/configure?board=CBSE" className="btn-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                From Template
              </Link>
            </div>
          </div>
        </section>

        {/* ── KPI GRID ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          {kpis.map((k: any) => {
            const sparkPath = buildSparklinePath(k.spark);
            const trendUp = k.change >= 0;
            return (
              <div key={k.label} className={`kpi-card relative overflow-hidden ${k.highlight ? 'border-accent/40 bg-accent-soft/30' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.highlight ? 'bg-accent text-white' : 'bg-accent-soft text-accent'}`}>
                    {k.icon}
                  </div>
                  {k.spark.length > 0 && (
                    <svg width="80" height="24" viewBox="0 0 80 24" className="text-accent opacity-70">
                      <defs>
                        <linearGradient id={`grad-${k.label}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="currentColor" stopOpacity="0.20" />
                          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {sparkPath && (
                        <>
                          <path d={`${sparkPath} L80,24 L0,24 Z`} fill={`url(#grad-${k.label})`} />
                          <path d={sparkPath} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      )}
                    </svg>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-extrabold tracking-tight">{k.value}</div>
                  {k.change !== 0 && (
                    <span className={`text-[11px] font-semibold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
                      trendUp ? 'text-success bg-success-soft' : 'text-danger bg-danger-soft'
                    }`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                        <path d={trendUp ? 'M7 17l10-10M17 17V7H7' : 'M17 7L7 17M7 7v10h10'} />
                      </svg>
                      {Math.abs(k.change)}%
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-foreground-muted">{k.label} · <span className="text-foreground-soft">{k.sub}</span></div>
                {k.tokenPct !== undefined && (
                  <div className="mt-2">
                    <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(k.tokenPct, 1)}%`,
                          background: k.tokenPct > 80 ? '#ef4444' : k.tokenPct > 50 ? '#f59e0b' : 'var(--accent)',
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-foreground-soft mt-1 text-right">{k.tokenPct}% of 500K daily limit</div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* ── BOARDS GRID ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold tracking-tight">Start a new paper</h2>
            <Link href="/how-it-works" className="text-xs text-foreground-muted hover:text-foreground transition-colors">
              Need help? →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {BOARDS.map(board => (
              <Link key={board.id} href={`/configure?board=${board.id}`}
                className="soft-card group p-4 hover:border-border-strong hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center font-extrabold text-sm">
                    {board.id.slice(0, 2)}
                  </div>
                  <svg className="w-4 h-4 text-foreground-soft group-hover:text-accent group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="text-sm font-bold">{board.name}</div>
                <div className="text-xs text-foreground-muted mt-0.5 truncate">{board.fullName}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── QUICK ACTIONS ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <h2 className="text-sm font-bold tracking-tight mb-4">Quick actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map(q => (
              <Link key={q.title} href={q.href}
                className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                  q.accent
                    ? 'border-accent/30 bg-accent-soft hover:border-accent/60'
                    : 'border-border bg-surface-elev hover:border-border-strong hover:shadow-md'
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                  q.accent ? 'bg-accent text-white' : 'bg-accent-soft text-accent'
                }`}>
                  {q.icon}
                </div>
                <div className="text-sm font-bold">{q.title}</div>
                <div className="text-xs text-foreground-muted mt-0.5">{q.desc}</div>
                <svg className="absolute top-4 right-4 w-4 h-4 text-foreground-soft group-hover:text-accent group-hover:translate-x-0.5 transition-all"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        {/* ── ACTIVITY + TEMPLATES ── */}
        <section id="recent" className="grid grid-cols-1 lg:grid-cols-5 gap-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>

          {/* Recent Papers Table */}
          <div className="soft-card lg:col-span-3">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-sm font-bold tracking-tight">Recent papers</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-soft">{recentPapers.length} latest</span>
            </div>
            {recentPapers.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-surface mx-auto mb-3 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-foreground-soft">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </div>
                <p className="text-sm text-foreground-muted">No papers yet</p>
                <Link href="/configure?board=CBSE" className="inline-block mt-3 text-xs font-bold text-accent hover:underline">
                  Generate your first paper →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-faint text-foreground-soft text-[11px] font-semibold uppercase tracking-wider">
                      <th className="text-left px-4 py-2.5 font-semibold">Paper</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Board · Subject</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Sets</th>
                      <th className="text-right px-4 py-2.5 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPapers.map((p: any, i: number) => (
                      <tr key={i} className="border-b border-border-faint last:border-0 hover:bg-surface transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[13px] truncate max-w-[200px]">{p.examName || 'Unnamed paper'}</div>
                          <div className="text-[11px] text-foreground-soft">{p.totalMarks}m · {p.totalQuestions || '?'}Q</div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-foreground-muted">
                          <span className="font-semibold text-foreground">{p.board}</span> · {p.subject}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-accent-soft text-accent">
                            {p.numSets || 1} {(p.numSets || 1) > 1 ? 'sets' : 'set'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[11px] text-foreground-soft">
                          {new Date(p.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Templates list */}
          <div className="soft-card lg:col-span-2">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-sm font-bold tracking-tight">Templates</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-soft">{templates.length}</span>
            </div>
            {templates.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-foreground-muted">No templates yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border-faint">
                {templates.slice(0, 5).map((t: any) => (
                  <Link key={t._id.toString()} href={`/configure?board=${t.board}&template=${t._id}`}
                    className="block px-4 py-3 hover:bg-surface transition-colors group">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[13px] truncate group-hover:text-accent transition-colors">{t.name}</div>
                        <div className="text-[11px] text-foreground-muted mt-0.5">{t.board} · {t.subject} · {t.totalMarks}m</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface text-foreground-muted">{t.type}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── SAVED CONFIGS ── */}
        {savedConfigs.length > 0 && (
          <section className="soft-card animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-sm font-bold tracking-tight">Your saved configurations</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border-faint">
              {savedConfigs.map((c: any) => (
                <Link key={c._id.toString()} href={`/configure?board=${c.config?.board || 'CBSE'}`}
                  className="block px-4 py-3 hover:bg-surface transition-colors group">
                  <div className="font-semibold text-[13px] truncate group-hover:text-accent transition-colors">{c.name}</div>
                  <div className="text-[11px] text-foreground-muted mt-0.5">
                    {c.config?.board} · {c.config?.subject} · {c.config?.totalMarks || '—'} marks
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border py-5 mt-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
          <div className="text-[11px] text-foreground-muted">
            Powered by <span className="font-semibold text-accent">Intellogy Corporation</span>
          </div>
          <div className="text-[11px] text-foreground-soft tabular-nums">v2.0</div>
        </div>
      </footer>
    </div>
  );
}
