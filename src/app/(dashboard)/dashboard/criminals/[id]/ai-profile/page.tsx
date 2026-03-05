// src/app/(dashboard)/dashboard/criminals/[id]/ai-profile/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Brain,
  Shield,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Users,
  Search,
  Target,
  RefreshCw,
  ChevronRight,
  Activity,
  BarChart3,
  FileWarning,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ThreatAssessment {
  overallThreat: string;
  publicDangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flightRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  recidivismProbability: 'LOW' | 'MEDIUM' | 'HIGH';
  violencePropensity: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface OffenseAnalysis {
  primaryOffenseCategory: string;
  offenseEscalation: 'DECREASING' | 'STABLE' | 'INCREASING' | 'INSUFFICIENT_DATA';
  modus_operandi: string;
  crimeTimeline: string;
}

interface InvestigationLead {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  lead: string;
  rationale: string;
}

interface GeographicProfile {
  primaryOperatingArea: string;
  mobilityRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  crossCountyRisk: string;
  notes: string;
}

interface AssociateNetwork {
  networkSize: 'ISOLATED' | 'SMALL' | 'MEDIUM' | 'LARGE';
  networkDanger: 'LOW' | 'MEDIUM' | 'HIGH';
  notes: string;
}

interface Recommendation {
  category: 'SURVEILLANCE' | 'INVESTIGATION' | 'PROSECUTION' | 'COMMUNITY' | 'ARREST' | 'OTHER';
  action: string;
  urgency: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
}

interface DataQuality {
  completenessScore: number;
  missingCriticalData: string[];
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  notes: string;
}

interface AIProfile {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threatAssessment: ThreatAssessment;
  profileSummary: string;
  behavioralPatterns: string[];
  offenseAnalysis: OffenseAnalysis;
  investigationLeads: InvestigationLead[];
  geographicProfile: GeographicProfile;
  associateNetwork: AssociateNetwork;
  recommendations: Recommendation[];
  dataQuality: DataQuality;
  generatedAt: string;
  analystNotes: string;
}

interface CriminalMeta {
  id: string;
  fullName: string;
  isWanted: boolean;
  caseCount: number;
  evidenceCount: number;
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

const RISK_CONFIG = {
  LOW:      { color: 'text-emerald-400',  bg: 'bg-emerald-950/60',  border: 'border-emerald-800',  bar: 'bg-emerald-500',  label: 'Low Risk'      },
  MEDIUM:   { color: 'text-amber-400',    bg: 'bg-amber-950/60',    border: 'border-amber-800',    bar: 'bg-amber-500',    label: 'Medium Risk'   },
  HIGH:     { color: 'text-orange-400',   bg: 'bg-orange-950/60',   border: 'border-orange-800',   bar: 'bg-orange-500',   label: 'High Risk'     },
  CRITICAL: { color: 'text-red-400',      bg: 'bg-red-950/60',      border: 'border-red-800',      bar: 'bg-red-500',      label: 'Critical Risk' },
};

const URGENCY_CONFIG = {
  IMMEDIATE:   { color: 'text-red-400',    bg: 'bg-red-950/40',    border: 'border-red-800'    },
  SHORT_TERM:  { color: 'text-amber-400',  bg: 'bg-amber-950/40',  border: 'border-amber-800'  },
  LONG_TERM:   { color: 'text-blue-400',   bg: 'bg-blue-950/40',   border: 'border-blue-800'   },
};

const PRIORITY_ICON: Record<string, string> = {
  HIGH: '🔴',
  MEDIUM: '🟡',
  LOW: '🟢',
};

const ESCALATION_CONFIG = {
  INCREASING:        { icon: '↑', color: 'text-red-400',    label: 'Escalating'        },
  STABLE:            { icon: '→', color: 'text-amber-400',  label: 'Stable'            },
  DECREASING:        { icon: '↓', color: 'text-emerald-400',label: 'De-escalating'     },
  INSUFFICIENT_DATA: { icon: '?', color: 'text-gray-400',   label: 'Insufficient Data' },
};

const CATEGORY_ICON: Record<string, string> = {
  SURVEILLANCE:  '📡',
  INVESTIGATION: '🔍',
  PROSECUTION:   '⚖️',
  COMMUNITY:     '🏘️',
  ARREST:        '🚔',
  OTHER:         '📋',
};

function getRiskConfig(level: keyof typeof RISK_CONFIG) {
  return RISK_CONFIG[level] ?? RISK_CONFIG.MEDIUM;
}

function LevelBadge({ level }: { level: string }) {
  const cfg = RISK_CONFIG[level as keyof typeof RISK_CONFIG];
  if (!cfg) return <span className="text-gray-400 text-xs">{level}</span>;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

// ─── Animated score ring ──────────────────────────────────────────────────────

function ScoreRing({ score, level }: { score: number; level: keyof typeof RISK_CONFIG }) {
  const cfg = getRiskConfig(level);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      <svg className="w-40 h-40 -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} stroke="#1f2937" strokeWidth="10" fill="none" />
        <circle
          cx="70" cy="70" r={radius}
          stroke="currentColor"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${cfg.color} transition-all duration-1000`}
          style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-4xl font-black tabular-nums ${cfg.color}`}>{score}</span>
        <span className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-0.5">Risk Score</span>
      </div>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function ThreatPill({ label, value }: { label: string; value: string }) {
  const cfg = RISK_CONFIG[value as keyof typeof RISK_CONFIG];
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-900/60 border border-gray-800">
      <span className="text-sm text-gray-400">{label}</span>
      {cfg
        ? <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
        : <span className="text-sm font-bold text-gray-300">{value}</span>
      }
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children, className = '' }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden ${className}`}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gray-900/60">
        <Icon className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-bold text-gray-100 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg bg-gray-800/60 animate-pulse ${className}`} />
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6">
        <div className="flex gap-6 items-center">
          <Skeleton className="w-40 h-40 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiProfilePage() {
  const params = useParams();
  const criminalId = params.id as string;

  const [profile, setProfile] = useState<AIProfile | null>(null);
  const [criminal, setCriminal] = useState<CriminalMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const fetchProfile = useCallback(async (isRegen = false) => {
    try {
      if (isRegen) setRegenerating(true);
      else setLoading(true);
      setError(null);

      const res = await fetch(`/api/criminals/${criminalId}/ai-profile`);
      const data = await res.json();

      if (data.success) {
        setProfile(data.data.profile);
        setCriminal(data.data.criminal);
      } else {
        setError(data.error || 'Failed to generate profile');
      }
    } catch (err) {
      setError('Network error — could not reach profiling service');
      console.error('AI profile fetch error:', err);
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }, [criminalId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-4 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/criminals/${criminalId}`}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-gray-100">AI Criminal Profile</span>
            {criminal && (
              <>
                <ChevronRight className="w-4 h-4 text-gray-600" />
                <span className="text-gray-400 text-sm">{criminal.fullName}</span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => fetchProfile(true)}
          disabled={loading || regenerating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {regenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Regenerating...</>
          ) : (
            <><RefreshCw className="w-4 h-4" />Regenerate</>
          )}
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── AI disclaimer banner ── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-950/40 border border-blue-900 text-sm text-blue-300">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
          <span>
            This profile is auto-generated by AI from available system data. It is an analytical tool to assist officers — 
            not a definitive determination of guilt. Verify all leads independently before taking action.
          </span>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 py-6 text-blue-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Analysing criminal record with AI...</span>
            </div>
            <LoadingState />
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <FileWarning className="w-12 h-12 text-red-500" />
            <p className="text-lg font-semibold text-gray-200">Profile Generation Failed</p>
            <p className="text-sm text-gray-400 max-w-md">{error}</p>
            <button
              onClick={() => fetchProfile()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {/* ── Profile content ── */}
        {profile && criminal && !loading && (
          <>
            {/* ── Hero: Risk Score + Wanted + Summary ── */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden">
              {/* Wanted banner */}
              {criminal.isWanted && (
                <div className="flex items-center gap-3 px-5 py-3 bg-red-950/60 border-b border-red-900">
                  <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                  <span className="text-sm font-bold text-red-400 uppercase tracking-wider">
                    ⚠ Wanted Person — Exercise Extreme Caution
                  </span>
                </div>
              )}

              <div className="p-6 flex flex-col md:flex-row gap-8 items-start">
                {/* Score ring */}
                <div className="flex flex-col items-center gap-4 flex-shrink-0">
                  <ScoreRing score={profile.riskScore} level={profile.riskLevel} />
                  <LevelBadge level={profile.riskLevel} />
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Generated</p>
                    <p className="text-xs text-gray-400 font-medium">
                      {new Date(profile.generatedAt).toLocaleString('en-KE', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div className="flex-1 min-w-0 space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Intelligence Summary</p>
                    <h2 className="text-xl font-bold text-gray-100">{criminal.fullName}</h2>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                      <span>{criminal.caseCount} case{criminal.caseCount !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>{criminal.evidenceCount} evidence item{criminal.evidenceCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 leading-relaxed">
                    {profile.profileSummary}
                  </p>

                  <p className="text-xs text-gray-500 italic">
                    {profile.threatAssessment.overallThreat}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Two column layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* LEFT COLUMN */}
              <div className="space-y-6">

                {/* Threat Assessment */}
                <Section icon={Shield} title="Threat Assessment">
                  <div className="space-y-2">
                    <ThreatPill label="Public Danger"         value={profile.threatAssessment.publicDangerLevel} />
                    <ThreatPill label="Flight Risk"           value={profile.threatAssessment.flightRisk} />
                    <ThreatPill label="Recidivism Probability" value={profile.threatAssessment.recidivismProbability} />
                    <ThreatPill label="Violence Propensity"   value={profile.threatAssessment.violencePropensity} />
                  </div>
                </Section>

                {/* Behavioral Patterns */}
                <Section icon={Activity} title="Behavioral Patterns">
                  <ul className="space-y-2">
                    {profile.behavioralPatterns.map((pattern, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </Section>

                {/* Offense Analysis */}
                <Section icon={BarChart3} title="Offense Analysis">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Primary Category</span>
                      <span className="text-sm font-bold text-blue-300">{profile.offenseAnalysis.primaryOffenseCategory}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Escalation Trend</span>
                      <span className={`text-sm font-bold ${ESCALATION_CONFIG[profile.offenseAnalysis.offenseEscalation]?.color ?? 'text-gray-400'}`}>
                        {ESCALATION_CONFIG[profile.offenseAnalysis.offenseEscalation]?.icon}{' '}
                        {ESCALATION_CONFIG[profile.offenseAnalysis.offenseEscalation]?.label}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-800 space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Modus Operandi</p>
                        <p className="text-sm text-gray-300">{profile.offenseAnalysis.modus_operandi}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Crime Timeline</p>
                        <p className="text-sm text-gray-300">{profile.offenseAnalysis.crimeTimeline}</p>
                      </div>
                    </div>
                  </div>
                </Section>

                {/* Geographic Profile */}
                <Section icon={MapPin} title="Geographic Profile">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Primary Operating Area</p>
                        <p className="text-sm font-medium text-gray-200">{profile.geographicProfile.primaryOperatingArea}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="px-3 py-2.5 rounded-lg bg-gray-900/60 border border-gray-800">
                        <p className="text-xs text-gray-500">Mobility Risk</p>
                        <LevelBadge level={profile.geographicProfile.mobilityRisk} />
                      </div>
                      <div className="px-3 py-2.5 rounded-lg bg-gray-900/60 border border-gray-800">
                        <p className="text-xs text-gray-500 mb-1">Cross-County Risk</p>
                        <div className="flex items-center gap-1">
                          {profile.geographicProfile.crossCountyRisk === 'true'
                            ? <><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-xs text-red-400 font-bold">Yes</span></>
                            : <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-emerald-400 font-bold">No</span></>
                          }
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">{profile.geographicProfile.notes}</p>
                  </div>
                </Section>

                {/* Associate Network */}
                <Section icon={Users} title="Associate Network">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="px-3 py-2.5 rounded-lg bg-gray-900/60 border border-gray-800">
                        <p className="text-xs text-gray-500">Network Size</p>
                        <p className="text-sm font-bold text-gray-200">{profile.associateNetwork.networkSize}</p>
                      </div>
                      <div className="px-3 py-2.5 rounded-lg bg-gray-900/60 border border-gray-800">
                        <p className="text-xs text-gray-500 mb-1">Network Danger</p>
                        <LevelBadge level={profile.associateNetwork.networkDanger} />
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">{profile.associateNetwork.notes}</p>
                  </div>
                </Section>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">

                {/* Investigation Leads */}
                <Section icon={Search} title="Investigation Leads">
                  <div className="space-y-3">
                    {profile.investigationLeads.map((lead, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{PRIORITY_ICON[lead.priority]}</span>
                          <span className="text-sm font-bold text-gray-100">{lead.lead}</span>
                        </div>
                        <p className="text-xs text-gray-500 pl-5">{lead.rationale}</p>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Recommendations */}
                <Section icon={Target} title="Officer Recommendations">
                  <div className="space-y-3">
                    {profile.recommendations.map((rec, i) => {
                      const urgencyCfg = URGENCY_CONFIG[rec.urgency];
                      return (
                        <div
                          key={i}
                          className={`rounded-lg border p-4 space-y-2 ${urgencyCfg?.bg} ${urgencyCfg?.border}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{CATEGORY_ICON[rec.category] ?? '📋'}</span>
                              <span className="text-sm font-bold text-gray-100">{rec.action}</span>
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wider flex-shrink-0 ${urgencyCfg?.color}`}>
                              {rec.urgency.replace('_', ' ')}
                            </span>
                          </div>
                          <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium border ${urgencyCfg?.bg} ${urgencyCfg?.color} ${urgencyCfg?.border}`}>
                            {rec.category}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Section>

                {/* Data Quality */}
                <Section icon={TrendingUp} title="Data Quality & Confidence">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500">Data Completeness</span>
                        <span className="text-xs font-bold text-gray-300">{profile.dataQuality.completenessScore}%</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-700"
                          style={{ width: `${profile.dataQuality.completenessScore}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Confidence Level</span>
                      <LevelBadge level={profile.dataQuality.confidenceLevel} />
                    </div>
                    {profile.dataQuality.missingCriticalData.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Missing Critical Data</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.dataQuality.missingCriticalData.map((field, i) => (
                            <span key={i} className="px-2 py-1 rounded text-xs bg-red-950/40 text-red-400 border border-red-900">
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">{profile.dataQuality.notes}</p>
                  </div>
                </Section>

                {/* Analyst Notes */}
                {profile.analystNotes && (
                  <Section icon={Clock} title="Analyst Notes">
                    <p className="text-sm text-gray-400 italic leading-relaxed">
                      {profile.analystNotes}
                    </p>
                  </Section>
                )}

                {/* Quick stats */}
                <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Quick Stats</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-900/60 border border-gray-800 p-3 text-center">
                      <p className="text-2xl font-black text-blue-400">{criminal.caseCount}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Total Cases</p>
                    </div>
                    <div className="rounded-lg bg-gray-900/60 border border-gray-800 p-3 text-center">
                      <p className="text-2xl font-black text-purple-400">{criminal.evidenceCount}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Evidence Items</p>
                    </div>
                    <div className="rounded-lg bg-gray-900/60 border border-gray-800 p-3 text-center">
                      <p className="text-2xl font-black text-emerald-400">{profile.investigationLeads.length}</p>
                      <p className="text-xs text-gray-500 mt-0.5">AI Leads</p>
                    </div>
                    <div className="rounded-lg bg-gray-900/60 border border-gray-800 p-3 text-center">
                      <p className="text-2xl font-black text-orange-400">{profile.recommendations.length}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Recommendations</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bottom actions ── */}
            <div className="flex items-center justify-between pt-2">
              <Link
                href={`/dashboard/criminals/${criminalId}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Profile
              </Link>
              <button
                onClick={() => fetchProfile(true)}
                disabled={regenerating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {regenerating
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Regenerating...</>
                  : <><RefreshCw className="w-4 h-4" />Regenerate Profile</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}