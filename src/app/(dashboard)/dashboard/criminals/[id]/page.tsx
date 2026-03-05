// src/app/(dashboard)/dashboard/criminals/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  AlertTriangle,
  User,
  MapPin,
  Phone,
  FileText,
  Download,
  Eye,
  Fingerprint,
  Camera,
  File,
  X,
  CheckCircle2,
  Brain,
} from 'lucide-react';
import { getWantedStatusColor, getWantedStatusLabel } from '@/lib/constants/criminal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvidenceItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  category: string;
}

interface CriminalHistoryEntry {
  date?: string;
  offense?: string;
  outcome?: string;
  [key: string]: string | undefined;
}

interface Criminal {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  alias: string[];
  dateOfBirth?: string;
  gender: string;
  nationality: string;
  idNumber?: string;
  phoneNumber?: string;
  address?: string;
  photoUrl?: string;
  isWanted: boolean;
  wantedReason?: string;
  lastKnownLocation?: string;
  criminalHistory: CriminalHistoryEntry[];
  Station: {                // ✅ Fixed: capital S to match Prisma/API response
    id: string;
    name: string;
    code: string;
    county: string;
  };
  cases: CaseItem[];
  evidenceItems: EvidenceItem[];
  createdAt: string;
  updatedAt: string;
}

// ─── Fingerprint constants ────────────────────────────────────────────────────

const FINGER_SLOTS = [
  { key: 'RIGHT_THUMB',  label: 'Thumb',  hand: 'right' as const },
  { key: 'RIGHT_INDEX',  label: 'Index',  hand: 'right' as const },
  { key: 'RIGHT_MIDDLE', label: 'Middle', hand: 'right' as const },
  { key: 'RIGHT_RING',   label: 'Ring',   hand: 'right' as const },
  { key: 'RIGHT_PINKY',  label: 'Pinky',  hand: 'right' as const },
  { key: 'LEFT_THUMB',   label: 'Thumb',  hand: 'left'  as const },
  { key: 'LEFT_INDEX',   label: 'Index',  hand: 'left'  as const },
  { key: 'LEFT_MIDDLE',  label: 'Middle', hand: 'left'  as const },
  { key: 'LEFT_RING',    label: 'Ring',   hand: 'left'  as const },
  { key: 'LEFT_PINKY',   label: 'Pinky',  hand: 'left'  as const },
];

const FINGER_LABEL_MAP: Record<string, string> = {
  RIGHT_THUMB:  'Right Thumb',
  RIGHT_INDEX:  'Right Index',
  RIGHT_MIDDLE: 'Right Middle',
  RIGHT_RING:   'Right Ring',
  RIGHT_PINKY:  'Right Pinky',
  LEFT_THUMB:   'Left Thumb',
  LEFT_INDEX:   'Left Index',
  LEFT_MIDDLE:  'Left Middle',
  LEFT_RING:    'Left Ring',
  LEFT_PINKY:   'Left Pinky',
};

