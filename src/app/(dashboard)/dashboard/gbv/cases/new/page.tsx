// src/app/dashboard/gbv/cases/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, AlertCircle, ChevronRight,
  Loader2, Shield, Lock, Heart, User, Users
} from 'lucide-react';

interface Officer { id: string; name: string; badgeNumber: string; role: string }

const inp = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

function Sec({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-5">
        {icon && <span className="text-gray-400">{icon}</span>}
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function NewGBVCasePage() {
  const router = useRouter();
  const [officers,    setOfficers]    = useState<Officer[]>([]);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  // ── core fields ──
  const [incidentType,  setIncidentType]  = useState('PHYSICAL_VIOLENCE');
  const [incidentDate,  setIncidentDate]  = useState(new Date().toISOString().slice(0, 10));
  const [location,      setLocation]      = useState('');
  const [description,   setDescription]   = useState('');
  const [isAnonymous,   setIsAnonymous]   = useState(false);
  const [assignedToId,  setAssignedToId]  = useState('');

  // ── survivor ──
  const [survivorName,       setSurvivorName]       = useState('');
  const [survivorAge,        setSurvivorAge]        = useState('');
  const [survivorGender,     setSurvivorGender]     = useState('FEMALE');
  const [survivorIdNumber,   setSurvivorIdNumber]   = useState('');
  const [survivorPhone,      setSurvivorPhone]      = useState('');
  const [survivorAddress,    setSurvivorAddress]    = useState('');
  const [survivorOccupation, setSurvivorOccupation] = useState('');
  const [hasChildren,        setHasChildren]        = useState(false);
  const [numberOfChildren,   setNumberOfChildren]   = useState('');

  // ── perpetrator ──
  const [perpetratorName,      setPerpetratorName]      = useState('');
  const [perpetratorAge,       setPerpetratorAge]       = useState('');
  const [perpetratorGender,    setPerpetratorGender]    = useState('');
  const [perpetratorIdNumber,  setPerpetratorIdNumber]  = useState('');
  const [perpetratorPhone,     setPerpetratorPhone]     = useState('');
  const [perpetratorAddress,   setPerpetratorAddress]   = useState('');
  const [relationship,         setRelationship]         = useState('SPOUSE');
  const [isPerpetratorArrested,setIsPerpetratorArrested]= useState(false);
  const [arrestDate,           setArrestDate]           = useState('');

  // ── medical ──
  const [requiresMedical, setRequiresMedical] = useState(false);
  const [medicalFacility, setMedicalFacility] = useState('');
  const [medicalNotes,    setMedicalNotes]    = useState('');

  // ── legal ──
  const [hasProtectionOrder,    setHasProtectionOrder]    = useState(false);
  const [protectionOrderNumber, setProtectionOrderNumber] = useState('');

  useEffect(() => {
    fetch('/api/users?limit=1000&isActive=true')
      .then(r => r.json())
      .then(d => { if (d.success) setOfficers(d.data ?? []); })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || !description.trim()) {
      setError('Location and description are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/gbv/cases', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentType, incidentDate, location: location.trim(),
          description: description.trim(), isAnonymous,
          assignedToId: assignedToId || null,
          // survivor
          survivorName:       isAnonymous ? null : (survivorName.trim() || null),
          survivorAge:        survivorAge || null,
          survivorGender,
          survivorIdNumber:   survivorIdNumber.trim()   || null,
          survivorPhone:      survivorPhone.trim()      || null,
          survivorAddress:    survivorAddress.trim()    || null,
          survivorOccupation: survivorOccupation.trim() || null,
          hasChildren,
          numberOfChildren:   hasChildren ? (numberOfChildren || null) : null,
          // perpetrator
          perpetratorName:    perpetratorName.trim()    || null,
          perpetratorAge:     perpetratorAge            || null,
          perpetratorGender:  perpetratorGender         || null,
          perpetratorIdNumber:perpetratorIdNumber.trim()|| null,
          perpetratorPhone:   perpetratorPhone.trim()   || null,
          perpetratorAddress: perpetratorAddress.trim() || null,
          relationship,
          isPerpetratorArrested,
          arrestDate: isPerpetratorArrested ? (arrestDate || null) : null,
          // medical
          requiresMedicalAttention: requiresMedical,
          medicalFacility: requiresMedical ? (medicalFacility.trim() || null) : null,
          medicalNotes:    requiresMedical ? (medicalNotes.trim()    || null) : null,
          // legal
          hasProtectionOrder,
          protectionOrderNumber: hasProtectionOrder ? (protectionOrderNumber.trim() || null) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // ✅ FIXED: was /dashboard/gbv/cases/${data.data.id}
        router.push(`/dashboard/gbv/${data.data.id}`);
      } else {
        setError(data.error || 'Failed to create case');
      }
    } catch {
      setError('Network error – please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300">Dashboard</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/dashboard/gbv" className="hover:text-gray-700 dark:hover:text-gray-300">GBV</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/dashboard/gbv/cases" className="hover:text-gray-700 dark:hover:text-gray-300">Cases</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 dark:text-white">New Case</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-rose-600" />
            Report GBV Case
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">All information is strictly confidential</p>
        </div>
        <Link href="/dashboard/gbv/cases"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Link>
      </div>

      {/* Sensitivity notice */}
      <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
        <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <p className="text-sm text-rose-700 dark:text-rose-300">
          This form captures sensitive personal information about GBV survivors.
          Ensure the survivor has given informed consent where applicable and maintain strict confidentiality at all times.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" /> {error}
          </div>
        )}

        {/* ── Incident Details ── */}
        <Sec title="Incident Details" icon={<AlertCircle className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Incident Type *</label>
              <select value={incidentType} onChange={e => setIncidentType(e.target.value)} className={inp}>
                <option value="PHYSICAL_VIOLENCE">Physical Violence</option>
                <option value="SEXUAL_VIOLENCE">Sexual Violence</option>
                <option value="EMOTIONAL_ABUSE">Emotional Abuse</option>
                <option value="ECONOMIC_ABUSE">Economic Abuse</option>
                <option value="HARMFUL_TRADITIONAL_PRACTICES">Harmful Traditional Practices</option>
                <option value="HUMAN_TRAFFICKING">Human Trafficking</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className={lbl}>Date of Incident *</label>
              <input type="date" value={incidentDate}
                onChange={e => setIncidentDate(e.target.value)} className={inp} required />
            </div>

            <div className="sm:col-span-2">
              <label className={lbl}>Location of Incident *</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Street, area, or landmark" className={inp} required />
            </div>

            <div className="sm:col-span-2">
              <label className={lbl}>Description *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={4} placeholder="Describe what happened..." className={inp} required />
            </div>

            <div className="sm:col-span-2">
              <label className={lbl}>Assign to Officer</label>
              <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className={inp}>
                <option value="">— Unassigned —</option>
                {officers.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.badgeNumber})</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <input type="checkbox" id="anonymous" checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)} className="rounded" />
              <div>
                <label htmlFor="anonymous" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Anonymous Report
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Check if the survivor does not wish to be identified. Survivor name will not be recorded.
                </p>
              </div>
            </div>
          </div>
        </Sec>

        {/* ── Survivor Information ── */}
        <Sec title="Survivor Information" icon={<User className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isAnonymous && (
              <div className="sm:col-span-2">
                <label className={lbl}>Full Name</label>
                <input type="text" value={survivorName} onChange={e => setSurvivorName(e.target.value)}
                  placeholder="Survivor's full name" className={inp} />
              </div>
            )}

            <div>
              <label className={lbl}>Gender *</label>
              <select value={survivorGender} onChange={e => setSurvivorGender(e.target.value)} className={inp}>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer Not to Say</option>
              </select>
            </div>

            <div>
              <label className={lbl}>Age</label>
              <input type="number" min="0" max="120" value={survivorAge}
                onChange={e => setSurvivorAge(e.target.value)}
                placeholder="Age in years" className={inp} />
            </div>

            {!isAnonymous && (
              <>
                <div>
                  <label className={lbl}>ID / Passport Number</label>
                  <input type="text" value={survivorIdNumber}
                    onChange={e => setSurvivorIdNumber(e.target.value)}
                    placeholder="National ID or passport" className={inp} />
                </div>

                <div>
                  <label className={lbl}>Phone Number</label>
                  <input type="tel" value={survivorPhone}
                    onChange={e => setSurvivorPhone(e.target.value)}
                    placeholder="+254 7XX XXX XXX" className={inp} />
                </div>

                <div>
                  <label className={lbl}>Occupation</label>
                  <input type="text" value={survivorOccupation}
                    onChange={e => setSurvivorOccupation(e.target.value)}
                    placeholder="e.g. Teacher, Farmer" className={inp} />
                </div>

                <div className="sm:col-span-2">
                  <label className={lbl}>Address</label>
                  <input type="text" value={survivorAddress}
                    onChange={e => setSurvivorAddress(e.target.value)}
                    placeholder="Current residential address" className={inp} />
                </div>
              </>
            )}

            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="hasChildren" checked={hasChildren}
                  onChange={e => setHasChildren(e.target.checked)} className="rounded" />
                <label htmlFor="hasChildren" className="text-sm text-gray-700 dark:text-gray-300">
                  Survivor has children
                </label>
              </div>
              {hasChildren && (
                <div className="ml-6">
                  <label className={lbl}>Number of Children</label>
                  <input type="number" min="0" value={numberOfChildren}
                    onChange={e => setNumberOfChildren(e.target.value)}
                    placeholder="0" className={`${inp} w-32`} />
                </div>
              )}
            </div>
          </div>
        </Sec>

        {/* ── Perpetrator Information ── */}
        <Sec title="Perpetrator / Suspect Information" icon={<Users className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Relationship to Survivor *</label>
              <select value={relationship} onChange={e => setRelationship(e.target.value)} className={inp}>
                <option value="SPOUSE">Spouse</option>
                <option value="PARTNER">Partner / Boyfriend / Girlfriend</option>
                <option value="PARENT">Parent</option>
                <option value="SIBLING">Sibling</option>
                <option value="RELATIVE">Other Relative</option>
                <option value="ACQUAINTANCE">Acquaintance</option>
                <option value="STRANGER">Stranger</option>
                <option value="EMPLOYER">Employer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className={lbl}>Gender</label>
              <select value={perpetratorGender} onChange={e => setPerpetratorGender(e.target.value)} className={inp}>
                <option value="">— Unknown —</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={lbl}>Full Name (if known)</label>
              <input type="text" value={perpetratorName}
                onChange={e => setPerpetratorName(e.target.value)}
                placeholder="Suspect's name if known" className={inp} />
            </div>

            <div>
              <label className={lbl}>Age (if known)</label>
              <input type="number" min="0" value={perpetratorAge}
                onChange={e => setPerpetratorAge(e.target.value)}
                placeholder="Approximate age" className={inp} />
            </div>

            <div>
              <label className={lbl}>ID / Passport</label>
              <input type="text" value={perpetratorIdNumber}
                onChange={e => setPerpetratorIdNumber(e.target.value)}
                placeholder="If known" className={inp} />
            </div>

            <div>
              <label className={lbl}>Phone Number</label>
              <input type="tel" value={perpetratorPhone}
                onChange={e => setPerpetratorPhone(e.target.value)}
                placeholder="If known" className={inp} />
            </div>

            <div>
              <label className={lbl}>Address</label>
              <input type="text" value={perpetratorAddress}
                onChange={e => setPerpetratorAddress(e.target.value)}
                placeholder="If known" className={inp} />
            </div>

            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="arrested" checked={isPerpetratorArrested}
                  onChange={e => setIsPerpetratorArrested(e.target.checked)} className="rounded" />
                <label htmlFor="arrested" className="text-sm text-gray-700 dark:text-gray-300">
                  Perpetrator has been arrested
                </label>
              </div>
              {isPerpetratorArrested && (
                <div className="ml-6">
                  <label className={lbl}>Arrest Date</label>
                  <input type="date" value={arrestDate}
                    onChange={e => setArrestDate(e.target.value)} className={`${inp} w-48`} />
                </div>
              )}
            </div>
          </div>
        </Sec>

        {/* ── Medical ── */}
        <Sec title="Medical Information" icon={<Heart className="w-4 h-4" />}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="medical" checked={requiresMedical}
                onChange={e => setRequiresMedical(e.target.checked)} className="rounded" />
              <label htmlFor="medical" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Survivor requires medical attention
              </label>
            </div>

            {requiresMedical && (
              <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Medical Facility</label>
                  <input type="text" value={medicalFacility}
                    onChange={e => setMedicalFacility(e.target.value)}
                    placeholder="Hospital or clinic name" className={inp} />
                </div>
                <div className="sm:col-span-2">
                  <label className={lbl}>Medical Notes</label>
                  <textarea value={medicalNotes} onChange={e => setMedicalNotes(e.target.value)}
                    rows={2} placeholder="Describe injuries or medical needs..."
                    className={inp} />
                </div>
              </div>
            )}
          </div>
        </Sec>

        {/* ── Legal ── */}
        <Sec title="Legal Protection" icon={<Shield className="w-4 h-4" />}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="protection" checked={hasProtectionOrder}
                onChange={e => setHasProtectionOrder(e.target.checked)} className="rounded" />
              <label htmlFor="protection" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Protection order has been issued
              </label>
            </div>

            {hasProtectionOrder && (
              <div className="ml-6">
                <label className={lbl}>Protection Order Number</label>
                <input type="text" value={protectionOrderNumber}
                  onChange={e => setProtectionOrderNumber(e.target.value)}
                  placeholder="Court order reference number" className={`${inp} w-full sm:w-80`} />
              </div>
            )}
          </div>
        </Sec>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/gbv/cases"
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Submit Case Report'}
          </button>
        </div>
      </form>
    </div>
  );
}