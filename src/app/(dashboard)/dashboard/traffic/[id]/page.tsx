// src/app/dashboard/traffic/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Edit, AlertCircle, ChevronRight,
  Clock, MapPin, User, Car, FileText,
  Plus, CheckCircle, Loader2, Upload, Paperclip,
  Truck, AlertTriangle, TrafficCone, DollarSign,
  Eye, X, CloudRain, Wind, RefreshCw,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface IncidentDetail {
  id:             string;
  incidentNumber: string;
  type:           string;
  status:         string;
  reportedAt:     string;
  reportedBy?:    string | null;
  location:       string;
  description:    string;
  latitude?:      number | null;
  longitude?:     number | null;
  // accident
  severity?:          string | null;
  weatherConditions?: string | null;
  roadConditions?:    string | null;
  visibility?:        string | null;
  // impound
  impoundReason?:   string | null;
  impoundLocation?: string | null;
  impoundedAt?:     string | null;
  releasedAt?:      string | null;
  releasedTo?:      string | null;
  impoundFee?:      number | null;
  paymentStatus?:   string | null;
  storageLocation?: string | null;
  // relations
  assignedTo?:       { id: string; name: string; badgeNumber: string; role?: string } | null;
  station?:          { id: string; name: string; code: string; county?: string }  | null;
  createdBy?:        { id: string; name: string; badgeNumber?: string }            | null;
  citations?:        Citation[];
  involvedVehicles?: Vehicle[];
  involvedPeople?:   Person[];
  witnesses?:        Witness[];
  attachments?:      Attachment[];
  createdAt:  string;
  updatedAt:  string;
}