const EVIDENCE_ICONS: Record<string, React.ElementType> = {
  PHOTO: Camera,
  FINGERPRINT: Fingerprint,
  DOCUMENT: FileText,
  OTHER: File,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CriminalViewPage() {
  const params = useParams();
  const router = useRouter();
  const [criminal, setCriminal] = useState<Criminal | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFingerprint, setSelectedFingerprint] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) fetchCriminal();
  }, [params.id]);

  const fetchCriminal = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/criminals/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setCriminal(data.data);
      } else {
        alert('Failed to load criminal record');
        router.push('/dashboard/criminals');
      }
    } catch (error) {
      console.error('Error fetching criminal:', error);
      alert('Failed to load criminal record');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this criminal record? This action cannot be undone.')) return;
    try {
      const response = await fetch(`/api/criminals/${params.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        alert('Criminal record deleted successfully');
        router.push('/dashboard/criminals');
      } else {
        alert(data.error || 'Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting criminal:', error);
      alert('Failed to delete record');
    }
  };

  const getFullName = () => {
    if (!criminal) return '';
    return `${criminal.firstName} ${criminal.middleName ? criminal.middleName + ' ' : ''}${criminal.lastName}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getEvidenceIcon = (type: string): React.ElementType =>
    EVIDENCE_ICONS[type] ?? File;

  // ── Derived fingerprint data ──────────────────────────────────────────────

  const fingerprintMap: Record<string, EvidenceItem> = {};
  criminal?.evidenceItems
    .filter((e) => e.type === 'FINGERPRINT')
    .forEach((fp) => { fingerprintMap[fp.title] = fp; });

  const capturedCount = Object.keys(fingerprintMap).length;
  const completionPct = Math.round((capturedCount / 10) * 100);

  // Non-fingerprint evidence
  const otherEvidence = criminal?.evidenceItems.filter((e) => e.type !== 'FINGERPRINT') ?? [];

  // ── Loading / empty states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!criminal) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900 dark:text-white">Criminal record not found</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/criminals"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{getFullName()}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Criminal Record Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/dashboard/criminals/${criminal.id}/ai-profile`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Brain className="w-4 h-4" />
            AI Profile
          </Link>
          <Link
            href={`/dashboard/criminals/${criminal.id}/fingerprints`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <Fingerprint className="w-4 h-4" />
            Fingerprints
            {capturedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded-full font-bold">
                {capturedCount}/10
              </span>
            )}
          </Link>
          <Link
            href={`/dashboard/criminals/${criminal.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* ── Wanted banner ── */}
      {criminal.isWanted && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-400">WANTED</h3>
              <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                {criminal.wantedReason || 'No reason specified'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">
          {/* Photo + quick stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {criminal.photoUrl ? (
              <img
                src={criminal.photoUrl}
                alt={getFullName()}
                className="w-full aspect-square object-cover rounded-lg mb-4 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedImage(criminal.photoUrl ?? null)}
              />
            ) : (
              <div className="w-full aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                <User className="w-24 h-24 text-gray-400" />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getWantedStatusColor(criminal.isWanted.toString())}`}>
                  {getWantedStatusLabel(criminal.isWanted)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Cases</span>
                <span className="font-medium">{criminal.cases.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Evidence Items</span>
                <span className="font-medium">{otherEvidence.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Fingerprints</span>
                <span className={`font-medium ${capturedCount === 10 ? 'text-green-600 dark:text-green-400' : capturedCount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                  {capturedCount}/10
                </span>
              </div>
            </div>
          </div>

          {/* Station */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4">Station Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Station</p>
                <p className="font-medium">{criminal.Station?.name ?? '—'}</p>   {/* ✅ capital S */}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Code</p>
                <p className="font-medium">{criminal.Station?.code ?? '—'}</p>   {/* ✅ capital S */}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">County</p>
                <p className="font-medium">{criminal.Station?.county ?? '—'}</p> {/* ✅ capital S */}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">First Name</p>
                <p className="font-medium">{criminal.firstName}</p>
              </div>
              {criminal.middleName && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Middle Name</p>
                  <p className="font-medium">{criminal.middleName}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last Name</p>
                <p className="font-medium">{criminal.lastName}</p>
              </div>
              {criminal.alias.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Aliases</p>
                  <p className="font-medium">{criminal.alias.join(', ')}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Gender</p>
                <p className="font-medium">{criminal.gender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Nationality</p>
                <p className="font-medium">{criminal.nationality}</p>
              </div>
              {criminal.dateOfBirth && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</p>
                  <p className="font-medium">{formatDate(criminal.dateOfBirth)}</p>
                </div>
              )}
              {criminal.idNumber && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">ID Number</p>
                  <p className="font-medium">{criminal.idNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact & Location */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4">Contact & Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {criminal.phoneNumber && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
                    <p className="font-medium">{criminal.phoneNumber}</p>
                  </div>
                </div>
              )}
              {criminal.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                    <p className="font-medium">{criminal.address}</p>
                  </div>
                </div>
              )}
              {criminal.lastKnownLocation && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last Known Location</p>
                    <p className="font-medium">{criminal.lastKnownLocation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── FINGERPRINT SECTION ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Fingerprint className="w-5 h-5" />
                Fingerprint Records
              </h3>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                  capturedCount === 10
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : capturedCount > 0
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {capturedCount}/10 captured
                </span>
                <Link
                  href={`/dashboard/criminals/${criminal.id}/fingerprints`}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Manage →
                </Link>
              </div>
            </div>

            {/* Progress bar */}
            {capturedCount > 0 && (
              <div className="mb-4">
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      capturedCount === 10 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {capturedCount === 10
                    ? 'All 10 fingerprints captured — complete'
                    : `${10 - capturedCount} finger${10 - capturedCount !== 1 ? 's' : ''} remaining`}
                </p>
              </div>
            )}

            {capturedCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <Fingerprint className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No fingerprints captured yet</p>
                <Link
                  href={`/dashboard/criminals/${criminal.id}/fingerprints`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Fingerprint className="w-4 h-4" />
                  Capture Fingerprints
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {(['right', 'left'] as const).map((hand) => (
                  <div key={hand}>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                      {hand === 'right' ? 'Right Hand' : 'Left Hand'}
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {FINGER_SLOTS.filter((f) => f.hand === hand).map((slot) => {
                        const fp = fingerprintMap[slot.key];
                        const isSelected = selectedFingerprint === slot.key;

                        return (
                          <div key={slot.key} className="flex flex-col items-center gap-1.5">
                            <button
                              type="button"
                              title={FINGER_LABEL_MAP[slot.key]}
                              onClick={() => setSelectedFingerprint(isSelected ? null : slot.key)}
                              className={`
                                relative w-full aspect-square rounded-xl border-2 overflow-hidden flex items-center justify-center transition-all
                                ${fp
                                  ? isSelected
                                    ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                                    : 'border-green-400 dark:border-green-500 hover:border-green-500'
                                  : 'border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 cursor-default'
                                }
                              `}
                            >
                              {fp ? (
                                <>
                                  <img
                                    src={fp.fileUrl}
                                    alt={FINGER_LABEL_MAP[slot.key]}
                                    className="w-full h-full object-cover"
                                  />
                                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white dark:border-gray-800" />
                                </>
                              ) : (
                                <div className="text-gray-200 dark:text-gray-700">
                                  <svg width="20" height="26" viewBox="0 0 24 32" fill="none">
                                    <rect x="6" y="8" width="12" height="20" rx="6" fill="currentColor" />
                                    <rect x="8" y="0" width="8" height="14" rx="4" fill="currentColor" />
                                  </svg>
                                </div>
                              )}
                            </button>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium text-center">
                              {slot.label}
                            </span>
                            {fp && (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Selected finger detail */}
                {selectedFingerprint && fingerprintMap[selectedFingerprint] && (
                  <div className="mt-3 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-start gap-4">
                      <img
                        src={fingerprintMap[selectedFingerprint].fileUrl}
                        alt={FINGER_LABEL_MAP[selectedFingerprint]}
                        className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
                        onClick={() => setSelectedImage(fingerprintMap[selectedFingerprint].fileUrl)}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">
                          {FINGER_LABEL_MAP[selectedFingerprint]}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(fingerprintMap[selectedFingerprint].fileSize)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Captured: {formatDate(fingerprintMap[selectedFingerprint].createdAt)}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => setSelectedImage(fingerprintMap[selectedFingerprint].fileUrl)}
                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> View Full Size
                          </button>
                          <a
                            href={fingerprintMap[selectedFingerprint].fileUrl}
                            download={fingerprintMap[selectedFingerprint].fileName}
                            className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Download
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Other Evidence Items */}
          {otherEvidence.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Evidence & Documentation
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {otherEvidence.length} item{otherEvidence.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {otherEvidence.map((item: EvidenceItem) => {
                  const Icon = getEvidenceIcon(item.type);
                  const isImage = item.mimeType?.startsWith('image/');
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        {isImage ? (
                          <img
                            src={item.fileUrl}
                            alt={item.title}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setSelectedImage(item.fileUrl)}
                          />
                        ) : (
                          <Icon className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">{item.title}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            {item.type}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(item.fileSize)}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(item.createdAt)}</span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1">
                            <Eye className="w-3 h-3" /> View
                          </a>
                          <a href={item.fileUrl} download={item.fileName} className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 flex items-center gap-1">
                            <Download className="w-3 h-3" /> Download
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Associated Cases */}
          {criminal.cases.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold mb-4">Associated Cases ({criminal.cases.length})</h3>
              <div className="space-y-3">
                {criminal.cases.map((caseItem: CaseItem) => (
                  <Link
                    key={caseItem.id}
                    href={`/dashboard/cases/${caseItem.id}`}
                    className="block border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{caseItem.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Case #{caseItem.caseNumber}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        caseItem.status === 'OPEN'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {caseItem.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Record Metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4">Record Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                <p className="font-medium">{formatDate(criminal.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="font-medium">{formatDate(criminal.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Image lightbox ── */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}