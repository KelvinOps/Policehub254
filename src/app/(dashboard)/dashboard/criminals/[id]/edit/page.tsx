// src/app/(dashboard)/dashboard/criminals/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Upload,
  Loader2,
  CheckCircle,
  Eye,
  Trash2,
  Camera,
  Fingerprint,
  FileText,
  File,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  GENDER_OPTIONS,
  NATIONALITY_OPTIONS,
} from '@/lib/constants/criminal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Station {
  id: string;
  name: string;
  code: string;
}

interface EvidenceItem {
  id?: string;
  type: 'PHOTO' | 'FINGERPRINT' | 'DOCUMENT' | 'OTHER';
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: string;
  createdAt?: string;
}

// Non-fingerprint evidence types only (fingerprints have their own section)
const EVIDENCE_TYPES = [
  { value: 'PHOTO',    label: 'Photograph',    icon: Camera   },
  { value: 'DOCUMENT', label: 'Document',       icon: FileText },
  { value: 'OTHER',    label: 'Other Evidence', icon: File     },
] as const;

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditCriminalPage() {
  const router = useRouter();
  const params = useParams();
  const criminalId = params.id as string;

  const [loading, setLoading]           = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [uploading, setUploading]       = useState(false);
  const [stations, setStations]         = useState<Station[]>([]);
  const [aliases, setAliases]           = useState<string[]>([]);
  const [currentAlias, setCurrentAlias] = useState('');

  // ── Non-fingerprint evidence state ─────────────────────────────────────────
  const [existingEvidence, setExistingEvidence]       = useState<EvidenceItem[]>([]);
  const [newEvidence, setNewEvidence]                 = useState<EvidenceItem[]>([]);
  const [deletedEvidenceIds, setDeletedEvidenceIds]   = useState<string[]>([]);
  const [showEvidenceForm, setShowEvidenceForm]       = useState(false);
  const [currentEvidence, setCurrentEvidence]         = useState<Partial<EvidenceItem>>({ type: 'PHOTO', title: '', description: '' });
  const [evidencePreview, setEvidencePreview]         = useState<string>('');

  // ── Fingerprint state ───────────────────────────────────────────────────────
  // Existing saved fingerprints (from DB, keyed by fingerType = title field)
  const [existingFingerprints, setExistingFingerprints] = useState<Record<string, EvidenceItem>>({});
  // New fingerprints uploaded in this session (keyed by fingerType)
  const [newFingerprintPreviews, setNewFingerprintPreviews] = useState<Record<string, { url: string; fileName: string; fileSize: number; mimeType: string }>>({});
  // Fingerprint IDs pending deletion
  const [deletedFingerprintIds, setDeletedFingerprintIds]   = useState<string[]>([]);
  // Per-finger upload loading
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

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchStations();
    if (criminalId) fetchCriminalData(criminalId);
  }, [criminalId]);

  const fetchStations = async () => {
    try {
      const res  = await fetch('/api/stations');
      const data = await res.json();
      if (data.success) setStations(data.data || []);
    } catch (err) {
      console.error('Error fetching stations:', err);
    }
  };

  const fetchCriminalData = async (id: string) => {
    try {
      setFetchingData(true);
      const res  = await fetch(`/api/criminals/${id}`);
      const data = await res.json();

      if (data.success) {
        const c = data.data;
        setFormData({
          firstName:         c.firstName,
          middleName:        c.middleName || '',
          lastName:          c.lastName,
          dateOfBirth:       c.dateOfBirth ? new Date(c.dateOfBirth).toISOString().split('T')[0] : '',
          gender:            c.gender,
          nationality:       c.nationality,
          idNumber:          c.idNumber || '',
          phoneNumber:       c.phoneNumber || '',
          address:           c.address || '',
          lastKnownLocation: c.lastKnownLocation || '',
          isWanted:          c.isWanted,
          wantedReason:      c.wantedReason || '',
          stationId:         c.stationId,
          photoUrl:          c.photoUrl || '',
        });
        setAliases(c.alias || []);

        // Split evidenceItems into fingerprints and other
        const allItems: EvidenceItem[] = c.evidenceItems || [];
        const fpMap: Record<string, EvidenceItem> = {};
        const others: EvidenceItem[] = [];

        allItems.forEach((item: EvidenceItem) => {
          if (item.type === 'FINGERPRINT') {
            fpMap[item.title] = item; // title holds the fingerType key
          } else {
            others.push(item);
          }
        });

        setExistingFingerprints(fpMap);
        setExistingEvidence(others);
      } else {
        alert('Criminal not found');
        router.push('/dashboard/criminals');
      }
    } catch (err) {
      console.error('Error fetching criminal:', err);
      alert('Failed to load criminal data');
    } finally {
      setFetchingData(false);
    }
  };

  // ── Field handlers ─────────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const addAlias = () => {
    if (currentAlias.trim() && !aliases.includes(currentAlias.trim())) {
      setAliases([...aliases, currentAlias.trim()]);
      setCurrentAlias('');
    }
  };

  const removeAlias = (alias: string) => setAliases(aliases.filter((a) => a !== alias));

  // ── Photo upload ───────────────────────────────────────────────────────────

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File size must be less than 5MB'); return; }
    if (!file.type.startsWith('image/')) { alert('Only image files are allowed'); return; }

    try {
      setUploading(true);
      const fd  = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setFormData((prev) => ({ ...prev, photoUrl: data.data?.url ?? data.url }));
      } else {
        alert(data.error || 'Failed to upload photo');
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  // ── Evidence file upload (non-fingerprint) ─────────────────────────────────

  const handleEvidenceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File size must be less than 5MB'); return; }

    try {
      setUploading(true);
      const fd  = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.success) {
        const d = data.data ?? data;
        setCurrentEvidence((prev) => ({
          ...prev,
          fileUrl:  d.url,
          fileName: d.filename,
          fileSize: d.size,
          mimeType: d.mimeType,
        }));
        if (file.type.startsWith('image/')) setEvidencePreview(d.url);
        if (!currentEvidence.title) setCurrentEvidence((prev) => ({ ...prev, title: file.name }));
      } else {
        alert(data.error || 'Failed to upload evidence');
      }
    } catch (err) {
      console.error('Evidence upload error:', err);
      alert('Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  // ── Fingerprint upload ─────────────────────────────────────────────────────

  const handleFingerprintUpload = async (fingerType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-select of same file

    if (!file.type.startsWith('image/')) { alert('Please upload an image file for fingerprints'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('File must be under 5 MB'); return; }

    setFingerprintUploading((prev) => ({ ...prev, [fingerType]: true }));

    try {
      const fd  = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();

      if (!data.success) { alert(data.error || 'Upload failed'); return; }

      const d = data.data ?? data;

      // If there was an existing DB fingerprint for this finger, mark it for deletion
      if (existingFingerprints[fingerType]?.id) {
        setDeletedFingerprintIds((prev) => [...prev, existingFingerprints[fingerType].id as string]);
        setExistingFingerprints((prev) => {
          const next = { ...prev };
          delete next[fingerType];
          return next;
        });
      }

      setNewFingerprintPreviews((prev) => ({
        ...prev,
        [fingerType]: { url: d.url, fileName: d.filename, fileSize: d.size, mimeType: d.mimeType },
      }));
    } catch (err) {
      console.error('Fingerprint upload error:', err);
      alert('An error occurred during upload');
    } finally {
      setFingerprintUploading((prev) => ({ ...prev, [fingerType]: false }));
    }
  };

  const removeExistingFingerprint = (fingerType: string) => {
    if (!confirm(`Delete the ${FINGER_LABEL_MAP[fingerType]} fingerprint? This cannot be undone.`)) return;
    const item = existingFingerprints[fingerType];
    if (item?.id) setDeletedFingerprintIds((prev) => [...prev, item.id as string]);
    setExistingFingerprints((prev) => { const n = { ...prev }; delete n[fingerType]; return n; });
  };

  const removeNewFingerprint = (fingerType: string) => {
    setNewFingerprintPreviews((prev) => { const n = { ...prev }; delete n[fingerType]; return n; });
  };

  // ── Evidence helpers ───────────────────────────────────────────────────────

  const addEvidence = () => {
    if (!currentEvidence.fileUrl || !currentEvidence.title) { alert('Please upload a file and provide a title'); return; }
    setNewEvidence((prev) => [
      ...prev,
      {
        type:        currentEvidence.type as EvidenceItem['type'],
        title:       currentEvidence.title!,
        description: currentEvidence.description || '',
        fileUrl:     currentEvidence.fileUrl!,
        fileName:    currentEvidence.fileName || '',
        fileSize:    currentEvidence.fileSize || 0,
        mimeType:    currentEvidence.mimeType || '',
      },
    ]);
    setCurrentEvidence({ type: 'PHOTO', title: '', description: '' });
    setEvidencePreview('');
    setShowEvidenceForm(false);
  };

  const removeNewEvidence       = (index: number)  => setNewEvidence((prev) => prev.filter((_, i) => i !== index));
  const removeExistingEvidence  = (id: string)      => {
    if (!confirm('Delete this evidence? This cannot be undone.')) return;
    setDeletedEvidenceIds((prev) => [...prev, id]);
    setExistingEvidence((prev) => prev.filter((item) => item.id !== id));
  };
  const cancelEvidenceForm = () => {
    setCurrentEvidence({ type: 'PHOTO', title: '', description: '' });
    setEvidencePreview('');
    setShowEvidenceForm(false);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.gender || !formData.stationId) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // 1. Update core criminal record
      const updateRes  = await fetch(`/api/criminals/${criminalId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...formData, alias: aliases }),
      });
      const updateData = await updateRes.json();
      if (!updateData.success) { alert(updateData.error || 'Failed to update record'); return; }

      // 2. Delete removed non-fingerprint evidence
      for (const evidenceId of deletedEvidenceIds) {
        await fetch(`/api/criminals/${criminalId}/evidence/${evidenceId}`, { method: 'DELETE' });
      }

      // 3. Add new non-fingerprint evidence
      if (newEvidence.length > 0) {
        await fetch(`/api/criminals/${criminalId}/evidence`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ evidenceItems: newEvidence }),
        });
      }

      // 4. Delete removed fingerprints via fingerprints API
      for (const fpId of deletedFingerprintIds) {
        await fetch(`/api/criminals/${criminalId}/fingerprints/${fpId}`, { method: 'DELETE' });
      }

      // 5. Save new fingerprints via fingerprints API (upsert)
      for (const [fingerType, fp] of Object.entries(newFingerprintPreviews)) {
        await fetch(`/api/criminals/${criminalId}/fingerprints`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            fingerType,
            fileUrl:    fp.url,
            fileName:   fp.fileName,
            fileSize:   fp.fileSize,
            mimeType:   fp.mimeType,
            deviceInfo: 'Manual upload via edit page',
          }),
        });
      }

      alert('Criminal record updated successfully');
      router.push(`/dashboard/criminals/${criminalId}`);
    } catch (err) {
      console.error('Error updating criminal:', err);
      alert('Failed to update record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const getEvidenceIcon = (type: string): React.ElementType => {
    const t = EVIDENCE_TYPES.find((e) => e.value === type);
    return t ? t.icon : File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const capturedFingerprintCount =
    Object.keys(existingFingerprints).length + Object.keys(newFingerprintPreviews).length;

  const allEvidence = [...existingEvidence, ...newEvidence];
  const anyFingerprintUploading = Object.values(fingerprintUploading).some(Boolean);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/criminals/${criminalId}`} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Criminal Record</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Update criminal information and evidence</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Photo ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Criminal Photo</h2>
          <div className="flex items-start gap-6">
            {formData.photoUrl ? (
              <div className="relative">
                <img src={formData.photoUrl} alt="Criminal" className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600" />
                <button type="button" onClick={() => setFormData((prev) => ({ ...prev, photoUrl: '' }))} className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                <Camera className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />{formData.photoUrl ? 'Change Photo' : 'Upload Photo'}</>}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="hidden" />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Max 5MB. JPG, PNG, GIF, WebP</p>
            </div>
          </div>
        </div>

        {/* ── Personal Information ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'First Name', name: 'firstName', required: true },
              { label: 'Middle Name', name: 'middleName', required: false },
              { label: 'Last Name', name: 'lastName', required: true },
              { label: 'ID Number', name: 'idNumber', required: false },
              { label: 'Phone Number', name: 'phoneNumber', required: false, type: 'tel', placeholder: '+254-7XX-XXXXXX' },
            ].map(({ label, name, required, type = 'text', placeholder }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {label} {required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={type}
                  name={name}
                  value={formData[name as keyof typeof formData] as string}
                  onChange={handleChange}
                  required={required}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date of Birth
              </label>
              <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gender <span className="text-red-500">*</span>
              </label>
              <select name="gender" value={formData.gender} onChange={handleChange} required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                <option value="">Select Gender</option>
                {GENDER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nationality</label>
              <select name="nationality" value={formData.nationality} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                {NATIONALITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>

          {/* Aliases */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aliases / Known Names</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={currentAlias} onChange={(e) => setCurrentAlias(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAlias())}
                placeholder="Enter alias and press Add"
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={addAlias} className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {aliases.map((alias) => (
                <span key={alias} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                  {alias}
                  <button type="button" onClick={() => removeAlias(alias)} className="hover:text-red-600"><X className="w-4 h-4" /></button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Location ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Location Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Known Location</label>
              <input type="text" name="lastKnownLocation" value={formData.lastKnownLocation} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reporting Station <span className="text-red-500">*</span>
              </label>
              <select name="stationId" value={formData.stationId} onChange={handleChange} required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                <option value="">Select Station</option>
                {stations.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── FINGERPRINT SECTION ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Fingerprint className="w-5 h-5" />
              Fingerprint Capture
            </h2>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                capturedFingerprintCount === 10
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : capturedFingerprintCount > 0
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {capturedFingerprintCount}/10 captured
              </span>
              {/* Link to dedicated fingerprint page for power users */}
              <Link
                href={`/dashboard/criminals/${criminalId}/fingerprints`}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                Full Registry →
              </Link>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-5">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Upload or replace fingerprint scans below. For a dedicated capture experience with full detail view, use the <strong>Full Registry</strong> link above.
            </p>
          </div>

          {capturedFingerprintCount > 0 && (
            <div className="mb-5">
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${capturedFingerprintCount === 10 ? 'bg-green-500' : 'bg-blue-500'}`}
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
                  const existing   = existingFingerprints[slot.key];
                  const newPreview = newFingerprintPreviews[slot.key];
                  const preview    = newPreview?.url ?? existing?.fileUrl;
                  const isNew      = !!newPreview;
                  const isUploading = fingerprintUploading[slot.key];

                  return (
                    <div key={slot.key} className="flex flex-col items-center gap-2">
                      {/* Tile */}
                      <div className={`
                        w-full aspect-square rounded-xl border-2 overflow-hidden flex items-center justify-center relative
                        ${preview
                          ? isNew
                            ? 'border-blue-400 dark:border-blue-500'      // new upload: blue
                            : 'border-green-400 dark:border-green-500'    // existing: green
                          : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40'
                        }
                      `}>
                        {isUploading ? (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        ) : preview ? (
                          <>
                            <img src={preview} alt={FINGER_LABEL_MAP[slot.key]} className="w-full h-full object-cover" />
                            {isNew && (
                              <span className="absolute top-1 left-1 px-1 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded">NEW</span>
                            )}
                          </>
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
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center">{slot.label}</span>

                      {/* Upload / Re-capture button */}
                      <label className={`
                        w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors
                        ${preview
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                        }
                        ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                      `}>
                        {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : preview ? <RotateCcw className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                        {preview ? 'Redo' : 'Add'}
                        <input type="file" accept="image/*" disabled={isUploading} onChange={(e) => handleFingerprintUpload(slot.key, e)} className="hidden" />
                      </label>

                      {/* Remove buttons */}
                      {existing && !newPreview && (
                        <button type="button" onClick={() => removeExistingFingerprint(slot.key)}
                          className="text-[10px] text-red-500 hover:text-red-700 dark:text-red-400 flex items-center gap-0.5">
                          <X className="w-2.5 h-2.5" /> Remove
                        </button>
                      )}
                      {newPreview && (
                        <button type="button" onClick={() => removeNewFingerprint(slot.key)}
                          className="text-[10px] text-red-500 hover:text-red-700 dark:text-red-400 flex items-center gap-0.5">
                          <X className="w-2.5 h-2.5" /> Undo
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Other Evidence ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Other Evidence & Documentation
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{allEvidence.length} item{allEvidence.length !== 1 ? 's' : ''}</span>
          </div>

          {!showEvidenceForm && (
            <button type="button" onClick={() => setShowEvidenceForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors mb-4">
              <Plus className="w-4 h-4" /> Add New Evidence
            </button>
          )}

          {/* Evidence form */}
          {showEvidenceForm && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Add New Evidence</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Evidence Type <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {EVIDENCE_TYPES.map(({ value, label, icon: Icon }) => (
                      <button key={value} type="button"
                        onClick={() => setCurrentEvidence((prev) => ({ ...prev, type: value as EvidenceItem['type'] }))}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          currentEvidence.type === value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}>
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload File <span className="text-red-500">*</span></label>
                  <div className="flex items-start gap-4">
                    {evidencePreview && (
                      <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0">
                        <img src={evidencePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg cursor-pointer transition-colors">
                        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />{currentEvidence.fileUrl ? 'Change File' : 'Upload File'}</>}
                        <input type="file" accept="image/*,.pdf" onChange={handleEvidenceFileUpload} disabled={uploading} className="hidden" />
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Max 5MB. Images, PDF</p>
                      {currentEvidence.fileName && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />{currentEvidence.fileName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title <span className="text-red-500">*</span></label>
                  <input type="text" value={currentEvidence.title || ''} onChange={(e) => setCurrentEvidence((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Mugshot - Front View, ID Copy"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (Optional)</label>
                  <textarea value={currentEvidence.description || ''} onChange={(e) => setCurrentEvidence((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3} placeholder="Add any relevant details..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={addEvidence} disabled={!currentEvidence.fileUrl || !currentEvidence.title}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Add Evidence
                  </button>
                  <button type="button" onClick={cancelEvidenceForm}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Evidence list */}
          {allEvidence.length > 0 && (
            <div className="space-y-3">
              {[
                ...existingEvidence.map((item) => ({ item, isNew: false, index: -1 })),
                ...newEvidence.map((item, index) => ({ item, isNew: true, index })),
              ].map(({ item, isNew, index }) => {
                const Icon    = getEvidenceIcon(item.type);
                const isImage = item.mimeType?.startsWith('image/');
                return (
                  <div key={isNew ? `new-${index}` : item.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      isNew ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
                    }`}>
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      {isImage ? <img src={item.fileUrl} alt={item.title} className="w-full h-full object-cover" /> : <Icon className="w-8 h-8 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">{item.type}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(item.fileSize)}</span>
                            {isNew && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">New</span>}
                          </div>
                          {item.description && <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{item.description}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          {isImage && (
                            <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View">
                              <Eye className="w-4 h-4" />
                            </a>
                          )}
                          <button type="button"
                            onClick={() => isNew ? removeNewEvidence(index) : item.id && removeExistingEvidence(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title={isNew ? 'Remove' : 'Delete'}>
                            {isNew ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Wanted Status ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Wanted Status</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" name="isWanted" checked={formData.isWanted} onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mark as Wanted Person</label>
            </div>
            {formData.isWanted && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason for Wanted Status</label>
                <textarea name="wantedReason" value={formData.wantedReason} onChange={handleChange} rows={3}
                  placeholder="Describe why this person is wanted..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex items-center justify-end gap-4 sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 rounded-lg">
          <Link href={`/dashboard/criminals/${criminalId}`}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={loading || uploading || anyFingerprintUploading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Updating...</> : <><Save className="w-5 h-5" />Update Record</>}
          </button>
        </div>
      </form>
    </div>
  );
}