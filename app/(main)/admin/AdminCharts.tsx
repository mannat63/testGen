"use client";

import { useEffect, useState, useRef } from 'react';

/* ─── Donut Chart (Interactive with hover tooltips) ─── */
interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ segments, size = 160, strokeWidth = 18, label }: {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

  const radius = (size - strokeWidth - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const center = size / 2;

  // Calculate segment positions
  const segmentData = segments.map((seg, i) => {
    const pct = seg.value / total;
    const prevPcts = segments.slice(0, i).reduce((s, prev) => s + prev.value / total, 0);
    return { ...seg, pct, offset: prevPcts };
  });

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />

        {/* Segments */}
        {segmentData.map((seg, i) => {
          const dashLength = seg.pct * circumference;
          const gapLength = circumference - dashLength;
          const dashOffset = -(seg.offset * circumference);
          const isHovered = hovered === i;

          return (
            <circle
              key={i}
              cx={center} cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={mounted ? `${dashLength - 2} ${gapLength + 2}` : `0 ${circumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              className="cursor-pointer transition-all duration-500 ease-out"
              style={{
                filter: isHovered ? `drop-shadow(0 0 8px ${seg.color}80)` : 'none',
                opacity: hovered !== null && !isHovered ? 0.4 : 1,
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {hovered !== null ? (
          <>
            <span className="text-xl font-extrabold" style={{ color: segmentData[hovered].color }}>
              {segmentData[hovered].value}
            </span>
            <span className="text-[9px] text-admin-text-secondary uppercase tracking-wider font-bold mt-0.5 max-w-[60px] text-center leading-tight">
              {segmentData[hovered].label}
            </span>
            <span className="text-[8px] text-admin-muted mt-0.5">
              {Math.round(segmentData[hovered].pct * 100)}%
            </span>
          </>
        ) : (
          <>
            <span className="text-2xl font-extrabold text-admin-text">{total}</span>
            {label && <span className="text-[9px] text-admin-muted uppercase tracking-wider font-bold mt-0.5">{label}</span>}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Radial Gauge (Interactive) ─── */
export function RadialGauge({ value, max, label, size = 130, strokeWidth = 10 }: {
  value: number;
  max: number;
  label: string;
  size?: number;
  strokeWidth?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t); }, []);

  const radius = (size - strokeWidth - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const dashOffset = circumference * (1 - pct);
  const center = size / 2;

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer group"
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={mounted ? dashOffset : circumference}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: isHovered ? 'drop-shadow(0 0 10px rgba(249,115,22,0.5))' : 'none' }}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className={`text-xl font-extrabold transition-colors ${isHovered ? 'text-admin-accent' : 'text-admin-text'}`}>
          {Math.round(pct * 100)}%
        </span>
        <span className="text-[9px] text-admin-muted uppercase tracking-wider font-bold mt-0.5">{label}</span>
        {isHovered && (
          <span className="text-[8px] text-admin-accent mt-1 animate-fade-in-up">{value}/{max}</span>
        )}
      </div>
    </div>
  );
}

/* ─── Bar Sparkline (Interactive with hover values) ─── */
export function BarSparkline({ data, height = 40, barColor = '#f97316' }: {
  data: number[];
  height?: number;
  barColor?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 300); return () => clearTimeout(t); }, []);

  const max = Math.max(...data, 1);

  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((v, i) => {
        const h = Math.max(6, (v / max) * 100);
        const isHovered = hovered === i;
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm cursor-pointer transition-all duration-500 ease-out relative"
            style={{
              height: mounted ? `${h}%` : '4%',
              background: isHovered
                ? `linear-gradient(to top, ${barColor}, ${barColor})`
                : `linear-gradient(to top, ${barColor}88, ${barColor}44)`,
              transitionDelay: `${i * 60}ms`,
              boxShadow: isHovered ? `0 0 12px ${barColor}60` : 'none',
              transform: isHovered ? 'scaleY(1.1)' : 'scaleY(1)',
              transformOrigin: 'bottom',
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {isHovered && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-admin-card border border-admin-accent/30 rounded px-1.5 py-0.5 text-[9px] text-admin-accent font-bold whitespace-nowrap z-10 shadow-lg">
                {v}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Horizontal Stacked Bar (Interactive) ─── */
export function StackedBar({ segments, height = 10 }: {
  segments: { label: string; value: number; color: string }[];
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t); }, []);

  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  return (
    <div>
      <div className="w-full rounded-full overflow-hidden flex" style={{ height }}>
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          return (
            <div
              key={i}
              className="transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full cursor-pointer"
              style={{
                width: mounted ? `${pct}%` : '0%',
                background: seg.color,
                transitionDelay: `${i * 100}ms`,
                opacity: hovered !== null && hovered !== i ? 0.3 : 1,
                boxShadow: hovered === i ? `0 0 10px ${seg.color}60` : 'none',
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </div>
      {hovered !== null && (
        <div className="mt-1 text-[10px] font-bold text-admin-accent animate-fade-in-up">
          {segments[hovered].label}: {Math.round((segments[hovered].value / total) * 100)}%
        </div>
      )}
    </div>
  );
}

/* ─── Mini Stat Card ─── */
export function MiniStat({ icon, label, value, sub, delay = 0 }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  delay?: number;
}) {
  return (
    <div
      className="rounded-2xl p-4 animate-scale-in group cursor-default border border-admin-border hover:border-admin-accent/40 transition-all duration-300 relative overflow-hidden"
      style={{
        animationDelay: `${delay}ms`,
        background: 'linear-gradient(135deg, rgba(22,22,22,0.8), rgba(26,26,26,0.6))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-admin-accent/0 via-admin-accent/0 to-admin-accent/0 group-hover:from-admin-accent/5 group-hover:to-transparent transition-all duration-500 pointer-events-none rounded-2xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-admin-accent/20"
            style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.15)' }}>
            {icon}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-admin-muted">{label}</span>
        </div>
        <div className="text-2xl font-extrabold text-admin-text group-hover:text-admin-accent transition-colors duration-300">
          {value}
        </div>
        {sub && <div className="text-[10px] text-admin-muted mt-1">{sub}</div>}
      </div>
    </div>
  );
}
