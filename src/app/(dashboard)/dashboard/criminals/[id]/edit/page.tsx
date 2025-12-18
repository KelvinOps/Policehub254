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

const EVIDENCE_TYPES = [
  { value: 'PHOTO', label: 'Photograph', icon: Camera },
  { value: 'FINGERPRINT', label: 'Fingerprint', icon: Fingerprint },
  { value: 'DOCUMENT', label: 'Document', icon: FileText },
  { value: 'OTHER', label: 'Other Evidence', icon: File },
] as const;

export default function EditCriminalPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [aliases, setAliases] = useState<string[]>([]);
  const [currentAlias, setCurrentAlias] = useState('');
  
  const [existingEvidence, setExistingEvidence] = useState<EvidenceItem[]>([]);
  const [newEvidence, setNewEvidence] = useState<EvidenceItem[]>([]);
  const [deletedEvidenceIds, setDeletedEvidenceIds] = useState<string[]>([]);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [currentEvidence, setCurrentEvidence] = useState<Partial<EvidenceItem>>({
    type: 'PHOTO',
    title: '',
    description: '',
  });
  const [evidencePreview, setEvidencePreview] = useState<string>('');

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
    if (params.id) {
      fetchCriminalData(params.id as string);
    }
  }, [params.id]);

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

  const fetchCriminalData = async (id: string) => {
    try {
      setFetchingData(true);
      const response = await fetch(`/api/criminals/${id}`);
      const data = await response.json();

      if (data.success) {
        const criminal = data.data;
        setFormData({
          firstName: criminal.firstName,
          middleName: criminal.middleName || '',
          lastName: criminal.lastName,
          dateOfBirth: criminal.dateOfBirth
            ? new Date(criminal.dateOfBirth).toISOString().split('T')[0]
            : '',
          gender: criminal.gender,
          nationality: criminal.nationality,
          idNumber: criminal.idNumber || '',
          phoneNumber: criminal.phoneNumber || '',
          address: criminal.address || '',
          lastKnownLocation: criminal.lastKnownLocation || '',
          isWanted: criminal.isWanted,
          wantedReason: criminal.wantedReason || '',
          stationId: criminal.stationId,
          photoUrl: criminal.photoUrl || '',
        });
        setAliases(criminal.alias || []);
        setExistingEvidence(criminal.evidenceItems || []);
      } else {
        alert('Criminal not found');
        router.push('/dashboard/criminals');
      }
    } catch (error) {
      console.error('Error fetching criminal:', error);
      alert('Failed to load criminal data');
    } finally {
      setFetchingData(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
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

  const removeAlias = (alias: string) => {
    setAliases(aliases.filter((a) => a !== alias));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed for criminal photos');
      return;
    }

    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({ ...prev, photoUrl: data.url }));
        alert('Photo uploaded successfully');
      } else {
        alert(data.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
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
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (data.success) {
        setCurrentEvidence((prev) => ({
          ...prev,
          fileUrl: data.url,
          fileName: data.filename,
          fileSize: data.size,
          mimeType: data.type,
        }));
        
        if (file.type.startsWith('image/')) {
          setEvidencePreview(data.url);
        }
        
        if (!currentEvidence.title) {
          setCurrentEvidence((prev) => ({ ...prev, title: file.name }));
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

  const addEvidence = () => {
    if (!currentEvidence.fileUrl || !currentEvidence.title) {
      alert('Please upload a file and provide a title');
      return;
    }

    const evidence: EvidenceItem = {
      type: currentEvidence.type as EvidenceItem['type'],
      title: currentEvidence.title,
      description: currentEvidence.description || '',
      fileUrl: currentEvidence.fileUrl,
      fileName: currentEvidence.fileName || '',
      fileSize: currentEvidence.fileSize || 0,
      mimeType: currentEvidence.mimeType || '',
    };

    setNewEvidence((prev) => [...prev, evidence]);
    setCurrentEvidence({ type: 'PHOTO', title: '', description: '' });
    setEvidencePreview('');
    setShowEvidenceForm(false);
  };

  const removeNewEvidence = (index: number) => {
    setNewEvidence((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingEvidence = (id: string) => {
    if (confirm('Are you sure you want to delete this evidence? This action cannot be undone.')) {
      setDeletedEvidenceIds((prev) => [...prev, id]);
      setExistingEvidence((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const cancelEvidenceForm = () => {
    setCurrentEvidence({ type: 'PHOTO', title: '', description: '' });
    setEvidencePreview('');
    setShowEvidenceForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.gender || !formData.stationId) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const updateResponse = await fetch(`/api/criminals/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, alias: aliases }),
      });

      const updateData = await updateResponse.json();

      if (!updateData.success) {
        alert(updateData.error || 'Failed to update record');
        return;
      }

      if (deletedEvidenceIds.length > 0) {
        for (const evidenceId of deletedEvidenceIds) {
          await fetch(`/api/criminals/${params.id}/evidence/${evidenceId}`, {
            method: 'DELETE',
          });
        }
      }

      if (newEvidence.length > 0) {
        await fetch(`/api/criminals/${params.id}/evidence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ evidenceItems: newEvidence }),
        });
      }

      alert('Criminal record updated successfully');
      router.push(`/dashboard/criminals/${params.id}`);
    } catch (error) {
      console.error('Error updating criminal:', error);
      alert('Failed to update record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getEvidenceIcon = (type: string) => {
    const evidenceType = EVIDENCE_TYPES.find(t => t.value === type);
    return evidenceType ? evidenceType.icon : File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const allEvidence = [...existingEvidence, ...newEvidence];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/criminals/${params.id}`}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Edit Criminal Record
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Update criminal information and evidence
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Criminal Photo Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Criminal Photo
          </h2>
          <div className="flex items-start gap-6">
            {formData.photoUrl ? (
              <div className="relative">
                <img
                  src={formData.photoUrl}
                  alt="Criminal"
                  className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                  className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                >
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
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {formData.photoUrl ? 'Change Photo' : 'Upload Photo'}
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Max 5MB. Supports: JPG, PNG, GIF, WebP
              </p>
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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

          {/* Aliases Section */}
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

        {/* Location Information Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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

        {/* Evidence Management Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Fingerprint className="w-5 h-5" />
              Evidence & Documentation
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {allEvidence.length} item{allEvidence.length !== 1 ? 's' : ''}
            </span>
          </div>

          {!showEvidenceForm && (
            <button
              type="button"
              onClick={() => setShowEvidenceForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors mb-4"
            >
              <Plus className="w-4 h-4" />
              Add New Evidence
            </button>
          )}

          {/* Evidence Form */}
          {showEvidenceForm && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Add New Evidence</h3>
              
              <div className="space-y-4">
                {/* Evidence Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Evidence Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {EVIDENCE_TYPES.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCurrentEvidence(prev => ({ ...prev, type: value as any }))}
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

                {/* Evidence Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentEvidence.title || ''}
                    onChange={(e) => setCurrentEvidence(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Mugshot - Front View, Left Fingerprint, ID Copy"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Evidence Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={currentEvidence.description || ''}
                    onChange={(e) => setCurrentEvidence(prev => ({ ...prev, description: e.target.value }))}
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

          {/* Evidence List */}
          {allEvidence.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                All Evidence
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {/* Existing Evidence */}
                {existingEvidence.map((item) => {
                  const Icon = getEvidenceIcon(item.type);
                  const isImage = item.mimeType?.startsWith('image/');
                  
                  return (
                    <div
                      key={item.id}
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
                                {formatFileSize(item.fileSize)}
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
                              onClick={() => item.id && removeExistingEvidence(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* New Evidence */}
                {newEvidence.map((item, index) => {
                  const Icon = getEvidenceIcon(item.type);
                  const isImage = item.mimeType?.startsWith('image/');
                  
                  return (
                    <div
                      key={`new-${index}`}
                      className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border-2 border-green-200 dark:border-green-800"
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
                                {formatFileSize(item.fileSize)}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                New
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
                              onClick={() => removeNewEvidence(index)}
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

        {/* Wanted Status Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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
            href={`/dashboard/criminals/${params.id}`}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || uploading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Update Record
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}