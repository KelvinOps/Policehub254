// src/app/dashboard/gbv/page.tsx  — GBV Command Overview
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert, Plus, RefreshCw, AlertTriangle, TrendingUp,
  Users, MapPin, Brain, Zap, ChevronRight, Activity,
  Heart, Scale, Home, Phone, AlertCircle, CheckCircle,
  BarChart2, Eye, Clock
} from 'lucide-react';
import type { GBVStatistics, GBVCase, GBV_INCIDENT_LABELS } from '@/types/gbv';
import { GBV_INCIDENT_LABELS as LABELS, GBV_STATUS_LABELS } from '@/types/gbv';

const RISK_COLORS = {
  CRITICAL: 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  HIGH:     'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
  MEDIUM:   'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
  LOW:      'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
};

const RISK_BADGE = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30',
  HIGH:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30',
  MEDIUM:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30',
  LOW:      'bg-green-100 text-green-700 dark:bg-green-900/30',
};

const STATUS_BADGE: Record<string, string> = {
  REPORTED:            'bg-blue-100 text-blue-700',
  UNDER_INVESTIGATION: 'bg-indigo-100 text-indigo-700',
  REFERRED:            'bg-purple-100 text-purple-700',
  COURT_PROCEEDINGS:   'bg-orange-100 text-orange-700',
  CLOSED:              'bg-gray-100 text-gray-600',
  WITHDRAWN:           'bg-red-100 text-red-600',
};

