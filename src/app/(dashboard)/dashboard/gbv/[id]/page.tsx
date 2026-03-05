// src/app/dashboard/gbv/[id]/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Edit, AlertCircle, ChevronRight, Clock, MapPin, User,
  Brain, Zap, RefreshCw, CheckCircle, Loader2, Plus, X, ShieldAlert,
  Heart, Scale, Home, Phone, FileText, Activity
} from 'lucide-react';
import type { GBVCase } from '@/types/gbv';
import { GBV_INCIDENT_LABELS, GBV_STATUS_LABELS, SUPPORT_RESOURCE_LABELS } from '@/types/gbv';

const RISK_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 border-red-300',
  HIGH:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 border-orange-300',
  MEDIUM:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 border-yellow-300',
  LOW:      'bg-green-100 text-green-700 dark:bg-green-900/30 border-green-300',
};

const STATUS_COLORS: Record<string, string> = {
  REPORTED:            'bg-blue-100 text-blue-700',
  UNDER_INVESTIGATION: 'bg-indigo-100 text-indigo-700',
  REFERRED:            'bg-purple-100 text-purple-700',
  COURT_PROCEEDINGS:   'bg-orange-100 text-orange-700',
  CLOSED:              'bg-gray-100 text-gray-600',
  WITHDRAWN:           'bg-red-100 text-red-600',
};

const STATUSES = [
  'REPORTED',
  'UNDER_INVESTIGATION',
  'REFERRED',
  'COURT_PROCEEDINGS',
  'CLOSED',
  'WITHDRAWN',
] as const;

