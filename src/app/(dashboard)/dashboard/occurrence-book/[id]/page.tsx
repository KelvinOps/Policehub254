// src/app/(dashboard)/dashboard/occurrence-book/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  MapPin,
  Calendar,
  User,
  Phone,
  Clock,
  AlertCircle,
  CheckCircle,
  Briefcase,
  Plus,
  ChevronRight,
  Loader2,
  Shield,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  getCategoryColor,
  getStatusColor,
  getCategoryLabel,
  getStatusLabel,
} from '@/lib/constants/occurrence-book';
import { getCaseStatusColor, getCaseStatusLabel, getCasePriorityColor } from '@/lib/constants/case';
import { CaseStatus, IncidentCategory, IncidentStatus } from '@prisma/client';

interface LinkedCase {
  id: string;
  caseNumber: string;
  title: string;
  status: CaseStatus;
  priority: string;
  createdAt: string;
  assignedTo?: { name: string; badgeNumber: string } | null;
}

interface OBEntry {
  id: string;
  obNumber: string;
  incidentDate: string;
  reportedDate: string;
  category: IncidentCategory;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  status: IncidentStatus;
  reportedBy: string;
  contactNumber: string;
  evidenceFiles?: string[];
  witnesses?: WitnessInfo[];
  suspects?: SuspectInfo[];
  Station: { id: string; name: string; code: string };
  User: { id: string; name: string; badgeNumber: string; role: string };
  cases: LinkedCase[];
}

interface WitnessInfo {
  name: string;
  contactNumber: string;
  idNumber: string;
  address: string;
  statement: string;
}

interface SuspectInfo {
  name: string;
  alias: string[];
  description: string;
  lastSeenLocation: string;
  lastSeenTime: string;
  identifyingFeatures: string[];
}

interface UserData {
  id: string;
  name: string;
  role: string;
  stationId?: string;
}