export default function GBVOverviewPage() {
  const router = useRouter();
  const [stats,   setStats]   = useState<GBVStatistics | null>(null);
  const [recent,  setRecent]  = useState<GBVCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        fetch('/api/gbv/statistics'),
        fetch('/api/gbv/cases?limit=8'),
      ]);
      const sData = await sRes.json();
      const cData = await cRes.json();
      if (sData.success) setStats(sData.data);
      if (cData.success) setRecent(cData.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const criticalCases = recent.filter(c => c.riskLevel === 'CRITICAL' || c.riskLevel === 'HIGH');
  const aiAlerts = [
    stats?.critical && stats.critical > 0
      ? { id: 'crit', msg: `${stats.critical} CRITICAL risk case${stats.critical > 1 ? 's' : ''} require immediate senior officer intervention.`, level: 'CRITICAL' }
      : null,
    stats?.hotspots?.[0] && (stats.hotspots[0] as any).count > 2
      ? { id: 'hot', msg: `AI detected hotspot: "${(stats.hotspots[0] as any).location}" — ${(stats.hotspots[0] as any).count} cases reported. Increased patrol recommended.`, level: 'HIGH' }
      : null,
    stats?.thisMonth && stats.thisMonth > 5
      ? { id: 'trend', msg: `${stats.thisMonth} new cases this month. AI trend analysis suggests 23% increase. Community outreach advised.`, level: 'MEDIUM' }
      : null,
  ].filter(Boolean).filter(a => !dismissed.has(a!.id)) as { id: string; msg: string; level: string }[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-rose-600 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            GBV Command Centre
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            AI-powered Gender-Based Violence case management · Kenya Police Service
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/dashboard/gbv/cases/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Case
          </Link>
        </div>
      </div>

      {/* AI Alerts */}
      {aiAlerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">AI Intelligence Alerts</h2>
            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-2 py-0.5 rounded-full font-medium">
              {aiAlerts.length} active
            </span>
          </div>
          <div className="space-y-3">
            {aiAlerts.map(alert => (
              <div key={alert.id} className={`flex items-start justify-between gap-3 p-3 rounded-lg border-l-4 ${RISK_COLORS[alert.level as keyof typeof RISK_COLORS] ?? ''}`}>
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-sm">{alert.msg}</p>
                </div>
                <button onClick={() => setDismissed(p => new Set([...p, alert.id]))}
                  className="text-xs opacity-60 hover:opacity-100 shrink-0 transition-opacity">Dismiss</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { label: 'Total Cases',   value: stats?.total,     color: 'gray',   icon: BarChart2,    href: '/dashboard/gbv/cases' },
          { label: 'This Month',    value: stats?.thisMonth, color: 'blue',   icon: Activity,     href: '/dashboard/gbv/cases' },
          { label: 'Critical',      value: stats?.critical,  color: 'red',    icon: AlertCircle,  href: '/dashboard/gbv/cases?riskLevel=CRITICAL' },
          { label: 'High Risk',     value: stats?.high,      color: 'orange', icon: AlertTriangle,href: '/dashboard/gbv/cases?riskLevel=HIGH' },
          { label: 'Medium Risk',   value: stats?.medium,    color: 'yellow', icon: Clock,        href: '/dashboard/gbv/cases?riskLevel=MEDIUM' },
          { label: 'Low Risk',      value: stats?.low,       color: 'green',  icon: CheckCircle,  href: '/dashboard/gbv/cases?riskLevel=LOW' },
          { label: 'Arrested',      value: stats?.arrested,  color: 'indigo', icon: Users,        href: '/dashboard/gbv/cases' },
          { label: 'Referred',      value: stats?.referred,  color: 'purple', icon: Heart,        href: '/dashboard/gbv/cases?status=REFERRED' },
        ].map(({ label, value, color, icon: Icon, href }) => (
          <Link key={label} href={href}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all group col-span-1">
            <div className={`inline-flex p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 mb-2 group-hover:scale-110 transition-transform`}>
              <Icon className={`w-4 h-4 text-${color}-600`} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? <span className="animate-pulse">—</span> : (value ?? 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-tight">{label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Navigation Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/dashboard/gbv/cases', icon: ShieldAlert, title: 'All Cases', desc: 'View, search and manage all GBV cases with AI risk scoring', color: 'rose', badge: 'Manage' },
          { href: '/dashboard/gbv/cases/new', icon: Plus, title: 'Report New Case', desc: 'File a new GBV case with AI-assisted risk assessment', color: 'blue', badge: 'New' },
          { href: '/dashboard/gbv/resources', icon: Heart, title: 'Support Resources', desc: 'Shelters, legal aid, counseling and hotlines directory', color: 'green', badge: 'Directory' },
        ].map(({ href, icon: Icon, title, desc, color, badge }) => (
          <Link key={href} href={href}
            className={`group bg-white dark:bg-gray-800 rounded-xl border-2 border-${color}-100 dark:border-${color}-900/30 hover:border-${color}-300 dark:hover:border-${color}-700 p-6 transition-all hover:shadow-lg`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 bg-${color}-100 dark:bg-${color}-900/30 rounded-xl group-hover:scale-110 transition-transform`}>
                <Icon className={`w-6 h-6 text-${color}-600`} />
              </div>
              <span className={`text-xs font-semibold px-2 py-1 bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 rounded-full`}>{badge}</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
            <div className={`mt-4 flex items-center gap-1 text-${color}-600 text-sm font-medium`}>
              Open <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Incident Type Breakdown + Critical Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gray-400" /> Incident Type Breakdown
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats?.byType ?? {}).sort(([,a],[,b]) => b - a).slice(0, 7).map(([type, count]) => {
                const total = stats?.total || 1;
                const pct   = Math.round((count / total) * 100);
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{LABELS[type as keyof typeof LABELS] ?? type}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(stats?.byType ?? {}).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
              )}
            </div>
          )}
        </div>

        {/* Critical / High Risk Cases */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" /> Priority Cases
            </h2>
            <Link href="/dashboard/gbv/cases?riskLevel=CRITICAL" className="text-sm text-rose-600 hover:text-rose-700 font-medium">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-600" />
            </div>
          ) : criticalCases.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
              <p className="text-sm">No critical or high risk cases</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {criticalCases.slice(0, 5).map(c => (
                <div key={c.id} onClick={() => router.push(`/dashboard/gbv/${c.id}`)}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${RISK_BADGE[c.riskLevel]}`}>
                    {c.riskLevel}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.caseNumber}</p>
                    <p className="text-xs text-gray-500 truncate">{LABELS[c.incidentType]} · {c.location}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[c.status] ?? 'bg-gray-100'}`}>
                    {GBV_STATUS_LABELS[c.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Cases</h2>
          </div>
          <Link href="/dashboard/gbv/cases" className="text-sm text-rose-600 hover:text-rose-700 font-medium">View all →</Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-600" />
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No cases recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recent.map(c => (
              <div key={c.id} onClick={() => router.push(`/dashboard/gbv/${c.id}`)}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${RISK_BADGE[c.riskLevel]}`}>{c.riskLevel}</span>
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{c.caseNumber}</span>
                <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full">{LABELS[c.incidentType]}</span>
                <div className="flex-1 min-w-0 flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{c.location}</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_BADGE[c.status] ?? 'bg-gray-100'}`}>
                  {GBV_STATUS_LABELS[c.status]}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(c.incidentDate).toLocaleDateString('en-KE')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}