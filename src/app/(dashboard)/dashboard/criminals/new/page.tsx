// src/app/(dashboard)/dashboard/criminals/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  User,
  Upload,
  X,
  Plus,
  Image as ImageIcon,
  AlertTriangle,
  MapPin,
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  Fingerprint,
  Camera,
  File,
  Eye,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  GENDER_OPTIONS,
  NATIONALITY_OPTIONS,
} from '@/lib/constants/criminal';

interface Station {
  id: string;
  name: string;
  code: string;
}

interface EvidenceItem {
  type: 'PHOTO' | 'FINGERPRINT' | 'DOCUMENT' | 'OTHER';
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
}

// ── Evidence types shown in the "Other Evidence" form (excludes FINGERPRINT
//    since fingerprints now have their own dedicated section)
const EVIDENCE_TYPES = [
  { value: 'PHOTO',    label: 'Photograph',     icon: Camera   },
  { value: 'DOCUMENT', label: 'Document',        icon: FileText },
  { value: 'OTHER',    label: 'Other Evidence',  icon: File     },
] as const;

// ── 10-finger constants ──────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────

export default function NewCriminalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [aliases, setAliases] = useState<string[]>([]);
  const [currentAlias, setCurrentAlias] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);

  // Evidence form state (other evidence, not fingerprints)
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [currentEvidence, setCurrentEvidence] = useState<Partial<EvidenceItem>>({
    type: 'PHOTO',
    title: '',
    description: '',
  });
  const [evidencePreview, setEvidencePreview] = useState<string>('');

  // ── NEW: per-finger preview URLs and uploading flags ──
  const [fingerprintPreviews, setFingerprintPreviews] = useState<Record<string, string>>({});
  const [fingerprintUploading, setFingerprintUploading] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    nationality: 'Kenyan',
    idNumber: '',
    phoneNumber: '',
    address: '',
    lastKnownLocation: '',
    isWanted: false,
    wantedReason: '',
    stationId: '',
    photoUrl: '',
  });

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/stations');
      const data = await response.json();
      if (data.success) {
        setStations(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadSuccess(false);

    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      console.log('Starting upload for:', file.name, file.size, file.type);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setFormData((prev) => ({ ...prev, photoUrl: data.data.url }));
        setPhotoPreview(data.data.url);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        setUploadError(data.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      setUploadError('Network error: Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleEvidenceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setCurrentEvidence((prev) => ({
          ...prev,
          fileUrl: data.data.url,
          fileName: data.data.filename,
          fileSize: data.data.size,
          mimeType: data.data.mimeType,
        }));

        if (file.type.startsWith('image/')) {
          setEvidencePreview(data.data.url);
        }

        if (!currentEvidence.title) {
          setCurrentEvidence((prev) => ({
            ...prev,
            title: file.name,
          }));
        }
      } else {
        alert(data.error || 'Failed to upload evidence');
      }
    } catch (error) {
      console.error('Error uploading evidence:', error);
      alert('Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  // ── NEW: upload a single fingerprint image ───────────────────────────────

  const handleFingerprintUpload = async (
    fingerType: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset so the same file can be re-selected after removal
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file for fingerprints');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5 MB');
      return;
    }

    setFingerprintUploading((prev) => ({ ...prev, [fingerType]: true }));

    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        alert(uploadData.error || 'Upload failed');
        return;
      }

      const { url, filename, size, mimeType } = uploadData.data;

      // Store preview
      setFingerprintPreviews((prev) => ({ ...prev, [fingerType]: url }));

      // Upsert into evidenceItems as a FINGERPRINT record keyed by fingerType in title
      setEvidenceItems((prev) => {
        const filtered = prev.filter(
          (item) => !(item.type === 'FINGERPRINT' && item.title === fingerType)
        );
        return [
          ...filtered,
          {
            type: 'FINGERPRINT',
            title: fingerType, // fingerType key stored in title — matches the fingerprints API
            description: `Finger: ${FINGER_LABEL_MAP[fingerType]}. Captured during registration.`,
            fileUrl: url,
            fileName: filename,
            fileSize: size,
            mimeType,
            uploadedBy: 'SYSTEM',
          },
        ];
      });
    } catch (err) {
      console.error('Fingerprint upload error:', err);
      alert('An error occurred during upload');
    } finally {
      setFingerprintUploading((prev) => ({ ...prev, [fingerType]: false }));
    }
  };

  const removeFingerprintPreview = (fingerType: string) => {
    setFingerprintPreviews((prev) => {
      const next = { ...prev };
      delete next[fingerType];
      return next;
    });
    setEvidenceItems((prev) =>
      prev.filter((item) => !(item.type === 'FINGERPRINT' && item.title === fingerType))
    );
  };

  // ── /NEW ─────────────────────────────────────────────────────────────────

  const addEvidence = () => {
    if (!currentEvidence.fileUrl || !currentEvidence.title) {
      alert('Please upload a file and provide a title');
      return;
    }

    const newEvidence: EvidenceItem = {
      type: currentEvidence.type as EvidenceItem['type'],
      title: currentEvidence.title,
      description: currentEvidence.description || '',
      fileUrl: currentEvidence.fileUrl,
      fileName: currentEvidence.fileName || '',
      fileSize: currentEvidence.fileSize || 0,
      mimeType: currentEvidence.mimeType || '',
      uploadedBy: 'SYSTEM',
    };

    setEvidenceItems((prev) => [...prev, newEvidence]);

    setCurrentEvidence({ type: 'PHOTO', title: '', description: '' });
    setEvidencePreview('');
    setShowEvidenceForm(false);
  };

  const removeEvidence = (index: number) => {
    setEvidenceItems((prev) => prev.filter((_, i) => i !== index));
  };

  const cancelEvidenceForm = () => {
    setCurrentEvidence({ type: 'PHOTO', title: '', description: '' });
    setEvidencePreview('');
    setShowEvidenceForm(false);
  };

  const addAlias = () => {
    if (currentAlias.trim() && !aliases.includes(currentAlias.trim())) {
      setAliases([...aliases, currentAlias.trim()]);
      setCurrentAlias('');
    }
  };

  const removeAlias = (alias: string) => {
    setAliases(aliases.filter((a) => a !== alias));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.gender || !formData.stationId) {
      alert('Please fill in all required fields (First Name, Last Name, Gender, Station)');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...formData,
        alias: aliases,
        evidenceItems, // fingerprints are included here as type=FINGERPRINT items
      };

      console.log('Submitting criminal record:', payload);

      const response = await fetch('/api/criminals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        alert('Criminal record created successfully');
        router.push('/dashboard/criminals');
      } else {
        console.error('API Error:', data);
        alert(data.error || 'Failed to create record');
      }
    } catch (error) {
      console.error('Error creating criminal:', error);
      alert('Failed to create record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getEvidenceIcon = (type: string) => {
    const evidenceType = EVIDENCE_TYPES.find((t) => t.value === type);
    return evidenceType ? evidenceType.icon : File;
  };

  const capturedFingerprintCount = Object.keys(fingerprintPreviews).length;

  // Only non-fingerprint items shown in the "Other Evidence" list
  const otherEvidenceItems = evidenceItems.filter((e) => e.type !== 'FINGERPRINT');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/criminals"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Register New Criminal
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Add a new criminal record to the database
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Profile Photograph
          </h2>
          <div className="flex items-start gap-6">
            <div className="w-40 h-40 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Criminal photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-16 h-16 text-gray-400" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Photo
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Upload a clear photo (max 5MB). Supported formats: JPG, PNG, GIF, WebP
              </p>

              {uploadError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                </div>
              )}

              {uploadSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-sm text-green-600 dark:text-green-400">Photo uploaded successfully!</p>
                </div>
              )}

              {photoPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreview('');
                    setFormData((prev) => ({ ...prev, photoUrl: '' }));
                    setUploadError('');
                    setUploadSuccess(false);
                  }}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Remove Photo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Middle Name
              </label>
              <input
                type="text"
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Gender</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nationality
              </label>
              <select
                name="nationality"
                value={formData.nationality}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {NATIONALITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ID Number
              </label>
              <input
                type="text"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+254-7XX-XXXXXX"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Aliases */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Aliases / Known Names
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={currentAlias}
                onChange={(e) => setCurrentAlias(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAlias())}
                placeholder="Enter alias and press Add"
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addAlias}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {aliases.map((alias) => (
                <span
                  key={alias}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                >
                  {alias}
                  <button
                    type="button"
                    onClick={() => removeAlias(alias)}
                    className="hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Known Location
              </label>
              <input
                type="text"
                name="lastKnownLocation"
                value={formData.lastKnownLocation}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reporting Station <span className="text-red-500">*</span>
              </label>
              <select
                name="stationId"
                value={formData.stationId}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Station</option>
                {stations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name} ({station.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── NEW: Fingerprint Capture section ────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Fingerprint className="w-5 h-5" />
              Fingerprint Capture
            </h2>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${
              capturedFingerprintCount === 10
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : capturedFingerprintCount > 0
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {capturedFingerprintCount}/10 captured
            </span>
          </div>

          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-5">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Upload scanned fingerprint images (JPG/PNG, max 5 MB each). You can also capture
              or update fingerprints at any time from the criminal profile page after saving.
            </p>
          </div>

          {capturedFingerprintCount > 0 && (
            <div className="mb-5">
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    capturedFingerprintCount === 10 ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${(capturedFingerprintCount / 10) * 100}%` }}
                />
              </div>
            </div>
          )}

          {(['right', 'left'] as const).map((hand) => (
            <div key={hand} className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                {hand === 'right' ? 'Right Hand' : 'Left Hand'}
              </h3>
              <div className="grid grid-cols-5 gap-3">
                {FINGER_SLOTS.filter((f) => f.hand === hand).map((slot) => {
                  const preview = fingerprintPreviews[slot.key];
                  const isUploading = fingerprintUploading[slot.key];

                  return (
                    <div key={slot.key} className="flex flex-col items-center gap-2">
                      {/* Tile */}
                      <div className={`
                        w-full aspect-square rounded-xl border-2 overflow-hidden flex items-center justify-center
                        ${preview
                          ? 'border-green-400 dark:border-green-500'
                          : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40'
                        }
                      `}>
                        {isUploading ? (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        ) : preview ? (
                          <img src={preview} alt={FINGER_LABEL_MAP[slot.key]} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-gray-200 dark:text-gray-700">
                            <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
                              <rect x="6" y="8" width="12" height="20" rx="6" fill="currentColor" />
                              <rect x="8" y="0" width="8" height="14" rx="4" fill="currentColor" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Label */}
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center">
                        {slot.label}
                      </span>

                      {/* Upload / Re-capture */}
                      <label className={`
                        w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors
                        ${preview
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                        }
                        ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                      `}>
                        {isUploading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : preview ? (
                          <RotateCcw className="w-3 h-3" />
                        ) : (
                          <Upload className="w-3 h-3" />
                        )}
                        {preview ? 'Redo' : 'Add'}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploading}
                          onChange={(e) => handleFingerprintUpload(slot.key, e)}
                          className="hidden"
                        />
                      </label>

                      {/* Remove — only when captured */}
                      {preview && (
                        <button
                          type="button"
                          onClick={() => removeFingerprintPreview(slot.key)}
                          className="text-[10px] text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-0.5"
                        >
                          <X className="w-2.5 h-2.5" /> Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {/* ── /NEW ── */}

        {/* Other Evidence & Documentation (non-fingerprint) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Other Evidence & Documentation
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {otherEvidenceItems.length} item{otherEvidenceItems.length !== 1 ? 's' : ''}
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Upload additional photos, documents, or other relevant materials (not fingerprints).
          </p>

          {/* Add Evidence Button */}
          {!showEvidenceForm && (
            <button
              type="button"
              onClick={() => setShowEvidenceForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Evidence
            </button>
          )}

          {/* Evidence Form */}
          {showEvidenceForm && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Add New Evidence</h3>

              <div className="space-y-4">
                {/* Evidence Type — only PHOTO, DOCUMENT, OTHER */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Evidence Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {EVIDENCE_TYPES.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCurrentEvidence((prev) => ({ ...prev, type: value as any }))}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          currentEvidence.type === value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload File <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-start gap-4">
                    {evidencePreview && (
                      <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0">
                        <img
                          src={evidencePreview}
                          alt="Evidence preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1">
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg cursor-pointer transition-colors">
                        {uploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            {currentEvidence.fileUrl ? 'Change File' : 'Upload File'}
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleEvidenceFileUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Max 5MB. Supports: Images, PDF
                      </p>
                      {currentEvidence.fileName && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {currentEvidence.fileName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentEvidence.title || ''}
                    onChange={(e) => setCurrentEvidence((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Mugshot - Front View, ID Copy"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={currentEvidence.description || ''}
                    onChange={(e) => setCurrentEvidence((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Add any relevant details about this evidence..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={addEvidence}
                    disabled={!currentEvidence.fileUrl || !currentEvidence.title}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Evidence
                  </button>
                  <button
                    type="button"
                    onClick={cancelEvidenceForm}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Evidence List — non-fingerprint items only */}
          {otherEvidenceItems.length > 0 && (
            <div className="space-y-3 mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Uploaded Evidence
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {otherEvidenceItems.map((item, index) => {
                  const Icon = getEvidenceIcon(item.type);
                  const isImage = item.mimeType?.startsWith('image/');
                  // find real index in full evidenceItems array for removal
                  const realIndex = evidenceItems.findIndex(
                    (e) => e.type === item.type && e.title === item.title && e.fileUrl === item.fileUrl
                  );

                  return (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        {isImage ? (
                          <img
                            src={item.fileUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Icon className="w-8 h-8 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                {item.type}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {(item.fileSize / 1024).toFixed(2)} KB
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {isImage && (
                              <a
                                href={item.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => removeEvidence(realIndex)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Remove"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Wanted Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Wanted Status
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isWanted"
                checked={formData.isWanted}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mark as Wanted Person
              </label>
            </div>
            {formData.isWanted && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Wanted Status
                </label>
                <textarea
                  name="wantedReason"
                  value={formData.wantedReason}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe why this person is wanted..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 rounded-lg">
          <Link
            href="/dashboard/criminals"
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || uploading || Object.values(fingerprintUploading).some(Boolean)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Record
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}