export default function OBEntryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || '';

  const [entry, setEntry] = useState<OBEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  useEffect(() => {
    if (id) fetchEntry();
  }, [id]);

  const fetchEntry = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/occurrence-book/${id}`);
      const data = await res.json();
      if (data.success) {
        setEntry(data.data);
      } else {
        alert(data.error || 'Failed to load entry');
        router.push('/dashboard/occurrence-book');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load entry');
      router.push('/dashboard/occurrence-book');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    if (entry.cases.length > 0) {
      alert(`Cannot delete: this entry is linked to ${entry.cases.length} case(s).`);
      return;
    }
    if (!confirm(`Delete OB entry ${entry.obNumber}? This cannot be undone.`)) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/occurrence-book/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        router.push('/dashboard/occurrence-book');
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch {
      alert('Failed to delete entry');
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = () =>
    user && ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'].includes(user.role);

  const canCreateCase = () =>
    user && ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER', 'OCS', 'DETECTIVE', 'OFFICER'].includes(user.role);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-KE', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!entry) return null;

  const hasCases = entry.cases.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {entry.obNumber}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                {getStatusLabel(entry.status)}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(entry.category)}`}>
                {getCategoryLabel(entry.category)}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {entry.Station.name} ({entry.Station.code})
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/occurrence-book/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
          {canDelete() && (
            <button
              onClick={handleDelete}
              disabled={deleting || hasCases}
              title={hasCases ? 'Cannot delete: linked cases exist' : 'Delete entry'}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content — left 2/3 */}
        <div className="lg:col-span-2 space-y-6">

          {/* Incident details */}
          <Section title="Incident Details" icon={FileText}>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Detail icon={Calendar} label="Incident Date" value={formatDate(entry.incidentDate)} />
              <Detail icon={Clock} label="Reported Date" value={formatDate(entry.reportedDate)} />
              <Detail icon={MapPin} label="Location" value={entry.location} />
              {entry.latitude && entry.longitude && (
                <Detail
                  icon={MapPin}
                  label="GPS Coordinates"
                  value={`${entry.latitude.toFixed(6)}, ${entry.longitude.toFixed(6)}`}
                />
              )}
              <Detail icon={User} label="Recorded By" value={`${entry.User.name} (${entry.User.badgeNumber})`} />
              <Detail icon={Shield} label="Station" value={`${entry.Station.name} — ${entry.Station.code}`} />
            </dl>
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Description
              </p>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                {entry.description}
              </p>
            </div>
          </Section>

          {/* Reporter */}
          <Section title="Reporter Information" icon={User}>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Detail icon={User} label="Name" value={entry.reportedBy} />
              <Detail icon={Phone} label="Contact" value={entry.contactNumber} />
            </dl>
          </Section>

          {/* Witnesses */}
          {entry.witnesses && entry.witnesses.length > 0 && (
            <Section title={`Witnesses (${entry.witnesses.length})`} icon={User}>
              <div className="space-y-4">
                {entry.witnesses.map((w, i) => (
                  <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Witness {i + 1}: {w.name || '—'}
                    </p>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <MiniDetail label="Contact" value={w.contactNumber} />
                      <MiniDetail label="ID Number" value={w.idNumber} />
                      <MiniDetail label="Address" value={w.address} />
                    </dl>
                    {w.statement && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Statement</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {w.statement}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Suspects */}
          {entry.suspects && entry.suspects.length > 0 && (
            <Section title={`Suspects (${entry.suspects.length})`} icon={AlertCircle}>
              <div className="space-y-4">
                {entry.suspects.map((s, i) => (
                  <div key={i} className="border border-red-100 dark:border-red-900/40 rounded-lg p-4 bg-red-50/40 dark:bg-red-900/10">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Suspect {i + 1}{s.name ? `: ${s.name}` : ''}
                    </p>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {s.alias.length > 0 && <MiniDetail label="Alias" value={s.alias.join(', ')} />}
                      <MiniDetail label="Last Seen" value={s.lastSeenLocation} />
                      <MiniDetail label="Last Seen Time" value={s.lastSeenTime} />
                      {s.identifyingFeatures.length > 0 && (
                        <MiniDetail label="Identifying Features" value={s.identifyingFeatures.join(', ')} />
                      )}
                    </dl>
                    {s.description && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{s.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Sidebar — right 1/3 */}
        <div className="space-y-6">

          {/* ── LINKED CASES PANEL ─────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Linked Cases
                </h3>
                {hasCases && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                    {entry.cases.length}
                  </span>
                )}
              </div>
            </div>

            {/* No cases yet — highlight the gap + CTA */}
            {!hasCases && (
              <div className="px-5 py-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  No case opened yet
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                  This incident has been recorded but no investigation case has been created from it.
                </p>
                {canCreateCase() && (
                  <Link
                    href={`/dashboard/cases/new?obEntryId=${entry.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Open a Case
                  </Link>
                )}
              </div>
            )}

            {/* Cases list */}
            {hasCases && (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {entry.cases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/dashboard/cases/${c.id}`)}
                    className="w-full text-left px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                          {c.caseNumber}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate mt-0.5">
                          {c.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCaseStatusColor(c.status)}`}>
                            {getCaseStatusLabel(c.status)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCasePriorityColor(c.priority)}`}>
                            {c.priority}
                          </span>
                        </div>
                        {c.assignedTo && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {c.assignedTo.name}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* If cases exist, still offer to open another */}
            {hasCases && canCreateCase() && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700">
                <Link
                  href={`/dashboard/cases/new?obEntryId=${entry.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Open another case
                </Link>
              </div>
            )}
          </div>

          {/* Quick status summary card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Entry Summary</h3>
            <div className="flex items-center gap-3">
              {hasCases ? (
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {hasCases
                  ? `${entry.cases.length} case${entry.cases.length > 1 ? 's' : ''} linked`
                  : 'Not yet escalated to a case'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {(entry.witnesses?.length ?? 0) > 0
                  ? `${entry.witnesses!.length} witness${entry.witnesses!.length > 1 ? 'es' : ''} recorded`
                  : 'No witnesses recorded'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {(entry.suspects?.length ?? 0) > 0
                  ? `${entry.suspects!.length} suspect${entry.suspects!.length > 1 ? 's' : ''} recorded`
                  : 'No suspects recorded'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small sub-components ──────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4 text-gray-500" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </dt>
      <dd className="text-sm text-gray-900 dark:text-white">{value || '—'}</dd>
    </div>
  );
}

function MiniDetail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800 dark:text-gray-200">{value}</dd>
    </div>
  );
}