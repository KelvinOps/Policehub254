// src/app/(dashboard)/dashboard/occurrence-book/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  User,
  Phone,
  FileText,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Briefcase,
  Eye,
  Users,
  UserX,
} from 'lucide-react';
import { IncidentCategory, IncidentStatus } from '@prisma/client';
import {
  getCategoryColor,
  getStatusColor,
  getCategoryLabel,
  getStatusLabel,
} from '@/lib/constants/occurrence-book';

interface OBEntry {
  id: string;
  obNumber: string;
  incidentDate: string;
  reportedDate: string;
  category: IncidentCategory;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  status: IncidentStatus;
  reportedBy: string;
  contactNumber: string;
  evidenceFiles: string[];
  witnesses?: any;
  suspects?: any;
  station: {
    id: string;
    name: string;
    code: string;
    county: string;
    address: string;
    phoneNumber: string;
  };
  recordedBy: {
    id: string;
    name: string;
    badgeNumber: string;
    role: string;
    phoneNumber?: string;
  };
  case?: {
    id: string;
    caseNumber: string;
    title: string;
    status: string;
    priority: string;
    assignedTo?: {
      id: string;
      name: string;
      badgeNumber: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export default function ViewOBEntryPage() {
  const router = useRouter();
  const params = useParams();
  const [entry, setEntry] = useState<OBEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchEntry();
  }, [params.id]);

  const fetchEntry = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/occurrence-book/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setEntry(data.data);
      } else {
        alert(data.error || 'Failed to fetch entry');
        router.push('/dashboard/occurrence-book');
      }
    } catch (error) {
      console.error('Error fetching entry:', error);
      alert('Failed to load entry');
      router.push('/dashboard/occurrence-book');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this OB entry? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/occurrence-book/${params.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('OB entry deleted successfully');
        router.push('/dashboard/occurrence-book');
      } else {
        alert(data.error || 'Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canEdit = () => {
    if (!user || !entry) return false;
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];
    return (
      adminRoles.includes(user.role) ||
      entry.recordedBy.id === user.id ||
      entry.station.id === user.stationId
    );
  };

  const canDelete = () => {
    if (!user) return false;
    return ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'].includes(user.role);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Entry not found</h3>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/occurrence-book"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              OB Entry Details
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {entry.obNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canEdit() && (
            <Link
              href={`/dashboard/occurrence-book/${entry.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
          )}
          {canDelete() && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getCategoryColor(
                entry.category
              )}`}
            >
              {getCategoryLabel(entry.category)}
            </span>
            <span
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                entry.status
              )}`}
            >
              {getStatusLabel(entry.status)}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">OB Number</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {entry.obNumber}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Incident Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Description
                </label>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {entry.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location
                  </label>
                  <p className="text-gray-900 dark:text-white">{entry.location}</p>
                  {entry.latitude && entry.longitude && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      GPS: {entry.latitude.toFixed(6)}, {entry.longitude.toFixed(6)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Incident Date
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {formatDate(entry.incidentDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Reporter Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5" />
              Reporter Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Name
                </label>
                <p className="text-gray-900 dark:text-white">{entry.reportedBy}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Contact Number
                </label>
                <p className="text-gray-900 dark:text-white">{entry.contactNumber}</p>
              </div>
            </div>
          </div>

          {/* Witnesses */}
          {entry.witnesses && Array.isArray(entry.witnesses) && entry.witnesses.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Witnesses ({entry.witnesses.length})
              </h2>

              <div className="space-y-4">
                {entry.witnesses.map((witness: any, index: number) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Name
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {witness.name}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Contact
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {witness.contactNumber}
                        </p>
                      </div>
                      {witness.statement && (
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Statement
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {witness.statement}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suspects */}
          {entry.suspects && Array.isArray(entry.suspects) && entry.suspects.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <UserX className="w-5 h-5" />
                Suspects ({entry.suspects.length})
              </h2>

              <div className="space-y-4">
                {entry.suspects.map((suspect: any, index: number) => (
                  <div
                    key={index}
                    className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Name
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {suspect.name}
                        </p>
                      </div>
                      {suspect.description && (
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Description
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {suspect.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Station Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Station
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-gray-900 dark:text-white">{entry.station.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Code</p>
                <p className="text-gray-900 dark:text-white">{entry.station.code}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">County</p>
                <p className="text-gray-900 dark:text-white">{entry.station.county}</p>
              </div>
            </div>
          </div>

          {/* Recorded By */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Recorded By
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Officer</p>
                <p className="text-gray-900 dark:text-white">{entry.recordedBy.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Badge Number</p>
                <p className="text-gray-900 dark:text-white">{entry.recordedBy.badgeNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</p>
                <p className="text-gray-900 dark:text-white">{entry.recordedBy.role}</p>
              </div>
            </div>
          </div>

          {/* Case Info */}
          {entry.case && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Associated Case
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Case Number</p>
                  <Link
                    href={`/dashboard/cases/${entry.case.id}`}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {entry.case.caseNumber}
                  </Link>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Title</p>
                  <p className="text-gray-900 dark:text-white">{entry.case.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                  <p className="text-gray-900 dark:text-white">{entry.case.status}</p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Timeline
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reported</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {formatDate(entry.reportedDate)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {formatDate(entry.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {formatDate(entry.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}