// src/app/(dashboard)/dashboard/criminals/[id]/fingerprints/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Eye,
  Save,
  Info,
  Camera,
  X,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Criminal {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  photoUrl?: string;
  badgeNumber?: string;
  Station?: { name: string; code: string };
}

interface FingerprintRecord {
  id: string;
  title: string; // stores the fingerType value e.g. "RIGHT_THUMB"
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  description?: string; // JSON string with quality, device, capturedAt
  createdAt: string;
  updatedAt: string;
}

interface FingerSlot {
  key: string;   // e.g. "RIGHT_THUMB"
  label: string; // e.g. "R. Thumb"
  hand: 'right' | 'left';
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FINGER_SLOTS: FingerSlot[] = [
  { key: 'RIGHT_THUMB',  label: 'Thumb',  hand: 'right' },
  { key: 'RIGHT_INDEX',  label: 'Index',  hand: 'right' },
  { key: 'RIGHT_MIDDLE', label: 'Middle', hand: 'right' },
  { key: 'RIGHT_RING',   label: 'Ring',   hand: 'right' },
  { key: 'RIGHT_PINKY',  label: 'Pinky',  hand: 'right' },
  { key: 'LEFT_THUMB',   label: 'Thumb',  hand: 'left'  },
  { key: 'LEFT_INDEX',   label: 'Index',  hand: 'left'  },
  { key: 'LEFT_MIDDLE',  label: 'Middle', hand: 'left'  },
  { key: 'LEFT_RING',    label: 'Ring',   hand: 'left'  },
  { key: 'LEFT_PINKY',   label: 'Pinky',  hand: 'left'  },
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

export default function FingerprintsPage() {
  const params = useParams();
  const router = useRouter();
  const criminalId = params.id as string;

  const [criminal, setCriminal] = useState<Criminal | null>(null);
  const [fingerprints, setFingerprints] = useState<Record<string, FingerprintRecord>>({});
  const [loadingPage, setLoadingPage] = useState(true);

  // Per-finger upload state
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  // Selected finger for the detail panel
  const [selectedFinger, setSelectedFinger] = useState<string | null>(null);

  // Preview / lightbox
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Toast-style notification
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const getFullName = (c: Criminal) =>
    `${c.firstName}${c.middleName ? ' ' + c.middleName : ''} ${c.lastName}`;

  const capturedCount = Object.keys(fingerprints).length;
  const completionPct = Math.round((capturedCount / 10) * 100);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoadingPage(true);

      const [crimRes, fpRes] = await Promise.all([
        fetch(`/api/criminals/${criminalId}`),
        fetch(`/api/criminals/${criminalId}/fingerprints`),
      ]);

      const crimData = await crimRes.json();
      if (crimData.success) setCriminal(crimData.data);

      const fpData = await fpRes.json();
      if (fpData.success) {
        // Build a lookup by fingerType (stored in title field)
        const lookup: Record<string, FingerprintRecord> = {};
        (fpData.data as FingerprintRecord[]).forEach((fp) => {
          lookup[fp.title] = fp;
        });
        setFingerprints(lookup);
      }
    } catch (err) {
      console.error('Error loading fingerprint page:', err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoadingPage(false);
    }
  }, [criminalId, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Upload handler ────────────────────────────────────────────────────────

  const handleFileChange = async (
    fingerType: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected after deletion
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (JPG, PNG, etc.)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('File must be under 5 MB', 'error');
      return;
    }

    try {
      setUploading((prev) => ({ ...prev, [fingerType]: true }));

      // 1. Upload file to storage
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        showToast(uploadData.error || 'Upload failed', 'error');
        return;
      }

      const { url, filename, size, mimeType } = uploadData.data;

      // 2. Save fingerprint record
      const saveRes = await fetch(`/api/criminals/${criminalId}/fingerprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerType,
          fileUrl: url,
          fileName: filename,
          fileSize: size,
          mimeType,
          quality: null,
          deviceInfo: 'Manual upload',
        }),
      });

      const saveData = await saveRes.json();

      if (saveData.success) {
        setFingerprints((prev) => ({
          ...prev,
          [fingerType]: saveData.data,
        }));
        showToast(
          saveData.isUpdate
            ? `${FINGER_LABEL_MAP[fingerType]} updated`
            : `${FINGER_LABEL_MAP[fingerType]} saved`,
          'success'
        );
        setSelectedFinger(fingerType);
      } else {
        showToast(saveData.error || 'Failed to save fingerprint', 'error');
      }
    } catch (err) {
      console.error('Fingerprint upload error:', err);
      showToast('An error occurred during upload', 'error');
    } finally {
      setUploading((prev) => ({ ...prev, [fingerType]: false }));
    }
  };

  // ─── Delete handler ────────────────────────────────────────────────────────

  const handleDelete = async (fingerType: string) => {
    const fp = fingerprints[fingerType];
    if (!fp) return;
    if (!confirm(`Delete ${FINGER_LABEL_MAP[fingerType]} fingerprint? This cannot be undone.`)) return;

    try {
      setDeleting((prev) => ({ ...prev, [fingerType]: true }));

      const res = await fetch(
        `/api/criminals/${criminalId}/fingerprints/${fp.id}`,
        { method: 'DELETE' }
      );
      const data = await res.json();

      if (data.success) {
        setFingerprints((prev) => {
          const next = { ...prev };
          delete next[fingerType];
          return next;
        });
        if (selectedFinger === fingerType) setSelectedFinger(null);
        showToast(`${FINGER_LABEL_MAP[fingerType]} deleted`, 'success');
      } else {
        showToast(data.error || 'Failed to delete', 'error');
      }
    } catch (err) {
      console.error('Delete fingerprint error:', err);
      showToast('An error occurred', 'error');
    } finally {
      setDeleting((prev) => ({ ...prev, [fingerType]: false }));
    }
  };

  // ─── Render helpers ────────────────────────────────────────────────────────

  const renderHandGrid = (hand: 'right' | 'left') => {
    const fingers = FINGER_SLOTS.filter((f) => f.hand === hand);
    const handLabel = hand === 'right' ? 'RIGHT HAND' : 'LEFT HAND';

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">
          {handLabel}
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {fingers.map((slot) => {
            const captured = fingerprints[slot.key];
            const isUploading = uploading[slot.key];
            const isDeleting  = deleting[slot.key];
            const isSelected  = selectedFinger === slot.key;
            const busy        = isUploading || isDeleting;

            return (
              <div key={slot.key} className="flex flex-col items-center gap-2">
                {/* Finger tile */}
                <button
                  type="button"
                  onClick={() => setSelectedFinger(isSelected ? null : slot.key)}
                  disabled={busy}
                  title={FINGER_LABEL_MAP[slot.key]}
                  className={`
                    relative w-full aspect-square rounded-xl border-2 transition-all duration-200 overflow-hidden
                    flex items-center justify-center group
                    ${captured
                      ? isSelected
                        ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                        : 'border-green-400 dark:border-green-500 hover:border-green-500'
                      : isSelected
                        ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-gray-50 dark:bg-gray-900/40'
                    }
                    disabled:opacity-60 disabled:cursor-not-allowed
                  `}
                >
                  {busy ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  ) : captured ? (
                    <>
                      <img
                        src={captured.fileUrl}
                        alt={FINGER_LABEL_MAP[slot.key]}
                        className="w-full h-full object-cover"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-300 dark:text-gray-600">
                      {/* Simplified finger shape SVG */}
                      <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
                        <rect x="6" y="8" width="12" height="20" rx="6" fill="currentColor" />
                        <rect x="8" y="0" width="8" height="14" rx="4" fill="currentColor" />
                      </svg>
                    </div>
                  )}

                  {/* Captured badge */}
                  {captured && !busy && (
                    <span className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full border border-white dark:border-gray-800" />
                  )}
                </button>

                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center leading-tight">
                  {slot.label}
                </span>

                {/* Upload / Re-capture button */}
                <label
                  className={`
                    inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors
                    ${captured
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800'
                      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                    }
                    ${busy ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                  `}
                  title={captured ? 'Re-capture' : 'Upload'}
                >
                  {isUploading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : captured ? (
                    <RotateCcw className="w-3 h-3" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                  {captured ? 'Redo' : 'Add'}
                  <input
                    ref={(el) => { fileInputRefs.current[slot.key] = el; }}
                    type="file"
                    accept="image/*"
                    disabled={busy}
                    onChange={(e) => handleFileChange(slot.key, e)}
                    className="hidden"
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loadingPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading fingerprint data...</p>
      </div>
    );
  }

  if (!criminal) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Criminal record not found.</p>
        <Link
          href="/dashboard/criminals"
          className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to records
        </Link>
      </div>
    );
  }

  // ─── Selected finger detail ───────────────────────────────────────────────

  const selectedRecord = selectedFinger ? fingerprints[selectedFinger] : null;
  const selectedMeta = (() => {
    if (!selectedRecord?.description) return null;
    try { return JSON.parse(selectedRecord.description); } catch { return null; }
  })();

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {toast.msg}
        </div>
      )}

      {/* ── Image lightbox ── */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewUrl}
              alt="Fingerprint preview"
              className="w-full rounded-xl shadow-2xl object-contain max-h-[80vh]"
            />
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/criminals/${criminalId}`}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
            Fingerprint Registry
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {getFullName(criminal)}
            {criminal.Station && (
              <span className="ml-2 text-gray-400">· {criminal.Station.name}</span>
            )}
          </p>
        </div>

        {/* Progress badge */}
        <div className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
          ${capturedCount === 10
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : capturedCount >= 6
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
          }
        `}>
          {capturedCount === 10 && <CheckCircle className="w-4 h-4" />}
          {capturedCount}/10 captured
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Fingerprint Completion
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {completionPct}%
          </span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              completionPct === 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {10 - capturedCount > 0
              ? `${10 - capturedCount} finger${10 - capturedCount !== 1 ? 's' : ''} remaining`
              : 'All 10 fingerprints captured — profile complete'}
          </p>
          {capturedCount === 10 && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Complete
            </span>
          )}
        </div>
      </div>

      {/* ── Instruction banner ── */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <span className="font-semibold">How to capture: </span>
          Click <strong>Add</strong> under any finger to upload a scanned fingerprint image (JPG/PNG, max 5 MB).
          Click the finger tile to view details. Use <strong>Redo</strong> to replace an existing print.
        </div>
      </div>

      {/* ── Two-column layout: hands + detail panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left: hand grids */}
        <div className="xl:col-span-2 space-y-4">
          {renderHandGrid('right')}
          {renderHandGrid('left')}
        </div>

        {/* Right: detail panel */}
        <div className="space-y-4">

          {/* Detail card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 min-h-64">
            {selectedFinger ? (
              selectedRecord ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {FINGER_LABEL_MAP[selectedFinger]}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      <CheckCircle className="w-3 h-3" /> Captured
                    </span>
                  </div>

                  {/* Fingerprint image */}
                  <div
                    className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 cursor-pointer group"
                    onClick={() => setPreviewUrl(selectedRecord.fileUrl)}
                  >
                    <img
                      src={selectedRecord.fileUrl}
                      alt={FINGER_LABEL_MAP[selectedFinger]}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Eye className="w-5 h-5 text-white" />
                      <span className="text-white text-sm font-medium">View full size</span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <dl className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">File</dt>
                      <dd className="text-gray-900 dark:text-white font-medium truncate max-w-[140px]" title={selectedRecord.fileName}>
                        {selectedRecord.fileName}
                      </dd>
                    </div>
                    {selectedRecord.fileSize && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Size</dt>
                        <dd className="text-gray-900 dark:text-white font-medium">
                          {(selectedRecord.fileSize / 1024).toFixed(1)} KB
                        </dd>
                      </div>
                    )}
                    {selectedMeta?.capturedAt && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Captured</dt>
                        <dd className="text-gray-900 dark:text-white font-medium">
                          {new Date(selectedMeta.capturedAt).toLocaleDateString('en-KE', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </dd>
                      </div>
                    )}
                    {selectedMeta?.quality != null && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Quality</dt>
                        <dd className={`font-medium ${
                          selectedMeta.quality >= 70 ? 'text-green-600 dark:text-green-400'
                          : selectedMeta.quality >= 40 ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                        }`}>
                          {selectedMeta.quality}/100
                        </dd>
                      </div>
                    )}
                  </dl>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-medium cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                      <RotateCcw className="w-3.5 h-3.5" />
                      Re-capture
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(selectedFinger, e)}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => handleDelete(selectedFinger)}
                      disabled={deleting[selectedFinger]}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                    >
                      {deleting[selectedFinger] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                /* Finger selected but not yet captured */
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                      {FINGER_LABEL_MAP[selectedFinger]}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      No fingerprint captured yet
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors">
                    <Camera className="w-4 h-4" />
                    Upload Fingerprint
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(selectedFinger, e)}
                      className="hidden"
                    />
                  </label>
                </div>
              )
            ) : (
              /* No finger selected */
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <svg width="28" height="36" viewBox="0 0 28 36" fill="none" className="text-gray-400">
                    <rect x="8" y="10" width="12" height="22" rx="6" fill="currentColor" />
                    <rect x="10" y="0" width="8" height="16" rx="4" fill="currentColor" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a finger from the grids to see details
                </p>
              </div>
            )}
          </div>

          {/* Summary card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
              Capture Summary
            </h3>
            <div className="space-y-2">
              {FINGER_SLOTS.map((slot) => (
                <div
                  key={slot.key}
                  onClick={() => setSelectedFinger(slot.key)}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm
                    ${selectedFinger === slot.key
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }
                  `}
                >
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {FINGER_LABEL_MAP[slot.key]}
                  </span>
                  {fingerprints[slot.key] ? (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Pending</span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Back to profile ── */}
      <div className="flex justify-end">
        <Link
          href={`/dashboard/criminals/${criminalId}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Save className="w-4 h-4" />
          Back to Criminal Profile
        </Link>
      </div>

    </div>
  );
}