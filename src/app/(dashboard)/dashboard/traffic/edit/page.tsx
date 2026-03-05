//dashboard/traffic/edit/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, AlertCircle, ChevronRight,
  Loader2, TrafficCone, AlertTriangle, Truck, Plus, X,
} from 'lucide-react';
import type { IncidentType, AccidentSeverity, ImpoundReason } from '@/types/traffic';

interface Officer { id: string; name: string; badgeNumber: string }

const STATUSES = ['PENDING', 'INVESTIGATING', 'RESOLVED', 'CLOSED', 'CITATION_ISSUED'];

export default function EditTrafficIncidentPage() {
  const router    = useRouter();
  const { id }    = useParams<{ id: string }>();

  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState('');
  const [officers,setOfficers]  = useState<Officer[]>([]);

  // editable fields
  const [type,        setType]        = useState<IncidentType>('TRAFFIC');
  const [status,      setStatus]      = useState('PENDING');
  const [location,    setLocation]    = useState('');
  const [description, setDescription] = useState('');
  const [reportedAt,  setReportedAt]  = useState('');
  const [reportedBy,  setReportedBy]  = useState('');
  const [assignedToId,setAssignedToId]= useState('');

  // accident
  const [severity,          setSeverity]          = useState<AccidentSeverity>('MINOR');
  const [weatherConditions, setWeatherConditions] = useState('');
  const [roadConditions,    setRoadConditions]    = useState('');
  const [visibility,        setVisibility]        = useState('');

  // impound
  const [impoundReason,   setImpoundReason]   = useState<ImpoundReason>('PARKING_VIOLATION');
  const [impoundLocation, setImpoundLocation] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [impoundFee,      setImpoundFee]      = useState('');
  const [paymentStatus,   setPaymentStatus]   = useState('UNPAID');
  const [releasedTo,      setReleasedTo]      = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [incRes, officerRes] = await Promise.all([
        fetch(`/api/traffic/${id}`),
        fetch('/api/users?limit=1000&isActive=true'),
      ]);
      const incData     = await incRes.json();
      const officerData = await officerRes.json();

      if (!incData.success) { setError(incData.error || 'Failed to load incident'); return; }

      const inc = incData.data;
      setType(inc.type);
      setStatus(inc.status);
      setLocation(inc.location ?? '');
      setDescription(inc.description ?? '');
      setReportedAt(inc.reportedAt ? new Date(inc.reportedAt).toISOString().slice(0, 16) : '');
      setReportedBy(inc.reportedBy ?? '');
      setAssignedToId(inc.assignedToId ?? '');

      setSeverity(inc.severity ?? 'MINOR');
      setWeatherConditions(inc.weatherConditions ?? '');
      setRoadConditions(inc.roadConditions ?? '');
      setVisibility(inc.visibility ?? '');

      setImpoundReason(inc.impoundReason ?? 'PARKING_VIOLATION');
      setImpoundLocation(inc.impoundLocation ?? '');
      setStorageLocation(inc.storageLocation ?? '');
      setImpoundFee(inc.impoundFee?.toString() ?? '');
      setPaymentStatus(inc.paymentStatus ?? 'UNPAID');
      setReleasedTo(inc.releasedTo ?? '');

      if (officerData.success) setOfficers(officerData.data ?? []);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || !description.trim()) {
      setError('Location and description are required');
      return;
    }

    setSaving(true);
    setError('');

    const payload: Record<string, unknown> = {
      status,
      location:    location.trim(),
      description: description.trim(),
      reportedAt:  reportedAt ? new Date(reportedAt).toISOString() : undefined,
      reportedBy:  reportedBy.trim() || null,
      assignedToId:assignedToId || null,
    };

    if (type === 'ACCIDENT') {
      Object.assign(payload, {
        severity, weatherConditions: weatherConditions || null,
        roadConditions: roadConditions || null, visibility: visibility || null,
      });
    }

    if (type === 'IMPOUND') {
      Object.assign(payload, {
        impoundReason, impoundLocation: impoundLocation.trim() || null,
        storageLocation: storageLocation.trim() || null,
        impoundFee: impoundFee ? parseFloat(impoundFee) : null,
        paymentStatus, releasedTo: releasedTo.trim() || null,
        releasedAt: releasedTo.trim() ? new Date().toISOString() : null,
      });
    }

    try {
      const res  = await fetch(`/api/traffic/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        router.push(`/dashboard/traffic/${id}`);
      } else {
        setError(data.error || 'Failed to save changes');
      }
    } catch {
      setError('Network error – please try again');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  const TypeIcon = type === 'TRAFFIC' ? TrafficCone : type === 'ACCIDENT' ? AlertTriangle : Truck;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard"                   className="hover:text-gray-700 dark:hover:text-gray-300">Dashboard</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/dashboard/traffic"            className="hover:text-gray-700 dark:hover:text-gray-300">Traffic</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/dashboard/traffic/${id}`}   className="hover:text-gray-700 dark:hover:text-gray-300">Incident</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 dark:text-white">Edit</span>
      </nav>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TypeIcon className="w-6 h-6 text-gray-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit {type} Incident</h1>
        </div>
        <Link href={`/dashboard/traffic/${id}`}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" /> {error}
          </div>
        )}

        {/* Basic Info */}
        <Sec title="Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Lbl>Status</Lbl>
              <select value={status} onChange={e => setStatus(e.target.value)} className={inp}>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <Lbl>Location *</Lbl>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Street address, intersection, or landmark" className={inp} required />
            </div>

            <div className="sm:col-span-2">
              <Lbl>Description *</Lbl>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={3} className={inp} required />
            </div>

            <div>
              <Lbl>Date & Time</Lbl>
              <input type="datetime-local" value={reportedAt}
                onChange={e => setReportedAt(e.target.value)} className={inp} />
            </div>

            <div>
              <Lbl>Reported By</Lbl>
              <input type="text" value={reportedBy}
                onChange={e => setReportedBy(e.target.value)} className={inp} />
            </div>

            <div className="sm:col-span-2">
              <Lbl>Assigned Officer</Lbl>
              <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className={inp}>
                <option value="">— Unassigned —</option>
                {officers.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.badgeNumber})</option>
                ))}
              </select>
            </div>
          </div>
        </Sec>

        {/* Accident fields */}
        {type === 'ACCIDENT' && (
          <Sec title="Accident Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Lbl>Severity</Lbl>
                <select value={severity} onChange={e => setSeverity(e.target.value as AccidentSeverity)} className={inp}>
                  <option value="MINOR">Minor</option>
                  <option value="SERIOUS">Serious</option>
                  <option value="FATAL">Fatal</option>
                  <option value="PROPERTY_DAMAGE">Property Damage Only</option>
                </select>
              </div>
              <div>
                <Lbl>Weather Conditions</Lbl>
                <select value={weatherConditions} onChange={e => setWeatherConditions(e.target.value)} className={inp}>
                  <option value="">— Select —</option>
                  <option value="CLEAR">Clear</option>
                  <option value="RAIN">Rain</option>
                  <option value="FOG">Fog</option>
                  <option value="DUST">Dust / Haze</option>
                  <option value="NIGHT">Night / Low Light</option>
                </select>
              </div>
              <div>
                <Lbl>Road Conditions</Lbl>
                <select value={roadConditions} onChange={e => setRoadConditions(e.target.value)} className={inp}>
                  <option value="">— Select —</option>
                  <option value="DRY">Dry</option>
                  <option value="WET">Wet</option>
                  <option value="MUDDY">Muddy</option>
                  <option value="POTHOLES">Potholes</option>
                  <option value="UNDER_CONSTRUCTION">Under Construction</option>
                </select>
              </div>
              <div>
                <Lbl>Visibility</Lbl>
                <select value={visibility} onChange={e => setVisibility(e.target.value)} className={inp}>
                  <option value="">— Select —</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                </select>
              </div>
            </div>
          </Sec>
        )}

        {/* Impound fields */}
        {type === 'IMPOUND' && (
          <Sec title="Impound Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Lbl>Impound Reason</Lbl>
                <select value={impoundReason} onChange={e => setImpoundReason(e.target.value as ImpoundReason)} className={inp}>
                  <option value="PARKING_VIOLATION">Parking Violation</option>
                  <option value="EXPIRED_LICENSE">Expired License</option>
                  <option value="NO_INSURANCE">No Insurance</option>
                  <option value="STOLEN_VEHICLE">Stolen Vehicle</option>
                  <option value="DANGEROUS_DRIVING">Dangerous Driving</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <Lbl>Payment Status</Lbl>
                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className={inp}>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PAID">Paid</option>
                  <option value="WAIVED">Waived</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>
              <div>
                <Lbl>Impound Location</Lbl>
                <input type="text" value={impoundLocation}
                  onChange={e => setImpoundLocation(e.target.value)} className={inp} />
              </div>
              <div>
                <Lbl>Storage Location</Lbl>
                <input type="text" value={storageLocation}
                  onChange={e => setStorageLocation(e.target.value)} className={inp} />
              </div>
              <div>
                <Lbl>Impound Fee (KES)</Lbl>
                <input type="number" min="0" step="0.01" value={impoundFee}
                  onChange={e => setImpoundFee(e.target.value)} placeholder="0.00" className={inp} />
              </div>
              <div>
                <Lbl>Released To (if applicable)</Lbl>
                <input type="text" value={releasedTo}
                  onChange={e => setReleasedTo(e.target.value)}
                  placeholder="Name of person vehicle released to" className={inp} />
              </div>
            </div>
          </Sec>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href={`/dashboard/traffic/${id}`}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
              rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700
              text-white rounded-lg disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── tiny helpers ──────────────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none';
function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>;
}
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">{title}</h2>
      {children}
    </div>
  );
}