interface Citation {
  id: string; citationNumber: string; issuedTo: string;
  violation: string; section?: string | null; amount: number;
  issuedAt: string; dueDate: string; paymentStatus: string;
  issuedBy?: { name: string; badgeNumber: string } | null;
  notes?: string | null;
}
interface Vehicle {
  id: string; registration: string; make: string; model: string;
  color?: string | null; type?: string | null; damageDescription?: string | null;
  ownerName?: string | null; ownerContact?: string | null;
  insuranceCompany?: string | null; insurancePolicy?: string | null;
}
interface Person {
  id: string; name: string; role: string;
  idNumber?: string | null; phoneNumber?: string | null;
  injuries?: string | null; medicalAttention?: boolean | null;
  driverLicense?: string | null;
}
interface Witness {
  id: string; name: string;
  phoneNumber?: string | null; idNumber?: string | null;
  statement?: string | null; statementDate?: string | null;
}
interface Attachment {
  id: string; fileName: string; fileUrl: string;
  fileType: string; uploadedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const STATUSES = ['PENDING','INVESTIGATING','CITATION_ISSUED','RESOLVED','CLOSED'] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING:         'Pending',
  INVESTIGATING:   'Investigating',
  RESOLVED:        'Resolved',
  CLOSED:          'Closed',
  CITATION_ISSUED: 'Citation Issued',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:         'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  INVESTIGATING:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  RESOLVED:        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CLOSED:          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  CITATION_ISSUED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

const SEVERITY_COLORS: Record<string, string> = {
  MINOR:           'bg-green-100 text-green-700',
  SERIOUS:         'bg-orange-100 text-orange-700',
  FATAL:           'bg-red-100 text-red-700',
  PROPERTY_DAMAGE: 'bg-blue-100 text-blue-700',
};

const PAYMENT_COLORS: Record<string, string> = {
  PAID:    'bg-green-100 text-green-700',
  UNPAID:  'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  WAIVED:  'bg-gray-100 text-gray-600',
};

const IMPOUND_REASON_LABELS: Record<string, string> = {
  PARKING_VIOLATION: 'Parking Violation',
  EXPIRED_LICENSE:   'Expired License',
  NO_INSURANCE:      'No Insurance',
  STOLEN_VEHICLE:    'Stolen Vehicle',
  DANGEROUS_DRIVING: 'Dangerous Driving',
  OTHER:             'Other',
};

const TYPE_COLORS: Record<string, string> = {
  TRAFFIC:  'text-blue-600',
  ACCIDENT: 'text-red-600',
  IMPOUND:  'text-orange-600',
};

const TYPE_BG: Record<string, string> = {
  TRAFFIC:  'bg-blue-50 dark:bg-blue-900/20',
  ACCIDENT: 'bg-red-50 dark:bg-red-900/20',
  IMPOUND:  'bg-orange-50 dark:bg-orange-900/20',
};

function TypeIcon({ type, className }: { type: string; className?: string }) {
  const cls = className ?? 'w-6 h-6';
  if (type === 'ACCIDENT') return <AlertTriangle className={cls} />;
  if (type === 'IMPOUND')  return <Truck         className={cls} />;
  return                          <TrafficCone   className={cls} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function TrafficIncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [incident,     setIncident]     = useState<IncidentDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  // citation modal
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [citationForm, setCitationForm] = useState({
    issuedTo: '', issuedToIdNumber: '', violation: '',
    section: '', amount: '', dueDate: '', notes: '',
  });
  const [citationSaving, setCitationSaving] = useState(false);
  const [citationError,  setCitationError]  = useState('');

  // attachment
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState('');

  // ── Fetch single incident from /api/traffic/[id] ─────────────────────────
  const fetchIncident = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/traffic/${id}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || `Server error (${res.status})`);
        return;
      }

      // Guard: ensure we got an object, not an array (old route bug)
      const payload = json.data;
      if (Array.isArray(payload)) {
        console.error('[detail] /api/traffic/[id] returned an array — wrong route file is active');
        setError('Server configuration error — please contact support');
        return;
      }
      if (!payload || typeof payload !== 'object' || !payload.id) {
        setError('Received unexpected data from server');
        return;
      }

      setIncident(payload as IncidentDetail);
    } catch (e) {
      console.error('[fetchIncident]', e);
      setError('Network error – please try again');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchIncident(); }, [fetchIncident]);

  // ── Quick status update ───────────────────────────────────────────────────
  const handleStatusChange = async (newStatus: string) => {
    if (!incident || statusSaving || incident.status === newStatus) return;
    setStatusSaving(true);
    try {
      const res  = await fetch(`/api/traffic/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        // Use full updated object from server so all denormalised fields stay in sync
        setIncident(json.data as IncidentDetail);
      }
    } catch (e) {
      console.error('[statusChange]', e);
    } finally {
      setStatusSaving(false);
    }
  };

  // ── Issue citation ────────────────────────────────────────────────────────
  const handleAddCitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citationForm.issuedTo || !citationForm.violation || !citationForm.amount || !citationForm.dueDate) {
      setCitationError('Issued To, Violation, Amount, and Due Date are required');
      return;
    }
    setCitationSaving(true);
    setCitationError('');
    try {
      const res  = await fetch('/api/traffic/citations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          incidentId:       id,
          issuedTo:         citationForm.issuedTo,
          issuedToIdNumber: citationForm.issuedToIdNumber || null,
          violation:        citationForm.violation,
          section:          citationForm.section  || null,
          amount:           parseFloat(citationForm.amount),
          dueDate:          new Date(citationForm.dueDate).toISOString(),
          notes:            citationForm.notes    || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCitationModal(false);
        setCitationForm({ issuedTo:'', issuedToIdNumber:'', violation:'', section:'', amount:'', dueDate:'', notes:'' });
        fetchIncident();
      } else {
        setCitationError(json.error || 'Failed to issue citation');
      }
    } catch {
      setCitationError('Network error');
    } finally {
      setCitationSaving(false);
    }
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !incident) return;
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file',       file);
      fd.append('incidentId', incident.id);
      const res  = await fetch('/api/traffic/attachments', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success) {
        fetchIncident();
      } else {
        setUploadError(json.error || 'Upload failed');
      }
    } catch {
      setUploadError('Network error during upload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render: loading
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading incident…</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: error
  // ─────────────────────────────────────────────────────────────────────────
  if (error || !incident) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-16 h-16 text-red-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {error || 'Incident not found'}
        </h2>
        <div className="flex gap-3">
          <button onClick={fetchIncident}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <Link href="/dashboard/traffic"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Traffic
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: incident detail
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/dashboard"         className="hover:text-gray-700 dark:hover:text-gray-300">Dashboard</Link>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <Link href="/dashboard/traffic" className="hover:text-gray-700 dark:hover:text-gray-300">Traffic</Link>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <span className="text-gray-900 dark:text-white font-medium">{incident.incidentNumber}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${TYPE_BG[incident.type] ?? 'bg-gray-100 dark:bg-gray-700'} ${TYPE_COLORS[incident.type] ?? 'text-gray-600'}`}>
            <TypeIcon type={incident.type} className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {incident.incidentNumber}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-gray-500 dark:text-gray-400">{incident.type}</span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[incident.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABELS[incident.status] ?? incident.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={fetchIncident} title="Refresh"
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href={`/dashboard/traffic/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600
              text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
            <Edit className="w-4 h-4" /> Edit
          </Link>
          <button onClick={() => setShowCitationModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm">
            <Plus className="w-4 h-4" /> Add Citation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── MAIN COLUMN ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Core details */}
          <Card title="Incident Details">
            <InfoRow icon={<MapPin className="w-4 h-4" />}  label="Location"    value={incident.location} />
            <InfoRow icon={<Clock className="w-4 h-4" />}   label="Reported At" value={new Date(incident.reportedAt).toLocaleString('en-KE')} />
            {incident.reportedBy && (
              <InfoRow icon={<User className="w-4 h-4" />}  label="Reported By" value={incident.reportedBy} />
            )}
            <InfoRow icon={<FileText className="w-4 h-4" />} label="Description">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {incident.description}
              </p>
            </InfoRow>
            <InfoRow icon={<Clock className="w-4 h-4 opacity-40" />} label="Last Updated"
              value={new Date(incident.updatedAt).toLocaleString('en-KE')} />
          </Card>

          {/* Accident-specific */}
          {incident.type === 'ACCIDENT' && (
            <Card title="Accident Details">
              {incident.severity && (
                <InfoRow icon={<AlertTriangle className="w-4 h-4" />} label="Severity">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[incident.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                    {incident.severity.replace(/_/g, ' ')}
                  </span>
                </InfoRow>
              )}
              {incident.weatherConditions && (
                <InfoRow icon={<CloudRain className="w-4 h-4" />} label="Weather" value={incident.weatherConditions} />
              )}
              {incident.roadConditions && (
                <InfoRow icon={<Wind className="w-4 h-4" />} label="Road Conditions" value={incident.roadConditions} />
              )}
              {incident.visibility && (
                <InfoRow icon={<Eye className="w-4 h-4" />} label="Visibility" value={incident.visibility} />
              )}
            </Card>
          )}

          {/* Impound-specific */}
          {incident.type === 'IMPOUND' && (
            <Card title="Impound Details">
              {incident.impoundReason && (
                <InfoRow icon={<Truck className="w-4 h-4" />} label="Reason"
                  value={IMPOUND_REASON_LABELS[incident.impoundReason] ?? incident.impoundReason} />
              )}
              {incident.impoundLocation && (
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Impound Location" value={incident.impoundLocation} />
              )}
              {incident.storageLocation && (
                <InfoRow icon={<MapPin className="w-4 h-4 opacity-60" />} label="Storage / Yard" value={incident.storageLocation} />
              )}
              {incident.impoundedAt && (
                <InfoRow icon={<Clock className="w-4 h-4" />} label="Impounded At"
                  value={new Date(incident.impoundedAt).toLocaleString('en-KE')} />
              )}
              {incident.releasedAt && (
                <InfoRow icon={<CheckCircle className="w-4 h-4 text-green-500" />} label="Released At"
                  value={new Date(incident.releasedAt).toLocaleString('en-KE')} />
              )}
              {incident.releasedTo && (
                <InfoRow icon={<User className="w-4 h-4" />} label="Released To" value={incident.releasedTo} />
              )}
              {incident.impoundFee != null && (
                <InfoRow icon={<DollarSign className="w-4 h-4" />} label="Impound Fee">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      KES {incident.impoundFee.toLocaleString()}
                    </span>
                    {incident.paymentStatus && (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_COLORS[incident.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                        {incident.paymentStatus}
                      </span>
                    )}
                  </div>
                </InfoRow>
              )}
            </Card>
          )}

          {/* Involved Vehicles */}
          {(incident.involvedVehicles?.length ?? 0) > 0 && (
            <Card title={`Involved Vehicles (${incident.involvedVehicles!.length})`}>
              <div className="space-y-3">
                {incident.involvedVehicles!.map(v => (
                  <div key={v.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Car className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold font-mono text-gray-900 dark:text-white">{v.registration}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {[v.make, v.model, v.color].filter(Boolean).join(' · ')}
                          {v.type && ` · ${v.type}`}
                        </p>
                        {v.damageDescription && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">Damage: {v.damageDescription}</p>
                        )}
                        {(v.ownerName || v.ownerContact) && (
                          <p className="text-sm text-gray-500 mt-1">
                            Owner: {v.ownerName}{v.ownerContact && ` · ${v.ownerContact}`}
                          </p>
                        )}
                        {(v.insuranceCompany || v.insurancePolicy) && (
                          <p className="text-sm text-gray-500">
                            Insurance: {v.insuranceCompany}{v.insurancePolicy && ` / ${v.insurancePolicy}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Involved People */}
          {(incident.involvedPeople?.length ?? 0) > 0 && (
            <Card title={`Involved People (${incident.involvedPeople!.length})`}>
              <div className="space-y-3">
                {incident.involvedPeople!.map(p => (
                  <div key={p.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                          <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
                            {p.role}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-0.5 mt-1">
                          {p.idNumber      && <p>ID: {p.idNumber}</p>}
                          {p.phoneNumber   && <p>Phone: {p.phoneNumber}</p>}
                          {p.driverLicense && <p>License: {p.driverLicense}</p>}
                          {p.injuries      && <p className="text-red-600 dark:text-red-400">Injuries: {p.injuries}</p>}
                          {p.medicalAttention && <p className="text-orange-600 font-medium">⚠ Required medical attention</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Witnesses */}
          {(incident.witnesses?.length ?? 0) > 0 && (
            <Card title={`Witnesses (${incident.witnesses!.length})`}>
              <div className="space-y-3">
                {incident.witnesses!.map(w => (
                  <div key={w.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{w.name}</p>
                        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-0.5 mt-1">
                          {w.phoneNumber && <p>Phone: {w.phoneNumber}</p>}
                          {w.idNumber    && <p>ID: {w.idNumber}</p>}
                          {w.statement   && (
                            <blockquote className="mt-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600 italic text-gray-600 dark:text-gray-400">
                              "{w.statement}"
                            </blockquote>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Attachments */}
          <Card
            title={`Attachments (${incident.attachments?.length ?? 0})`}
            action={
              <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors
                ${uploading
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40'}`}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading…' : 'Upload'}
                <input type="file" className="hidden" disabled={uploading}
                  accept="image/jpeg,image/png,image/gif,application/pdf"
                  onChange={handleFileUpload} />
              </label>
            }
          >
            {uploadError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">{uploadError}</p>
            )}
            {(incident.attachments?.length ?? 0) === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                No attachments yet
              </p>
            ) : (
              <div className="space-y-2">
                {incident.attachments!.map(a => (
                  <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl
                      hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
                    <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                        {a.fileName}
                      </p>
                      <p className="text-xs text-gray-400">{new Date(a.uploadedAt).toLocaleDateString('en-KE')}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="space-y-6">

          {/* Status update */}
          <Card title="Update Status">
            <div className="space-y-1.5">
              {STATUSES.map(s => (
                <button key={s} onClick={() => handleStatusChange(s)}
                  disabled={statusSaving || incident.status === s}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    flex items-center justify-between gap-2
                    ${incident.status === s
                      ? (STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-700') + ' cursor-default'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50'}`}
                >
                  <span>{STATUS_LABELS[s]}</span>
                  <span className="shrink-0">
                    {incident.status === s
                      ? <CheckCircle className="w-4 h-4" />
                      : statusSaving
                        ? <Loader2 className="w-4 h-4 animate-spin opacity-30" />
                        : null}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Assigned officer */}
          <Card title="Assigned Officer">
            {incident.assignedTo ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{incident.assignedTo.name}</p>
                  <p className="text-sm text-gray-500">Badge: {incident.assignedTo.badgeNumber}</p>
                  {incident.assignedTo.role && (
                    <p className="text-xs text-gray-400 mt-0.5">{incident.assignedTo.role.replace(/_/g, ' ')}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-red-400 font-medium">⚠ Unassigned</p>
              </div>
            )}
          </Card>

          {/* Station */}
          {incident.station && (
            <Card title="Station">
              <p className="font-medium text-gray-900 dark:text-white">{incident.station.name}</p>
              <p className="text-sm text-gray-500 mt-1">Code: {incident.station.code}</p>
              {incident.station.county && (
                <p className="text-sm text-gray-500">County: {incident.station.county}</p>
              )}
            </Card>
          )}

          {/* Recorded by */}
          {incident.createdBy && (
            <Card title="Recorded By">
              <p className="font-medium text-gray-900 dark:text-white">{incident.createdBy.name}</p>
              {incident.createdBy.badgeNumber && (
                <p className="text-sm text-gray-500 mt-1">Badge: {incident.createdBy.badgeNumber}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(incident.createdAt).toLocaleString('en-KE')}
              </p>
            </Card>
          )}

          {/* Citations */}
          <Card
            title={`Citations (${incident.citations?.length ?? 0})`}
            action={
              <button onClick={() => setShowCitationModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20
                  text-purple-600 rounded-lg text-xs hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors font-medium">
                <Plus className="w-3 h-3" /> Add
              </button>
            }
          >
            {(incident.citations?.length ?? 0) === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                No citations issued
              </p>
            ) : (
              <div className="space-y-3">
                {incident.citations!.map(c => (
                  <div key={c.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="font-mono text-xs font-semibold text-gray-400 mb-1">{c.citationNumber}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{c.violation}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Issued to: {c.issuedTo}</p>
                    {c.section && <p className="text-xs text-gray-500">Section: {c.section}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        KES {c.amount.toLocaleString()}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_COLORS[c.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                        {c.paymentStatus}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Due: {new Date(c.dueDate).toLocaleDateString('en-KE')}
                      {c.issuedBy && ` · ${c.issuedBy.name}`}
                    </p>
                    {c.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{c.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Citation Modal ── */}
      {showCitationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Issue Citation</h3>
              <button
                onClick={() => { setShowCitationModal(false); setCitationError(''); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddCitation} className="p-6 space-y-4">
              {citationError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{citationError}</p>
                </div>
              )}

              {([
                { label: 'Issued To *',         key: 'issuedTo',        type: 'text',   ph: 'Full name of offender' },
                { label: 'ID / Passport No.',   key: 'issuedToIdNumber',type: 'text',   ph: 'National ID or passport' },
                { label: 'Violation *',         key: 'violation',       type: 'text',   ph: 'e.g. Speeding, Drunk Driving' },
                { label: 'Traffic Section',     key: 'section',         type: 'text',   ph: 'e.g. Section 5(2) TRTA' },
                { label: 'Fine Amount (KES) *', key: 'amount',          type: 'number', ph: '2000' },
                { label: 'Due Date *',          key: 'dueDate',         type: 'date',   ph: '' },
              ] as const).map(({ label, key, type, ph }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
                  <input
                    type={type}
                    placeholder={ph}
                    value={citationForm[key]}
                    onChange={e => setCitationForm(f => ({ ...f, [key]: e.target.value }))}
                    min={type === 'number' ? '0' : undefined}
                    step={type === 'number' ? '0.01' : undefined}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-purple-500 focus:outline-none transition-shadow"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
                <textarea rows={3} value={citationForm.notes}
                  onChange={e => setCitationForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes or observations…"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none transition-shadow" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button"
                  onClick={() => { setShowCitationModal(false); setCitationError(''); }}
                  className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                    rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={citationSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700
                    text-white rounded-lg disabled:opacity-50 transition-colors text-sm font-medium">
                  {citationSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Issuing…</>
                    : <><CheckCircle className="w-4 h-4" /> Issue Citation</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────────────────────────────────────
function Card({
  title, action, children,
}: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  icon, label, value, children,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5 uppercase tracking-wide font-medium">{label}</p>
        {value
          ? <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
          : children}
      </div>
    </div>
  );
}