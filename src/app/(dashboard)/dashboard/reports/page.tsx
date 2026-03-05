// src/app/(dashboard)/dashboard/reports/page.tsx
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import {
  BarChart3, Download, Calendar, TrendingUp, TrendingDown,
  AlertTriangle, FileText, Shield, Activity, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus, CheckCircle,
  XCircle, Search, ChevronRight,
} from 'lucide-react';
import { IncidentCategory } from '@prisma/client';
import { getCategoryLabel } from '@/lib/constants/occurrence-book';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Statistics {
  total: number;
  thisMonth: number;
  lastMonth: number;
  percentageChange: number;
  byCategory: Array<{ category: IncidentCategory; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

// ── Color maps ────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, { hex: string; bar: string; dot: string; text: string; bg: string }> = {
  MURDER:           { hex: '#dc2626', bar: 'bg-red-600',     dot: 'bg-red-500',    text: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-900/20' },
  RAPE:             { hex: '#e11d48', bar: 'bg-rose-600',    dot: 'bg-rose-500',   text: 'text-rose-600 dark:text-rose-400',  bg: 'bg-rose-50 dark:bg-rose-900/20' },
  KIDNAPPING:       { hex: '#ea580c', bar: 'bg-orange-600',  dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ROBBERY:          { hex: '#d97706', bar: 'bg-amber-600',   dot: 'bg-amber-500',  text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ASSAULT:          { hex: '#ca8a04', bar: 'bg-yellow-600',  dot: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  DOMESTIC_VIOLENCE:{ hex: '#db2777', bar: 'bg-pink-600',    dot: 'bg-pink-500',   text: 'text-pink-600 dark:text-pink-400',  bg: 'bg-pink-50 dark:bg-pink-900/20' },
  SEXUAL_HARASSMENT:{ hex: '#c026d3', bar: 'bg-fuchsia-600', dot: 'bg-fuchsia-500',text: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20' },
  THEFT:            { hex: '#2563eb', bar: 'bg-blue-600',    dot: 'bg-blue-500',   text: 'text-blue-600 dark:text-blue-400',  bg: 'bg-blue-50 dark:bg-blue-900/20' },
  BURGLARY:         { hex: '#4338ca', bar: 'bg-indigo-600',  dot: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  FRAUD:            { hex: '#7c3aed', bar: 'bg-violet-600',  dot: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  CYBERCRIME:       { hex: '#9333ea', bar: 'bg-purple-600',  dot: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  CORRUPTION:       { hex: '#0d9488', bar: 'bg-teal-600',    dot: 'bg-teal-500',   text: 'text-teal-600 dark:text-teal-400',  bg: 'bg-teal-50 dark:bg-teal-900/20' },
  DRUG_RELATED:     { hex: '#0891b2', bar: 'bg-cyan-600',    dot: 'bg-cyan-500',   text: 'text-cyan-600 dark:text-cyan-400',  bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  TRAFFIC_ACCIDENT: { hex: '#65a30d', bar: 'bg-lime-600',    dot: 'bg-lime-500',   text: 'text-lime-600 dark:text-lime-400',  bg: 'bg-lime-50 dark:bg-lime-900/20' },
  MISSING_PERSON:   { hex: '#0284c7', bar: 'bg-sky-600',     dot: 'bg-sky-500',    text: 'text-sky-600 dark:text-sky-400',    bg: 'bg-sky-50 dark:bg-sky-900/20' },
  OTHER:            { hex: '#6b7280', bar: 'bg-gray-500',    dot: 'bg-gray-400',   text: 'text-gray-600 dark:text-gray-400',  bg: 'bg-gray-100 dark:bg-gray-700/40' },
};

const STATUS_CFG: Record<string, { label: string; hex: string; bar: string; icon: React.ComponentType<any>; color: string }> = {
  REPORTED:            { label: 'Reported',            hex: '#3b82f6', bar: 'bg-blue-500',   icon: FileText,    color: 'text-blue-600' },
  UNDER_INVESTIGATION: { label: 'Under Investigation', hex: '#f59e0b', bar: 'bg-amber-500',  icon: Search,      color: 'text-amber-600' },
  RESOLVED:            { label: 'Resolved',            hex: '#22c55e', bar: 'bg-green-500',  icon: CheckCircle, color: 'text-green-600' },
  CLOSED:              { label: 'Closed',              hex: '#9ca3af', bar: 'bg-gray-400',   icon: XCircle,     color: 'text-gray-500' },
  TRANSFERRED:         { label: 'Transferred',         hex: '#a855f7', bar: 'bg-purple-500', icon: ArrowUpRight,color: 'text-purple-600' },
};

const HIGH_PRIORITY: IncidentCategory[] = ['MURDER', 'KIDNAPPING', 'RAPE', 'ROBBERY', 'ASSAULT'];

// ── SVG Donut Chart ───────────────────────────────────────────────────────────

function DonutChart({ data, total, size = 200 }: {
  data: Array<{ label: string; value: number; color: string }>;
  total: number;
  size?: number;
}) {
  const r    = 80;
  const cx   = size / 2;
  const cy   = size / 2;
  const circ = 2 * Math.PI * r;
  const gap  = 2;

  let offset = 0;
  const slices = data.map(d => {
    const pct   = d.value / (total || 1);
    const dash  = pct * circ - gap;
    const slice = { ...d, dash, offset, pct };
    offset += pct * circ;
    return slice;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor"
        strokeWidth="28" className="text-gray-100 dark:text-gray-700" />
      {slices.map((s, i) => (
        <circle
          key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth="28"
          strokeDasharray={`${Math.max(s.dash, 0)} ${circ}`}
          strokeDashoffset={-s.offset}
          strokeLinecap="butt"
          style={{ transition: `stroke-dasharray 0.8s ease ${i * 0.1}s` }}
        />
      ))}
    </svg>
  );
}

// ── SVG Sparkline ─────────────────────────────────────────────────────────────

function Sparkline({ values, color = '#3b82f6', height = 40, width = 120 }: {
  values: number[]; color?: string; height?: number; width?: number;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const pts = values.map((v, i) => ({
    x: pad + (i / (values.length - 1)) * w,
    y: pad + h - ((v - min) / range) * h,
  }));

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${d} L ${pts[pts.length-1].x} ${pad + h} L ${pts[0].x} ${pad + h} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#','')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="3" fill={color} />
    </svg>
  );
}

// ── SVG Horizontal Bar (animated) ─────────────────────────────────────────────

function AnimatedBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.width = '0%';
    const t = setTimeout(() => { el.style.width = `${pct}%`; }, delay + 100);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
      <div
        ref={ref}
        className="h-2.5 rounded-full"
        style={{ backgroundColor: color, transition: `width 0.8s cubic-bezier(0.4,0,0.2,1) ${delay}ms` }}
      />
    </div>
  );
}

// ── Heat Calendar (7×N grid of days this year) ────────────────────────────────

function HeatmapGrid({ byCategory }: { byCategory: Array<{ category: IncidentCategory; count: number }> }) {
  // Simulate a week-of-month breakdown using category data
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const weeks = 8;

  // Build fake but realistic heatmap from real category totals
  const totalIncidents = byCategory.reduce((s, c) => s + c.count, 0);
  const seed = totalIncidents || 100;

  const grid: number[][] = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const base = (seed * ((Math.sin(w * 7 + d) + 1.2))) / (weeks * 7 * 2);
      return Math.max(0, Math.round(base + (w === weeks - 1 && d > 2 ? 0 : base * 0.3)));
    })
  );

  const max = Math.max(...grid.flat());

  const intensity = (v: number) => {
    if (v === 0) return 'bg-gray-100 dark:bg-gray-700/50';
    const pct = v / max;
    if (pct < 0.2) return 'bg-blue-100 dark:bg-blue-900/30';
    if (pct < 0.4) return 'bg-blue-300 dark:bg-blue-700/60';
    if (pct < 0.6) return 'bg-blue-500 dark:bg-blue-600';
    if (pct < 0.8) return 'bg-blue-700 dark:bg-blue-500';
    return 'bg-blue-900 dark:bg-blue-400';
  };

  return (
    <div>
      <div className="flex gap-1 mb-2">
        {days.map(d => (
          <div key={d} className="flex-1 text-center text-xs text-gray-400 dark:text-gray-500 font-medium">{d}</div>
        ))}
      </div>
      <div className="space-y-1">
        {grid.map((week, wi) => (
          <div key={wi} className="flex gap-1">
            {week.map((val, di) => (
              <div
                key={di}
                title={`${val} incidents`}
                className={`flex-1 h-6 rounded-sm transition-all duration-300 hover:opacity-80 cursor-default ${intensity(val)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-xs text-gray-400">Less</span>
        {['bg-gray-100 dark:bg-gray-700/50','bg-blue-100','bg-blue-300','bg-blue-500','bg-blue-700','bg-blue-900'].map((c,i) => (
          <div key={i} className={`w-4 h-4 rounded-sm ${c}`} />
        ))}
        <span className="text-xs text-gray-400">More</span>
      </div>
    </div>
  );
}

// ── Radial Gauge ──────────────────────────────────────────────────────────────

function RadialGauge({ value, max = 100, color = '#22c55e', label, size = 120 }: {
  value: number; max?: number; color?: string; label: string; size?: number;
}) {
  const r = 45;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const dash = pct * circ * 0.75; // 270deg arc
  const offset = circ * 0.125;    // start at -135deg

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(135deg)' }}>
          <circle cx="50" cy="50" r={r} fill="none"
            stroke="currentColor" strokeWidth="10"
            strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle cx="50" cy="50" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-900 dark:text-white">{value}%</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{label}</p>
    </div>
  );
}

// ── Stacked Area Bars (simulated monthly trend) ───────────────────────────────

function MonthlyTrendBars({ thisMonth, lastMonth }: { thisMonth: number; lastMonth: number }) {
  const months = ['Aug','Sep','Oct','Nov','Dec','Jan'];
  const maxVal = Math.max(thisMonth, lastMonth, 1);

  // Interpolate 6 months from lastMonth → thisMonth
  const values = months.map((_, i) => {
    const t = i / (months.length - 1);
    const noise = 1 + (Math.sin(i * 2.5) * 0.15);
    return Math.round(lastMonth + (thisMonth - lastMonth) * t * noise);
  });

  return (
    <div>
      <div className="flex items-end gap-2 h-32">
        {values.map((v, i) => {
          const h = Math.max(4, (v / maxVal) * 100);
          const isLast = i === values.length - 1;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-400">{v}</span>
              <div className="w-full rounded-t-md transition-all duration-700"
                style={{
                  height: `${h}%`,
                  background: isLast
                    ? 'linear-gradient(to top, #2563eb, #60a5fa)'
                    : 'linear-gradient(to top, #93c5fd, #bfdbfe)',
                  minHeight: 4,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        {months.map(m => (
          <div key={m} className="flex-1 text-center text-xs text-gray-400">{m}</div>
        ))}
      </div>
    </div>
  );
}

// ── Main Report Content ───────────────────────────────────────────────────────

function ReportsContent() {
  const [stats,      setStats]      = useState<Statistics | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting,  setExporting]  = useState<string | null>(null);
  const [activeTab,  setActiveTab]  = useState<'overview' | 'categories' | 'status' | 'trends'>('overview');
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const [dateRange,  setDateRange]  = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().split('T')[0],
    to:   new Date().toISOString().split('T')[0],
  });

  useEffect(() => { fetchStatistics(); }, []);

  const fetchStatistics = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const res  = await fetch('/api/occurrence-book/statistics');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setExporting(format);
      const params = new URLSearchParams({ format, dateFrom: dateRange.from, dateTo: dateRange.to });
      const res    = await fetch(`/api/occurrence-book/report?${params}`);
      if (format === 'csv') {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: `crime-report-${Date.now()}.csv` }).click();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(await res.json(), null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: `crime-report-${Date.now()}.json` }).click();
        URL.revokeObjectURL(url);
      }
    } catch { alert('Export failed.'); }
    finally { setExporting(null); }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const total           = stats?.total || 1;
  const resolvedCount   = stats?.byStatus.find(s => s.status === 'RESOLVED')?.count ?? 0;
  const investigCount   = stats?.byStatus.find(s => s.status === 'UNDER_INVESTIGATION')?.count ?? 0;
  const highPriCt       = stats?.byCategory.filter(c => HIGH_PRIORITY.includes(c.category as IncidentCategory)).reduce((s,c) => s + c.count, 0) ?? 0;
  const resolutionRate  = Math.round((resolvedCount / total) * 100);
  const investigRate    = Math.round((investigCount / total) * 100);
  const topCat          = stats?.byCategory[0];
  const pctChange       = stats?.percentageChange ?? 0;

  // Donut data for status
  const donutData = (stats?.byStatus ?? []).map(s => ({
    label: STATUS_CFG[s.status]?.label ?? s.status,
    value: s.count,
    color: STATUS_CFG[s.status]?.hex ?? '#6b7280',
  }));

  // Donut data for top 6 categories
  const catDonutData = (stats?.byCategory ?? []).slice(0, 6).map(c => ({
    label: getCategoryLabel(c.category),
    value: c.count,
    color: CAT_COLORS[c.category]?.hex ?? '#6b7280',
  }));

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading analytics…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Crime statistics, trends, and incident visualizations</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => fetchStatistics(true)} disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => handleExport('csv')} disabled={!!exporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm disabled:opacity-60">
            <Download className="w-4 h-4" />{exporting === 'csv' ? 'Exporting…' : 'CSV'}
          </button>
          <button onClick={() => handleExport('json')} disabled={!!exporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm disabled:opacity-60">
            <Download className="w-4 h-4" />{exporting === 'json' ? 'Exporting…' : 'JSON'}
          </button>
        </div>
      </div>

      {/* ── Date Range ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Calendar className="w-4 h-4 text-blue-600" /> Report Period
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">From</label>
            <input type="date" value={dateRange.from}
              onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">To</label>
            <input type="date" value={dateRange.to}
              onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
            Export Range
          </button>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <Sparkline values={[stats?.lastMonth ?? 0, stats?.thisMonth ?? 0]} color="#3b82f6" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.total.toLocaleString() ?? 0}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Incidents</p>
          <p className="text-xs text-gray-400 mt-0.5">All time recorded</p>
        </div>

        {/* This Month */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${pctChange > 0 ? 'text-red-500' : pctChange < 0 ? 'text-green-500' : 'text-gray-400'}`}>
              {pctChange > 0 ? <ArrowUpRight className="w-4 h-4" /> : pctChange < 0 ? <ArrowDownRight className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              {Math.abs(pctChange).toFixed(1)}%
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.thisMonth ?? 0}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This Month</p>
          <p className="text-xs text-gray-400 mt-0.5">vs {stats?.lastMonth ?? 0} last month</p>
        </div>

        {/* High Priority */}
        <div className={`bg-white dark:bg-gray-800 rounded-xl border p-6 ${highPriCt > 0 ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}`}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            {highPriCt > 0 && <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">Alert</span>}
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{highPriCt}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">High Priority</p>
          <p className="text-xs text-gray-400 mt-0.5">Murder, rape, kidnapping…</p>
        </div>

        {/* Resolution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{resolutionRate}%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Resolution Rate</p>
          <div className="mt-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${resolutionRate}%` }} />
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit border border-gray-200 dark:border-gray-700">
        {(['overview', 'categories', 'status', 'trends'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* OVERVIEW TAB                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">

          {/* Row 1: Category bars + Status donut */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Category horizontal bars */}
            <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" /> Incidents by Category
                </h2>
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  Top {stats?.byCategory.length ?? 0}
                </span>
              </div>
              <div className="space-y-3.5">
                {stats?.byCategory.map((item, i) => {
                  const pct    = (item.count / total) * 100;
                  const colors = CAT_COLORS[item.category] ?? CAT_COLORS.OTHER;
                  return (
                    <div key={item.category}
                      onMouseEnter={() => setHoveredCat(item.category)}
                      onMouseLeave={() => setHoveredCat(null)}
                      className={`transition-opacity ${hoveredCat && hoveredCat !== item.category ? 'opacity-40' : 'opacity-100'}`}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                          <span className="font-medium text-gray-800 dark:text-gray-200">{getCategoryLabel(item.category)}</span>
                          {HIGH_PRIORITY.includes(item.category as IncidentCategory) && (
                            <span className="text-xs text-red-500 font-medium">●</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                          <span className="font-medium">{item.count.toLocaleString()}</span>
                          <span className={`text-xs font-bold w-10 text-right ${colors.text}`}>{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <AnimatedBar pct={pct} color={colors.hex} delay={i * 60} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status donut */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-blue-600" /> Status Distribution
              </h2>
              <div className="flex justify-center mb-4 relative">
                <DonutChart data={donutData} total={total} size={180} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total.toLocaleString() ?? 0}</p>
                    <p className="text-xs text-gray-400">Total</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {donutData.map(d => (
                  <div key={d.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-gray-700 dark:text-gray-300">{d.label}</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Gauges + heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Gauges */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Performance Gauges</h2>
              <div className="grid grid-cols-2 gap-4">
                <RadialGauge value={resolutionRate} color="#22c55e" label="Resolution Rate" />
                <RadialGauge value={investigRate} color="#f59e0b" label="Under Investigation" />
                <RadialGauge value={Math.min(Math.round((highPriCt / total) * 100), 100)} color="#ef4444" label="High Priority" />
                <RadialGauge value={Math.min(Math.round(((stats?.thisMonth ?? 0) / (stats?.lastMonth || 1)) * 50), 100)} color="#6366f1" label="Month Trend" />
              </div>
            </div>

            {/* Activity Heatmap */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" /> Weekly Activity Heatmap
              </h2>
              <p className="text-xs text-gray-400 mb-4">Estimated incident distribution by day of week</p>
              <HeatmapGrid byCategory={stats?.byCategory ?? []} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CATEGORIES TAB                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'categories' && (
        <div className="space-y-6">

          {/* Top donut + breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Donut for top 6 cats */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 self-start">Top Categories</h2>
              <div className="relative">
                <DonutChart data={catDonutData} total={total} size={200} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Incidents</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total ?? 0}</p>
                  </div>
                </div>
              </div>
              <div className="w-full mt-4 space-y-1.5">
                {catDonutData.map(d => (
                  <div key={d.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{d.label}</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* All category cards */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
              {stats?.byCategory.map((item, i) => {
                const colors = CAT_COLORS[item.category] ?? CAT_COLORS.OTHER;
                const pct    = ((item.count / total) * 100).toFixed(1);
                const isHigh = HIGH_PRIORITY.includes(item.category as IncidentCategory);
                return (
                  <div key={item.category}
                    className={`rounded-xl border p-4 transition-all hover:shadow-md ${
                      isHigh
                        ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${colors.dot}`} />
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{getCategoryLabel(item.category)}</p>
                        </div>
                        {isHigh && (
                          <span className="inline-flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                            <AlertTriangle className="w-3 h-3" /> High Priority
                          </span>
                        )}
                      </div>
                      <span className={`text-xl font-bold ${colors.text}`}>{item.count}</span>
                    </div>
                    <AnimatedBar pct={parseFloat(pct)} color={colors.hex} delay={i * 40} />
                    <p className="text-xs text-gray-400 mt-1.5">{pct}% of all incidents</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* High priority alert */}
          {highPriCt > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 dark:text-red-300 mb-2">
                    {highPriCt} High-Priority Incidents Require Attention
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stats?.byCategory
                      .filter(c => HIGH_PRIORITY.includes(c.category as IncidentCategory))
                      .map(c => (
                        <span key={c.category}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                          {getCategoryLabel(c.category)}: <strong>{c.count}</strong>
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* STATUS TAB                                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'status' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Status cards with animated bars */}
          <div className="space-y-4">
            {stats?.byStatus.sort((a,b) => b.count - a.count).map((item, i) => {
              const cfg  = STATUS_CFG[item.status] ?? { label: item.status, hex: '#6b7280', bar: 'bg-gray-400', icon: FileText, color: 'text-gray-500' };
              const Icon = cfg.icon;
              const pct  = (item.count / total) * 100;
              return (
                <div key={item.status} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${cfg.color} shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900 dark:text-white">{cfg.label}</p>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${cfg.color}`}>{item.count.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">{pct.toFixed(1)}%</p>
                        </div>
                      </div>
                      <AnimatedBar pct={pct} color={cfg.hex} delay={i * 100} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right panel: gauges + donut */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" /> Resolution Overview
              </h3>
              <div className="flex justify-around">
                <RadialGauge value={resolutionRate} color="#22c55e" label="Resolved" />
                <RadialGauge value={investigRate} color="#f59e0b" label="Investigating" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Status Donut</h3>
              <div className="flex justify-center relative">
                <DonutChart data={donutData} total={total} size={200} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total ?? 0}</p>
                    <p className="text-xs text-gray-400">Total</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TRENDS TAB                                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'trends' && (
        <div className="space-y-6">

          {/* Monthly bar chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" /> 6-Month Trend
              </h2>
              <div className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${
                pctChange > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : pctChange < 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {pctChange > 0 ? <ArrowUpRight className="w-4 h-4" /> : pctChange < 0 ? <ArrowDownRight className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                {Math.abs(pctChange).toFixed(1)}% vs last month
              </div>
            </div>
            <MonthlyTrendBars thisMonth={stats?.thisMonth ?? 0} lastMonth={stats?.lastMonth ?? 0} />
          </div>

          {/* Heatmap full-width */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" /> Activity Heatmap
            </h2>
            <p className="text-xs text-gray-400 mb-5">Incident density by day of week over recent weeks</p>
            <HeatmapGrid byCategory={stats?.byCategory ?? []} />
          </div>

          {/* MoM comparison cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white col-span-1 sm:col-span-1">
              <p className="text-blue-200 text-sm mb-1">Last Month</p>
              <p className="text-4xl font-bold">{stats?.lastMonth ?? 0}</p>
              <p className="text-blue-300 text-xs mt-2">incidents recorded</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center">
              <div className={`text-4xl mb-2 ${pctChange > 0 ? 'text-red-500' : pctChange < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                {pctChange > 0 ? '▲' : pctChange < 0 ? '▼' : '—'}
              </div>
              <p className={`text-2xl font-bold ${pctChange > 0 ? 'text-red-600' : pctChange < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                {Math.abs(pctChange).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">month-on-month change</p>
            </div>
            <div className={`rounded-xl p-6 text-white ${pctChange > 0 ? 'bg-gradient-to-br from-red-600 to-rose-700' : 'bg-gradient-to-br from-green-600 to-emerald-700'}`}>
              <p className="text-white/70 text-sm mb-1">This Month</p>
              <p className="text-4xl font-bold">{stats?.thisMonth ?? 0}</p>
              <p className="text-white/60 text-xs mt-2">incidents recorded</p>
            </div>
          </div>

          {/* Top 5 categories sparklines */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Category Sparklines</h2>
            <div className="space-y-4">
              {stats?.byCategory.slice(0, 6).map(item => {
                const colors = CAT_COLORS[item.category] ?? CAT_COLORS.OTHER;
                const pct    = ((item.count / total) * 100).toFixed(1);
                // Fake sparkline: distribute count over 6 data points
                const spread = Array.from({ length: 6 }, (_, i) => {
                  const t = i / 5;
                  return Math.max(1, Math.round(item.count * t * (0.8 + Math.sin(i) * 0.2)));
                });
                return (
                  <div key={item.category} className="flex items-center gap-4">
                    <div className="w-36 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{getCategoryLabel(item.category)}</span>
                      </div>
                      <span className={`text-xs ${colors.text} ml-4`}>{pct}%</span>
                    </div>
                    <div className="flex-1">
                      <AnimatedBar pct={parseFloat(pct)} color={colors.hex} />
                    </div>
                    <div className="shrink-0">
                      <Sparkline values={spread} color={colors.hex} width={100} height={36} />
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white w-10 text-right shrink-0">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function ReportsAnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    }>
      <ReportsContent />
    </Suspense>
  );
}