//dashboard/traffic/new/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, AlertCircle, ChevronRight,
  Loader2, TrafficCone, AlertTriangle, Truck,
  Plus, X, User, Car, CloudRain, Eye
} from 'lucide-react';
import type {
  IncidentType, AccidentSeverity, ImpoundReason, VehicleType,
} from '@/types/traffic';

interface Officer { id: string; name: string; badgeNumber: string; role: string }

// ── helpers ─────────────────────────────────────────────────────────────────

const emptyVehicle = () => ({
  _key:             Math.random().toString(36).slice(2),   // local only, stripped before POST
  registration:     '',
  make:             '',
  model:            '',
  color:            '',
  type:             'CAR' as VehicleType,
  damageDescription:'',
  ownerName:        '',
  ownerContact:     '',
  insuranceCompany: '',
  insurancePolicy:  '',
});

const emptyPerson = () => ({
  _key:           Math.random().toString(36).slice(2),
  name:           '',
  role:           'DRIVER' as const,
  idNumber:       '',
  phoneNumber:    '',
  driverLicense:  '',
  injuries:       '',
  medicalAttention: false,
});

const emptyWitness = () => ({
  _key:      Math.random().toString(36).slice(2),
  name:      '',
  phoneNumber:'',
  idNumber:  '',
  address:   '',
  statement: '',
});

// ── component ────────────────────────────────────────────────────────────────