export default function GBVCaseDetailPage() {
  const { id }         = useParams<{ id: string }>();
  const router         = useRouter();
  const [gbvCase,      setGbvCase]      = useState<GBVCase | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [reAssessing,  setReAssessing]  = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showSupport,  setShowSupport]  = useState(false);
  const [fuNotes,      setFuNotes]      = useState('');
  const [fuDate,       setFuDate]       = useState('');
  const [fuSaving,     setFuSaving]     = useState(false);
  const [supType,      setSupType]      = useState('SHELTER');
  const [supDesc,      setSupDesc]      = useState('');
  const [supBy,        setSupBy]        = useState('');
  const [supSaving,    setSupSaving]    = useState(false);

  const fetchCase = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const res  = await fetch(`/api/gbv/cases/${id}`);
      const json = await res.json();
      if (!json.success) { setError(json.error ?? 'Failed to load case'); return; }
      setGbvCase(json.data);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  const handleStatus = async (newStatus: string) => {
    if (!gbvCase || statusSaving || gbvCase.status === newStatus) return;
    setStatusSaving(true);
    try {
      const res  = await fetch(`/api/gbv/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) setGbvCase(json.data);
    } catch { console.error('Status update failed'); }
    finally { setStatusSaving(false); }
  };

  const handleReAssess = async () => {
    if (!gbvCase) return;
    setReAssessing(true);
    try {
      const res  = await fetch('/api/gbv/ai-assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId:              id,
          incidentType:        gbvCase.incidentType,
          description:         gbvCase.description,
          victimAge:           gbvCase.victimAge,
          victimGender:        gbvCase.victimGender,
          victimInjured:       gbvCase.victimInjured,
          perpetratorKnown:    gbvCase.perpetratorKnown,
          perpetratorRelation: gbvCase.perpetratorRelation,
          perpetratorArrested: gbvCase.perpetratorArrested,
          location:            gbvCase.location,
        }),
      });
      const json = await res.json();
      if (json.success) fetchCase();
    } catch { console.error('Re-assessment failed'); }
    finally { setReAssessing(false); }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuNotes.trim()) return;
    setFuSaving(true);
    try {
      const res  = await fetch(`/api/gbv/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newFollowUp: {
            notes:       fuNotes.trim(),
            scheduledAt: fuDate ? new Date(fuDate).toISOString() : null,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setGbvCase(json.data);
        setShowFollowUp(false);
        setFuNotes('');
        setFuDate('');
      }
    } catch { console.error('Follow-up failed'); }
    finally { setFuSaving(false); }
  };

  const handleAddSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supDesc.trim()) return;
    setSupSaving(true);
    try {
      const res  = await fetch(`/api/gbv/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newSupportAction: {
            type:        supType,
            description: supDesc.trim(),
            providedBy:  supBy.trim() || null,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setGbvCase(json.data);
        setShowSupport(false);
        setSupDesc('');
        setSupBy('');
      }
    } catch { console.error('Support action failed'); }
    finally { setSupSaving(false); }
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-600" />
    </div>
  );

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error || !gbvCase) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <AlertCircle className="w-16 h-16 text-red-400" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{error || 'Case not found'}</h2>
      <div className="flex gap-3">
        <button onClick={fetchCase}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
        <Link href="/dashboard/gbv/cases"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 dark:text-gray-300">
          <ArrowLeft className="w-4 h-4" /> Back to Cases
        </Link>
      </div>
    </div>
  );

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/dashboard/gbv" className="hover:text-gray-700 dark:hover:text-gray-300">GBV</Link>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <Link href="/dashboard/gbv/cases" className="hover:text-gray-700 dark:hover:text-gray-300">Cases</Link>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <span className="text-gray-900 dark:text-white font-medium">{gbvCase.caseNumber}</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{gbvCase.caseNumber}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-rose-600 font-medium">
                {GBV_INCIDENT_LABELS[gbvCase.incidentType]}
              </span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[gbvCase.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {GBV_STATUS_LABELS[gbvCase.status]}
              </span>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${RISK_COLORS[gbvCase.riskLevel]}`}>
                {gbvCase.riskLevel} RISK
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={fetchCase}
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <Link href={`/dashboard/gbv/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
            <Edit className="w-4 h-4" /> Edit Case
          </Link>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT / MAIN COLUMN ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Incident Details */}
          <Card title="Incident Details">
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Location" value={gbvCase.location} />
            {gbvCase.county && (
              <InfoRow icon={<MapPin className="w-4 h-4 opacity-50" />} label="County / Sub-county"
                value={`${gbvCase.county}${gbvCase.subCounty ? ` / ${gbvCase.subCounty}` : ''}`} />
            )}
            <InfoRow icon={<Clock className="w-4 h-4" />} label="Date of Incident"
              value={new Date(gbvCase.incidentDate).toLocaleString('en-KE', { dateStyle: 'full', timeStyle: 'short' })} />
            <InfoRow icon={<Clock className="w-4 h-4 opacity-40" />} label="Date Reported"
              value={new Date(gbvCase.reportedDate).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })} />
            <InfoRow icon={<FileText className="w-4 h-4" />} label="Description">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap mt-1">
                {gbvCase.description}
              </p>
            </InfoRow>
          </Card>

          {/* Victim Information */}
          <Card title="🔒 Victim Information (Protected)">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Victim identity is protected under KPS data protection policy. No real names are stored.
              </p>
            </div>
            {gbvCase.victimCodeName && (
              <InfoRow icon={<User className="w-4 h-4" />} label="Code Name" value={gbvCase.victimCodeName} />
            )}
            {gbvCase.victimGender && (
              <InfoRow icon={<User className="w-4 h-4" />} label="Gender"
                value={gbvCase.victimGender.replace(/_/g, ' ')} />
            )}
            {gbvCase.victimAge && (
              <InfoRow icon={<User className="w-4 h-4" />} label="Approximate Age"
                value={`${gbvCase.victimAge} years`} />
            )}
            <InfoRow
              icon={gbvCase.victimInjured
                ? <AlertCircle className="w-4 h-4 text-red-500" />
                : <CheckCircle className="w-4 h-4 text-green-500" />}
              label="Injuries"
              value={gbvCase.victimInjured
                ? `Yes — ${gbvCase.victimInjuryDesc ?? 'See case notes'}`
                : 'No injuries reported'}
            />
          </Card>

          {/* Perpetrator */}
          <Card title="Perpetrator Information">
            <InfoRow icon={<User className="w-4 h-4" />} label="Known to Victim"
              value={gbvCase.perpetratorKnown ? 'Yes' : 'No'} />
            {gbvCase.perpetratorRelation && (
              <InfoRow icon={<User className="w-4 h-4" />} label="Relationship to Victim"
                value={gbvCase.perpetratorRelation} />
            )}
            <InfoRow
              icon={gbvCase.perpetratorArrested
                ? <CheckCircle className="w-4 h-4 text-green-500" />
                : <AlertCircle className="w-4 h-4 text-red-500" />}
              label="Arrest Status"
              value={gbvCase.perpetratorArrested ? 'Arrested — In custody' : 'Not arrested — At large'} />
          </Card>

          {/* AI Assessment */}
          <Card
            title="🤖 AI Risk Assessment"
            action={
              <button onClick={handleReAssess} disabled={reAssessing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors disabled:opacity-50">
                {reAssessing
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Brain className="w-3.5 h-3.5" />}
                {reAssessing ? 'Assessing...' : 'Re-assess with AI'}
              </button>
            }>

            <div className={`p-4 rounded-xl border-2 mb-5 ${RISK_COLORS[gbvCase.riskLevel]}`}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-sm">Risk Level: {gbvCase.riskLevel}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-bold">Score: {gbvCase.riskScore}/100</span>
                  {gbvCase.recurrenceRisk != null && (
                    <span className="opacity-70">Recurrence: {Math.round(gbvCase.recurrenceRisk * 100)}%</span>
                  )}
                </div>
              </div>
              {/* Risk bar */}
              <div className="w-full h-2 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    gbvCase.riskScore >= 80 ? 'bg-red-600' :
                    gbvCase.riskScore >= 60 ? 'bg-orange-500' :
                    gbvCase.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${gbvCase.riskScore}%` }}
                />
              </div>
              {gbvCase.aiSummary && (
                <p className="text-sm leading-relaxed">{gbvCase.aiSummary}</p>
              )}
            </div>

            {gbvCase.aiRecommendations && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Officer Recommendations
                </p>
                {gbvCase.aiRecommendations.split('\n').filter(Boolean).map((rec, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                    <Zap className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                  </div>
                ))}
              </div>
            )}

            {!gbvCase.aiSummary && !gbvCase.aiRecommendations && (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <Brain className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No AI assessment yet.</p>
                <p className="text-xs text-gray-400 mt-1">Click "Re-assess with AI" to generate risk analysis.</p>
              </div>
            )}
          </Card>

          {/* Support Actions */}
          <Card
            title={`Support Actions (${gbvCase.supportActions?.length ?? 0})`}
            action={
              <button onClick={() => setShowSupport(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            }>
            {(gbvCase.supportActions?.length ?? 0) === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <Heart className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No support actions recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gbvCase.supportActions!.map(a => (
                  <div key={a.id} className="p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-green-600">
                        {SUPPORT_RESOURCE_LABELS[a.type]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(a.providedAt).toLocaleDateString('en-KE')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{a.description}</p>
                    {a.providedBy && (
                      <p className="text-xs text-gray-500 mt-1.5">Provided by: {a.providedBy}</p>
                    )}
                    {a.notes && (
                      <p className="text-xs text-gray-500 mt-1 italic">{a.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Follow-Ups */}
          <Card
            title={`Follow-Up Notes (${gbvCase.followUps?.length ?? 0})`}
            action={
              <button onClick={() => setShowFollowUp(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            }>
            {(gbvCase.followUps?.length ?? 0) === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <Activity className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No follow-ups recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gbvCase.followUps!.map(f => (
                  <div key={f.id} className="p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(f.createdAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      {f.scheduledAt && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded-full">
                          Due: {new Date(f.scheduledAt).toLocaleDateString('en-KE')}
                        </span>
                      )}
                      {f.completedAt && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{f.notes}</p>
                    {f.outcome && (
                      <p className="text-xs text-green-600 mt-2 font-medium">Outcome: {f.outcome}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── RIGHT / SIDEBAR ── */}
        <div className="space-y-5">

          {/* Status Update */}
          <Card title="Update Case Status">
            <div className="space-y-1.5">
              {STATUSES.map(s => (
                <button key={s} onClick={() => handleStatus(s)}
                  disabled={statusSaving || gbvCase.status === s}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between gap-2
                    ${gbvCase.status === s
                      ? (STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-700') + ' cursor-default'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 cursor-pointer'
                    }`}>
                  <span>{GBV_STATUS_LABELS[s]}</span>
                  {gbvCase.status === s
                    ? <CheckCircle className="w-4 h-4 shrink-0" />
                    : statusSaving
                      ? <Loader2 className="w-4 h-4 animate-spin opacity-30 shrink-0" />
                      : null}
                </button>
              ))}
            </div>
          </Card>

          {/* Assigned Officer */}
          <Card title="Assigned Officer">
            {gbvCase.assignedTo ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{gbvCase.assignedTo.name}</p>
                  {gbvCase.assignedTo.badgeNumber && (
                    <p className="text-xs text-gray-500">Badge: {gbvCase.assignedTo.badgeNumber}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-red-500 font-medium">⚠ Unassigned</p>
              </div>
            )}
          </Card>

          {/* Station */}
          {gbvCase.station && (
            <Card title="Station">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{gbvCase.station.name}</p>
              <p className="text-xs text-gray-500 mt-1">Code: {gbvCase.station.code}</p>
              {gbvCase.station.county && (
                <p className="text-xs text-gray-500">County: {gbvCase.station.county}</p>
              )}
            </Card>
          )}

          {/* Recorded By */}
          {gbvCase.recordedBy && (
            <Card title="Recorded By">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{gbvCase.recordedBy.name}</p>
              {gbvCase.recordedBy.badgeNumber && (
                <p className="text-xs text-gray-500 mt-1">Badge: {gbvCase.recordedBy.badgeNumber}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(gbvCase.createdAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </Card>
          )}

          {/* Emergency Contacts */}
          <Card title="Emergency Support Lines">
            <div className="space-y-2">
              {[
                { label: 'GBV National Hotline', phone: '1195',         icon: Phone, color: 'red'   },
                { label: 'GENDER LINKS Kenya',   phone: '0722-259-782', icon: Heart, color: 'pink'  },
                { label: 'FIDA Kenya',           phone: '0719-638-006', icon: Scale, color: 'blue'  },
                { label: 'Childline Kenya',      phone: '116',          icon: Home,  color: 'green' },
              ].map(({ label, phone, icon: Icon, color }) => (
                <a key={label} href={`tel:${phone}`}
                  className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className={`p-1.5 bg-${color}-100 dark:bg-${color}-900/30 rounded-lg shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 text-${color}-600`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{phone}</p>
                  </div>
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Follow-Up Modal ── */}
      {showFollowUp && (
        <Modal title="Add Follow-Up Note" onClose={() => setShowFollowUp(false)}>
          <form onSubmit={handleAddFollowUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={fuNotes}
                onChange={e => setFuNotes(e.target.value)}
                rows={4} required
                placeholder="Officer notes on case progress, victim status, actions taken..."
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Scheduled Follow-up Date
              </label>
              <input
                type="date"
                value={fuDate}
                onChange={e => setFuDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowFollowUp(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={fuSaving || !fuNotes.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                {fuSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {fuSaving ? 'Saving...' : 'Save Follow-Up'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Support Action Modal ── */}
      {showSupport && (
        <Modal title="Add Support Action" onClose={() => setShowSupport(false)}>
          <form onSubmit={handleAddSupport} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Support Type <span className="text-red-500">*</span>
              </label>
              <select value={supType} onChange={e => setSupType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none">
                {Object.entries(SUPPORT_RESOURCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={supDesc}
                onChange={e => setSupDesc(e.target.value)}
                rows={3} required
                placeholder="Describe the support action taken..."
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Provided By
              </label>
              <input
                type="text"
                value={supBy}
                onChange={e => setSupBy(e.target.value)}
                placeholder="Organization or officer name"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowSupport(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={supSaving || !supDesc.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                {supSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                {supSaving ? 'Saving...' : 'Add Support Action'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Reusable sub-components ──────────────────────────────────────────────────

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
        {value
          ? <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
          : children}
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 rounded-t-2xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}