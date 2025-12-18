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
  Calendar,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  Fingerprint,
  Camera,
  File,
} from 'lucide-react';
import { getWantedStatusColor, getWantedStatusLabel } from '@/lib/constants/criminal';

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
  criminalHistory: any[];
  station: {
    id: string;
    name: string;
    code: string;
    county: string;
  };
  cases: any[];
  evidenceItems: any[];
  createdAt: string;
  updatedAt: string;
}

const EVIDENCE_ICONS = {
  PHOTO: Camera,
  FINGERPRINT: Fingerprint,
  DOCUMENT: FileText,
  OTHER: File,
};

export default function CriminalViewPage() {
  const params = useParams();
  const router = useRouter();
  const [criminal, setCriminal] = useState<Criminal | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchCriminal();
    }
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
    if (!confirm('Are you sure you want to delete this criminal record? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/criminals/${params.id}`, {
        method: 'DELETE',
      });

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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getEvidenceIcon = (type: string) => {
    return EVIDENCE_ICONS[type as keyof typeof EVIDENCE_ICONS] || File;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/criminals"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {getFullName()}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Criminal Record Details
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Status Alert */}
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
        {/* Left Column - Photo and Basic Info */}
        <div className="space-y-6">
          {/* Photo */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {criminal.photoUrl ? (
              <img
                src={criminal.photoUrl}
                alt={getFullName()}
                className="w-full aspect-square object-cover rounded-lg mb-4 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedImage(criminal.photoUrl || null)}
              />
            ) : (
              <div className="w-full aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                <User className="w-24 h-24 text-gray-400" />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getWantedStatusColor(
                    criminal.isWanted.toString()
                  )}`}
                >
                  {getWantedStatusLabel(criminal.isWanted)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Cases</span>
                <span className="font-medium">{criminal.cases.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Evidence Items</span>
                <span className="font-medium">{criminal.evidenceItems.length}</span>
              </div>
            </div>
          </div>

          {/* Station Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4">Station Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Station</p>
                <p className="font-medium">{criminal.station.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Code</p>
                <p className="font-medium">{criminal.station.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">County</p>
                <p className="font-medium">{criminal.station.county}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Detailed Information */}
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

          {/* Contact Information */}
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

          {/* Evidence Items */}
          {criminal.evidenceItems.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Fingerprint className="w-5 h-5" />
                  Evidence Items
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {criminal.evidenceItems.length} item{criminal.evidenceItems.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {criminal.evidenceItems.map((item: any) => {
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
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            {item.type}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(item.fileSize)}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </a>
                          <a
                            href={item.fileUrl}
                            download={item.fileName}
                            className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            Download
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
                {criminal.cases.map((caseItem: any) => (
                  <Link
                    key={caseItem.id}
                    href={`/dashboard/cases/${caseItem.id}`}
                    className="block border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{caseItem.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Case #{caseItem.caseNumber}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          caseItem.status === 'OPEN'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}
                      >
                        {caseItem.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
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

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
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