export default function NewTrafficIncidentPage() {
  const router = useRouter();

  const [incidentType, setIncidentType] = useState<IncidentType>('TRAFFIC');
  const [officers,     setOfficers]     = useState<Officer[]>([]);
  const [dataLoading,  setDataLoading]  = useState(false); // FIX #12: separate loading states
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  // ── base fields ──
  const [location,    setLocation]    = useState('');
  const [description, setDescription] = useState('');
  const [reportedAt,  setReportedAt]  = useState(new Date().toISOString().slice(0, 16));
  const [assignedToId,setAssignedToId]= useState('');
  const [reportedBy,  setReportedBy]  = useState('');

  // ── involved parties ──
  // FIX #8 + #9: local arrays use _key (not id) so nothing leaks into Prisma create
  const [vehicles, setVehicles] = useState<ReturnType<typeof emptyVehicle>[]>([]);
  const [people,   setPeople]   = useState<ReturnType<typeof emptyPerson>[]>([]);
  const [witnesses,setWitnesses]= useState<ReturnType<typeof emptyWitness>[]>([]);

  // ── ACCIDENT-specific ── (FIX #10 / #11)
  const [severity,          setSeverity]          = useState<AccidentSeverity>('MINOR');
  const [weatherConditions, setWeatherConditions] = useState('');
  const [roadConditions,    setRoadConditions]    = useState('');
  const [visibility,        setVisibility]        = useState('');

  // ── IMPOUND-specific ── (FIX #10 / #11)
  const [impoundReason,   setImpoundReason]   = useState<ImpoundReason>('PARKING_VIOLATION');
  const [impoundLocation, setImpoundLocation] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [impoundFee,      setImpoundFee]      = useState('');

  // ── load officers ── (FIX #13: vehicles dropdown unused, removed)
  useEffect(() => {
    const load = async () => {
      setDataLoading(true);
      try {
        const res  = await fetch('/api/users?limit=1000&isActive=true');
        const data = await res.json();
        if (data.success) setOfficers(data.data ?? []);
      } catch (e) {
        console.error('Failed to load officers', e);
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, []);

  // ── submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || !description.trim()) {
      setError('Location and description are required');
      return;
    }
    if (incidentType === 'IMPOUND' && !impoundLocation.trim()) {
      setError('Impound location is required for impound incidents');
      return;
    }

    setSaving(true);
    setError('');

    // FIX #8: strip the local _key field before sending to the API
    const cleanVehicles = vehicles.map(({ _key, ...v }) => v);
    const cleanPeople   = people.map(({ _key, ...p }) => p);
    const cleanWitnesses= witnesses.map(({ _key, ...w }) => w);

    // FIX #23: convert empty string → null so FK constraint isn't violated
    const payload: Record<string, unknown> = {
      type:             incidentType,
      location:         location.trim(),
      description:      description.trim(),
      reportedAt:       new Date(reportedAt).toISOString(),
      reportedBy:       reportedBy.trim() || null,
      assignedToId:     assignedToId || null,   // FIX #23
      involvedVehicles: cleanVehicles,
      involvedPeople:   cleanPeople,
      witnesses:        cleanWitnesses,
    };

    if (incidentType === 'ACCIDENT') {
      payload.severity          = severity;
      payload.weatherConditions = weatherConditions || null;
      payload.roadConditions    = roadConditions    || null;
      payload.visibility        = visibility        || null;
    }

    if (incidentType === 'IMPOUND') {
      payload.impoundReason   = impoundReason;
      payload.impoundLocation = impoundLocation.trim();
      payload.storageLocation = storageLocation.trim() || null;
      payload.impoundFee      = impoundFee ? parseFloat(impoundFee) : null;
      payload.impoundedAt     = new Date().toISOString();
      payload.paymentStatus   = 'UNPAID';
    }

    try {
      const res  = await fetch('/api/traffic', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        router.push(`/dashboard/traffic/${data.data.id}`);
      } else {
        setError(data.error || 'Failed to create incident');
      }
    } catch {
      setError('Network error – please try again');
    } finally {
      setSaving(false);
    }
  };

  // ── shared field updater helpers ─────────────────────────────────────────
  const updateVehicle  = (i: number, k: string, v: unknown) =>
    setVehicles(vs => vs.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const updatePerson   = (i: number, k: string, v: unknown) =>
    setPeople(ps => ps.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const updateWitness  = (i: number, k: string, v: unknown) =>
    setWitnesses(ws => ws.map((x, idx) => idx === i ? { ...x, [k]: v } : x));

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard"         className="hover:text-gray-700 dark:hover:text-gray-300">Dashboard</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/dashboard/traffic" className="hover:text-gray-700 dark:hover:text-gray-300">Traffic</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 dark:text-white">New Incident</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Traffic Incident</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Record a traffic incident, accident, or vehicle impound</p>
        </div>
        <Link href="/dashboard/traffic"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Link>
      </div>

      {/* ── Incident Type Selector ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">
          Incident Type
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { t: 'TRAFFIC',  Icon: TrafficCone,  label: 'Traffic Stop',  sub: 'Citations, warnings, violations', color: 'blue'   },
            { t: 'ACCIDENT', Icon: AlertTriangle, label: 'Accident',      sub: 'Collisions, injuries, damage',    color: 'red'    },
            { t: 'IMPOUND',  Icon: Truck,         label: 'Impound',       sub: 'Vehicle seizure, storage',        color: 'orange' },
          ] as const).map(({ t, Icon, label, sub, color }) => (
            <button
              key={t} type="button" onClick={() => setIncidentType(t)}
              className={`p-4 rounded-xl border-2 text-left transition-all
                ${incidentType === t
                  ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20`
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
            >
              <Icon className={`w-8 h-8 mb-2 ${incidentType === t ? `text-${color}-600` : 'text-gray-400'}`} />
              <p className={`font-semibold ${incidentType === t ? `text-${color}-600` : 'text-gray-700 dark:text-gray-300'}`}>
                {label}
              </p>
              <p className="text-xs text-gray-500 mt-1">{sub}</p>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" /> {error}
          </div>
        )}

        {/* ── Basic Information ── */}
        <Section title="Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Location *" span={2}>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Street address, intersection, or landmark"
                className={input} required />
            </Field>

            <Field label="Description *" span={2}>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={3} placeholder="Detailed description of the incident…"
                className={input} required />
            </Field>

            <Field label="Date & Time">
              <input type="datetime-local" value={reportedAt}
                onChange={e => setReportedAt(e.target.value)} className={input} />
            </Field>

            <Field label="Reported By">
              <input type="text" value={reportedBy} onChange={e => setReportedBy(e.target.value)}
                placeholder="Name of reporting officer / public" className={input} />
            </Field>

            <Field label="Assign to Officer" span={2}>
              <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className={input}>
                <option value="">— Unassigned —</option>
                {officers.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.badgeNumber})</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* ── ACCIDENT-specific fields (FIX #10 / #11) ── */}
        {incidentType === 'ACCIDENT' && (
          <Section title="Accident Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Severity *">
                <select value={severity} onChange={e => setSeverity(e.target.value as AccidentSeverity)} className={input}>
                  <option value="MINOR">Minor</option>
                  <option value="SERIOUS">Serious</option>
                  <option value="FATAL">Fatal</option>
                  <option value="PROPERTY_DAMAGE">Property Damage Only</option>
                </select>
              </Field>

              <Field label="Weather Conditions">
                <select value={weatherConditions} onChange={e => setWeatherConditions(e.target.value)} className={input}>
                  <option value="">— Select —</option>
                  <option value="CLEAR">Clear</option>
                  <option value="RAIN">Rain</option>
                  <option value="FOG">Fog</option>
                  <option value="DUST">Dust / Haze</option>
                  <option value="NIGHT">Night / Low Light</option>
                </select>
              </Field>

              <Field label="Road Conditions">
                <select value={roadConditions} onChange={e => setRoadConditions(e.target.value)} className={input}>
                  <option value="">— Select —</option>
                  <option value="DRY">Dry</option>
                  <option value="WET">Wet</option>
                  <option value="MUDDY">Muddy</option>
                  <option value="POTHOLES">Potholes</option>
                  <option value="UNDER_CONSTRUCTION">Under Construction</option>
                </select>
              </Field>

              <Field label="Visibility">
                <select value={visibility} onChange={e => setVisibility(e.target.value)} className={input}>
                  <option value="">— Select —</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                </select>
              </Field>
            </div>
          </Section>
        )}

        {/* ── IMPOUND-specific fields (FIX #10 / #11) ── */}
        {incidentType === 'IMPOUND' && (
          <Section title="Impound Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Impound Reason *">
                <select value={impoundReason} onChange={e => setImpoundReason(e.target.value as ImpoundReason)} className={input}>
                  <option value="PARKING_VIOLATION">Parking Violation</option>
                  <option value="EXPIRED_LICENSE">Expired License</option>
                  <option value="NO_INSURANCE">No Insurance</option>
                  <option value="STOLEN_VEHICLE">Stolen Vehicle</option>
                  <option value="DANGEROUS_DRIVING">Dangerous Driving</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>

              <Field label="Impound Fee (KES)">
                <input type="number" min="0" step="0.01" value={impoundFee}
                  onChange={e => setImpoundFee(e.target.value)}
                  placeholder="0.00" className={input} />
              </Field>

              <Field label="Impound Location *">
                <input type="text" value={impoundLocation}
                  onChange={e => setImpoundLocation(e.target.value)}
                  placeholder="Location where vehicle was impounded" className={input} required />
              </Field>

              <Field label="Storage Location">
                <input type="text" value={storageLocation}
                  onChange={e => setStorageLocation(e.target.value)}
                  placeholder="Yard / compound name" className={input} />
              </Field>
            </div>
          </Section>
        )}

        {/* ── Involved Vehicles ── */}
        <Section
          title="Involved Vehicles"
          action={
            <button type="button" onClick={() => setVehicles(v => [...v, emptyVehicle()])}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20
                text-blue-600 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
              <Plus className="w-4 h-4" /> Add Vehicle
            </button>
          }
        >
          {vehicles.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              No vehicles added. Click "Add Vehicle" to include involved vehicles.
            </p>
          ) : (
            <div className="space-y-4">
              {vehicles.map((v, i) => (
                <div key={v._key} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg relative">
                  <button type="button" onClick={() => setVehicles(vs => vs.filter((_, idx) => idx !== i))}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Registration *</label>
                      <input type="text" value={v.registration}
                        onChange={e => updateVehicle(i, 'registration', e.target.value)}
                        placeholder="KAA 123A" className={smInput} />
                    </div>
                    <div>
                      <label className={lbl}>Type</label>
                      <select value={v.type} onChange={e => updateVehicle(i, 'type', e.target.value)} className={smInput}>
                        <option value="CAR">Car</option>
                        <option value="MOTORCYCLE">Motorcycle</option>
                        <option value="SUV">SUV</option>
                        <option value="TRUCK">Truck</option>
                        <option value="BUS">Bus</option>
                        <option value="VAN">Van</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Make</label>
                      <input type="text" value={v.make}
                        onChange={e => updateVehicle(i, 'make', e.target.value)}
                        placeholder="Toyota" className={smInput} />
                    </div>
                    <div>
                      <label className={lbl}>Model</label>
                      <input type="text" value={v.model}
                        onChange={e => updateVehicle(i, 'model', e.target.value)}
                        placeholder="Land Cruiser" className={smInput} />
                    </div>
                    <div>
                      <label className={lbl}>Color</label>
                      <input type="text" value={v.color}
                        onChange={e => updateVehicle(i, 'color', e.target.value)}
                        placeholder="White" className={smInput} />
                    </div>
                    <div>
                      <label className={lbl}>Owner Name</label>
                      <input type="text" value={v.ownerName}
                        onChange={e => updateVehicle(i, 'ownerName', e.target.value)}
                        placeholder="John Doe" className={smInput} />
                    </div>
                    <div>
                      <label className={lbl}>Owner Contact</label>
                      <input type="text" value={v.ownerContact}
                        onChange={e => updateVehicle(i, 'ownerContact', e.target.value)}
                        placeholder="+254 7XX XXX XXX" className={smInput} />
                    </div>
                    <div>
                      <label className={lbl}>Insurance Company</label>
                      <input type="text" value={v.insuranceCompany}
                        onChange={e => updateVehicle(i, 'insuranceCompany', e.target.value)}
                        placeholder="Jubilee Insurance" className={smInput} />
                    </div>
                    <div className="col-span-2">
                      <label className={lbl}>Damage Description</label>
                      <input type="text" value={v.damageDescription}
                        onChange={e => updateVehicle(i, 'damageDescription', e.target.value)}
                        placeholder="Front bumper damage, broken windscreen…" className={smInput} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Involved People ── */}
        <Section
          title="Involved People"
          action={
            <button type="button" onClick={() => setPeople(p => [...p, emptyPerson()])}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20
                text-blue-600 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
              <Plus className="w-4 h-4" /> Add Person
            </button>
          }
        >
          {people.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              No people added. Click "Add Person" to include drivers, passengers, or pedestrians.
            </p>
          ) : (
            <div className="space-y-4">
              {people.map((p, i) => (
                <div key={p._key} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg relative">
                  <button type="button" onClick={() => setPeople(ps => ps.filter((_, idx) => idx !== i))}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={lbl}>Full Name *</label>
                      <input type="text" value={p.name}
                        onChange={e => updatePerson(i, 'name', e.target.value)}
                        placeholder="John Doe" className={smInput} />
                    </div>
                    <div>
                      <label className={lbl}>Role</label>
                      <select value={p.role} onChange={e => updatePerson(i, 'role', e.target.value)} className={smInput}>
                        <option value="DRIVER">Driver</option>
                        <option value="PASSENGER">Passenger</option>
                        <option value="PEDESTRIAN">Pedestrian</option>
                        <option value="OWNER">Vehicle Owner</option>
                        <option value="WITNESS">Witness</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>ID Number</label>
                      <input type="text" value={p.idNumber}
                        onChange={e => updatePerson(i, 'idNumber', e.target.value)}
                        placeholder="12345678" className={smInput} />
                    </div>
                    <div>
                      <label className={lbl}>Phone Number</label>
                      <input type="text" value={p.phoneNumber}
                        onChange={e => updatePerson(i, 'phoneNumber', e.target.value)}
                        placeholder="+254 7XX XXX XXX" className={smInput} />
                    </div>
                    <div>
                      <label className={lbl}>Driver License</label>
                      <input type="text" value={p.driverLicense}
                        onChange={e => updatePerson(i, 'driverLicense', e.target.value)}
                        placeholder="DL-12345" className={smInput} />
                    </div>
                    <div className="col-span-2">
                      <label className={lbl}>Injuries</label>
                      <input type="text" value={p.injuries}
                        onChange={e => updatePerson(i, 'injuries', e.target.value)}
                        placeholder="Describe any injuries" className={smInput} />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <input type="checkbox" id={`med-${p._key}`} checked={!!p.medicalAttention}
                        onChange={e => updatePerson(i, 'medicalAttention', e.target.checked)}
                        className="rounded" />
                      <label htmlFor={`med-${p._key}`} className="text-sm text-gray-600 dark:text-gray-400">
                        Required medical attention
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Witnesses (shown for ACCIDENT) ── */}
        {incidentType === 'ACCIDENT' && (
          <Section
            title="Witnesses"
            action={
              <button type="button" onClick={() => setWitnesses(w => [...w, emptyWitness()])}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20
                  text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors">
                <Plus className="w-4 h-4" /> Add Witness
              </button>
            }
          >
            {witnesses.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                No witnesses added.
              </p>
            ) : (
              <div className="space-y-4">
                {witnesses.map((w, i) => (
                  <div key={w._key} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg relative">
                    <button type="button" onClick={() => setWitnesses(ws => ws.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>Full Name *</label>
                        <input type="text" value={w.name}
                          onChange={e => updateWitness(i, 'name', e.target.value)}
                          placeholder="Jane Doe" className={smInput} />
                      </div>
                      <div>
                        <label className={lbl}>Phone Number</label>
                        <input type="text" value={w.phoneNumber}
                          onChange={e => updateWitness(i, 'phoneNumber', e.target.value)}
                          placeholder="+254 7XX XXX XXX" className={smInput} />
                      </div>
                      <div>
                        <label className={lbl}>ID Number</label>
                        <input type="text" value={w.idNumber}
                          onChange={e => updateWitness(i, 'idNumber', e.target.value)}
                          placeholder="12345678" className={smInput} />
                      </div>
                      <div>
                        <label className={lbl}>Address</label>
                        <input type="text" value={w.address}
                          onChange={e => updateWitness(i, 'address', e.target.value)}
                          placeholder="Nairobi" className={smInput} />
                      </div>
                      <div className="col-span-2">
                        <label className={lbl}>Statement</label>
                        <textarea value={w.statement} rows={2}
                          onChange={e => updateWitness(i, 'statement', e.target.value)}
                          placeholder="Witness account of the incident…"
                          className={smInput} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── Submit ── */}
        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/traffic"
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
              rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={saving || dataLoading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700
              text-white rounded-lg disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Creating…' : 'Create Incident'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── tiny layout helpers ───────────────────────────────────────────────────────

const input    = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none';
const smInput  = input;
const lbl      = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1';

function Section({
  title, action, children,
}: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({
  label, span, children,
}: { label: string; span?: number; children: React.ReactNode }) {
  return (
    <div className={span === 2 ? 'sm:col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );
}