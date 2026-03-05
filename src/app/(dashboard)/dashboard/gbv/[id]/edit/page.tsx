// src/app/dashboard/gbv/[id]/edit/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle, ChevronRight, Loader2, ShieldAlert } from 'lucide-react';
import type { GBVIncidentType, GBVCaseStatus, GBVVictimGender } from '@/types/gbv';

interface Officer { id: string; name: string; badgeNumber: string }

const inp =
  'w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

export default function EditGBVCasePage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [officers, setOfficers] = useState<Officer[]>([]);

  // Form fields
  const [status,               setStatus]               = useState<GBVCaseStatus>('REPORTED');
  const [incidentType,         setIncidentType]         = useState<GBVIncidentType>('PHYSICAL_VIOLENCE');
  const [incidentDate,         setIncidentDate]         = useState('');
  const [location,             setLocation]             = useState('');
  const [county,               setCounty]               = useState('');
  const [subCounty,            setSubCounty]            = useState('');
  const [description,          setDescription]          = useState('');
  const [victimAge,            setVictimAge]            = useState('');
  const [victimGender,         setVictimGender]         = useState<GBVVictimGender>('FEMALE');
  const [victimCodeName,       setVictimCodeName]       = useState('');
  const [victimInjured,        setVictimInjured]        = useState(false);
  const [victimInjuryDesc,     setVictimInjuryDesc]     = useState('');
  const [perpetratorKnown,     setPerpetratorKnown]     = useState(false);
  const [perpetratorRelation,  setPerpetratorRelation]  = useState('');
  const [perpetratorArrested,  setPerpetratorArrested]  = useState(false);
  const [assignedToId,         setAssignedToId]         = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, oRes] = await Promise.all([
        fetch(`/api/gbv/cases/${id}`),
        fetch('/api/users?limit=1000&isActive=true'),
      ]);
      const cData = await cRes.json();
      const oData = await oRes.json();

      if (!cData.success) { setError(cData.error ?? 'Failed to load case'); return; }

      const c = cData.data;
      setStatus(c.status);
      setIncidentType(c.incidentType);
      setIncidentDate(c.incidentDate ? new Date(c.incidentDate).toISOString().slice(0, 16) : '');
      setLocation(c.location ?? '');
      setCounty(c.county ?? '');
      setSubCounty(c.subCounty ?? '');
      setDescription(c.description ?? '');
      setVictimAge(c.victimAge?.toString() ?? '');
      setVictimGender(c.victimGender ?? 'FEMALE');
      setVictimCodeName(c.victimCodeName ?? '');
      setVictimInjured(c.victimInjured ?? false);
      setVictimInjuryDesc(c.victimInjuryDesc ?? '');
      setPerpetratorKnown(c.perpetratorKnown ?? false);
      setPerpetratorRelation(c.perpetratorRelation ?? '');
      setPerpetratorArrested(c.perpetratorArrested ?? false);
      setAssignedToId(c.assignedToId ?? '');

      if (oData.success) setOfficers(oData.data ?? []);
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || !description.trim()) {
      setError('Location and description are required');
      return;
    }
    setSaving(true); setError('');
    try {
      const res  = await fetch(`/api/gbv/cases/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          incidentType,
          incidentDate:        incidentDate ? new Date(incidentDate).toISOString() : undefined,
          location:            location.trim(),
          county:              county.trim()    || null,
          subCounty:           subCounty.trim() || null,
          description:         description.trim(),
          victimAge:           victimAge ? parseInt(victimAge) : null,
          victimGender,
          victimCodeName:      victimCodeName.trim()      || null,
          victimInjured,
          victimInjuryDesc:    victimInjuryDesc.trim()    || null,
          perpetratorKnown,
          perpetratorRelation: perpetratorRelation.trim() || null,
          perpetratorArrested,
          assignedToId:        assignedToId                || null,
        }),
      });
      const data = await res.json();
      if (data.success) router.push(`/dashboard/gbv/${id}`);
      else setError(data.error ?? 'Failed to save changes');
    } catch { setError('Network error – please try again'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-600" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/dashboard/gbv" className="hover:text-gray-700 dark:hover:text-gray-300">GBV</Link>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <Link href="/dashboard/gbv/cases" className="hover:text-gray-700 dark:hover:text-gray-300">Cases</Link>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <Link href={`/dashboard/gbv/${id}`} className="hover:text-gray-700 dark:hover:text-gray-300">Case</Link>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <span className="text-gray-900 dark:text-white font-medium">Edit</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-rose-600" />
          Edit GBV Case
        </h1>
        <Link href={`/dashboard/gbv/${id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Link>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Section 1: Status & Core Details ── */}
        <Sec title="Status & Incident Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Case Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as GBVCaseStatus)} className={inp}>
                <option value="REPORTED">Reported</option>
                <option value="UNDER_INVESTIGATION">Under Investigation</option>
                <option value="REFERRED">Referred</option>
                <option value="COURT_PROCEEDINGS">Court Proceedings</option>
                <option value="CLOSED">Closed</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Incident Type</label>
              <select value={incidentType} onChange={e => setIncidentType(e.target.value as GBVIncidentType)} className={inp}>
                <option value="PHYSICAL_VIOLENCE">Physical Violence</option>
                <option value="SEXUAL_VIOLENCE">Sexual Violence</option>
                <option value="EMOTIONAL_ABUSE">Emotional Abuse</option>
                <option value="ECONOMIC_ABUSE">Economic Abuse</option>
                <option value="STALKING">Stalking</option>
                <option value="HARASSMENT">Harassment</option>
                <option value="FGM">FGM</option>
                <option value="CHILD_MARRIAGE">Child Marriage</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Date & Time of Incident</label>
              <input type="datetime-local" value={incidentDate}
                onChange={e => setIncidentDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>County</label>
              <input type="text" value={county} onChange={e => setCounty(e.target.value)}
                placeholder="e.g. Nairobi" className={inp} />
            </div>
            <div>
              <label className={lbl}>Sub-county</label>
              <input type="text" value={subCounty} onChange={e => setSubCounty(e.target.value)}
                placeholder="e.g. Westlands" className={inp} />
            </div>
            <div>
              <label className={lbl}>Location *</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Street or area name" className={inp} required />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Description *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={5} required placeholder="Full incident description..."
                className={`${inp} resize-none`} />
            </div>
          </div>
        </Sec>

        {/* ── Section 2: Victim ── */}
        <Sec title="Victim Information (Anonymised)">
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              🔒 Do not enter the victim's real name. Use a code name only.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Code Name</label>
              <input type="text" value={victimCodeName} onChange={e => setVictimCodeName(e.target.value)}
                placeholder="e.g. V-2024-001" className={inp} />
            </div>
            <div>
              <label className={lbl}>Approximate Age</label>
              <input type="number" min="0" max="120" value={victimAge}
                onChange={e => setVictimAge(e.target.value)} placeholder="Age in years" className={inp} />
            </div>
            <div>
              <label className={lbl}>Gender</label>
              <select value={victimGender} onChange={e => setVictimGender(e.target.value as GBVVictimGender)} className={inp}>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer Not to Say</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" id="injured" checked={victimInjured}
                onChange={e => setVictimInjured(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
              <label htmlFor="injured" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Victim sustained injuries
              </label>
            </div>
            {victimInjured && (
              <div className="sm:col-span-2">
                <label className={lbl}>Injury Description</label>
                <input type="text" value={victimInjuryDesc}
                  onChange={e => setVictimInjuryDesc(e.target.value)}
                  placeholder="Describe the injuries" className={inp} />
              </div>
            )}
          </div>
        </Sec>

        {/* ── Section 3: Perpetrator & Assignment ── */}
        <Sec title="Perpetrator & Case Assignment">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="pkn" checked={perpetratorKnown}
                onChange={e => setPerpetratorKnown(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
              <label htmlFor="pkn" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Perpetrator is known to victim
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="arr" checked={perpetratorArrested}
                onChange={e => setPerpetratorArrested(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
              <label htmlFor="arr" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Perpetrator has been arrested
              </label>
            </div>
            {perpetratorKnown && (
              <div className="sm:col-span-2">
                <label className={lbl}>Relationship to Victim</label>
                <select value={perpetratorRelation}
                  onChange={e => setPerpetratorRelation(e.target.value)} className={inp}>
                  <option value="">— Select relationship —</option>
                  <option value="Spouse/Partner">Spouse / Partner</option>
                  <option value="Ex-partner">Ex-partner</option>
                  <option value="Parent">Parent</option>
                  <option value="Relative">Other Relative</option>
                  <option value="Employer">Employer</option>
                  <option value="Neighbour">Neighbour</option>
                  <option value="Acquaintance">Acquaintance</option>
                  <option value="Stranger">Stranger</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className={lbl}>Assigned Officer</label>
              <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className={inp}>
                <option value="">— Unassigned —</option>
                {officers.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.badgeNumber})</option>
                ))}
              </select>
            </div>
          </div>
        </Sec>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Link href={`/dashboard/gbv/${id}`}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50 transition-colors font-medium text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving changes...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">{title}</h2>
      {children}
    </div>
  );
}