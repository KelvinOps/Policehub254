// src/components/forms/EditOBEntryForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, MapPin, Plus, Trash2, Save } from 'lucide-react';
import { IncidentCategory, IncidentStatus } from '@prisma/client';

interface WitnessInfo {
  name: string;
  contactNumber: string;
  idNumber?: string;
  address?: string;
  statement?: string;
}

interface SuspectInfo {
  name?: string;
  alias?: string[];
  description: string;
  lastSeenLocation?: string;
  lastSeenTime?: string;
  identifyingFeatures?: string[];
}

interface EditOBEntryFormProps {
  entry: any;
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditOBEntryForm({
  entry,
  user,
  onClose,
  onSuccess,
}: EditOBEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [witnesses, setWitnesses] = useState<WitnessInfo[]>([]);
  const [suspects, setSuspects] = useState<SuspectInfo[]>([]);
  const [formData, setFormData] = useState({
    incidentDate: '',
    category: '' as IncidentCategory,
    description: '',
    location: '',
    latitude: '',
    longitude: '',
    reportedBy: '',
    contactNumber: '',
    status: '' as IncidentStatus,
  });

  useEffect(() => {
    // Populate form with existing data
    if (entry) {
      const incidentDate = new Date(entry.incidentDate);
      const formattedDate = incidentDate.toISOString().slice(0, 16);

      setFormData({
        incidentDate: formattedDate,
        category: entry.category,
        description: entry.description,
        location: entry.location,
        latitude: entry.latitude?.toString() || '',
        longitude: entry.longitude?.toString() || '',
        reportedBy: entry.reportedBy,
        contactNumber: entry.contactNumber,
        status: entry.status,
      });

      // Load witnesses
      if (entry.witnesses?.witnesses) {
        setWitnesses(entry.witnesses.witnesses);
      }

      // Load suspects
      if (entry.suspects?.suspects) {
        setSuspects(entry.suspects.suspects);
      }
    }
  }, [entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/occurrence-book/${entry.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          witnesses: witnesses.length > 0 ? { witnesses } : null,
          suspects: suspects.length > 0 ? { suspects } : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to update OB entry');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addWitness = () => {
    setWitnesses([
      ...witnesses,
      { name: '', contactNumber: '', idNumber: '', address: '', statement: '' },
    ]);
  };

  const removeWitness = (index: number) => {
    setWitnesses(witnesses.filter((_, i) => i !== index));
  };

  const updateWitness = (index: number, field: keyof WitnessInfo, value: string) => {
    const updated = [...witnesses];
    updated[index] = { ...updated[index], [field]: value };
    setWitnesses(updated);
  };

  const addSuspect = () => {
    setSuspects([
      ...suspects,
      { description: '', lastSeenLocation: '', lastSeenTime: '' },
    ]);
  };

  const removeSuspect = (index: number) => {
    setSuspects(suspects.filter((_, i) => i !== index));
  };

  const updateSuspect = (index: number, field: keyof SuspectInfo, value: string) => {
    const updated = [...suspects];
    updated[index] = { ...updated[index], [field]: value };
    setSuspects(updated);
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get location. Please enter manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit OB Entry</h2>
              <p className="text-sm text-gray-600">OB Number: {entry.obNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Incident Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Incident Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Incident Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.incidentDate}
                  onChange={(e) =>
                    setFormData({ ...formData, incidentDate: e.target.value })
                  }
                  max={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as IncidentStatus,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="REPORTED">Reported</option>
                  <option value="UNDER_INVESTIGATION">Under Investigation</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                  <option value="TRANSFERRED">Transferred</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as IncidentCategory,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Category</option>
                <option value="THEFT">Theft</option>
                <option value="ROBBERY">Robbery</option>
                <option value="ASSAULT">Assault</option>
                <option value="MURDER">Murder</option>
                <option value="RAPE">Rape</option>
                <option value="DOMESTIC_VIOLENCE">Domestic Violence</option>
                <option value="FRAUD">Fraud</option>
                <option value="BURGLARY">Burglary</option>
                <option value="TRAFFIC_ACCIDENT">Traffic Accident</option>
                <option value="KIDNAPPING">Kidnapping</option>
                <option value="DRUG_RELATED">Drug Related</option>
                <option value="CYBERCRIME">Cybercrime</option>
                <option value="CORRUPTION">Corruption</option>
                <option value="MISSING_PERSON">Missing Person</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Provide detailed description of the incident..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="e.g., Tom Mboya Street, Nairobi CBD"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={getLocation}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  GPS
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData({ ...formData, latitude: e.target.value })
                  }
                  placeholder="e.g., -1.286389"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData({ ...formData, longitude: e.target.value })
                  }
                  placeholder="e.g., 36.817223"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Reporter Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Reporter Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reported By *
                </label>
                <input
                  type="text"
                  required
                  value={formData.reportedBy}
                  onChange={(e) =>
                    setFormData({ ...formData, reportedBy: e.target.value })
                  }
                  placeholder="Full name of reporter"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.contactNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, contactNumber: e.target.value })
                  }
                  placeholder="e.g., 0712345678"
                  pattern="[0-9+\-\s()]+"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Witnesses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Witnesses</h3>
              <button
                type="button"
                onClick={addWitness}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Witness
              </button>
            </div>

            {witnesses.map((witness, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Witness {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeWitness(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={witness.name}
                    onChange={(e) => updateWitness(index, 'name', e.target.value)}
                    placeholder="Full name"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    value={witness.contactNumber}
                    onChange={(e) => updateWitness(index, 'contactNumber', e.target.value)}
                    placeholder="Contact number"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <textarea
                  rows={2}
                  value={witness.statement}
                  onChange={(e) => updateWitness(index, 'statement', e.target.value)}
                  placeholder="Brief statement..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            ))}
          </div>

          {/* Suspects */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Suspects</h3>
              <button
                type="button"
                onClick={addSuspect}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Suspect
              </button>
            </div>

            {suspects.map((suspect, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Suspect {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSuspect(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  value={suspect.name}
                  onChange={(e) => updateSuspect(index, 'name', e.target.value)}
                  placeholder="Name (if known)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />

                <textarea
                  rows={2}
                  value={suspect.description}
                  onChange={(e) => updateSuspect(index, 'description', e.target.value)}
                  placeholder="Physical description, clothing, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={suspect.lastSeenLocation}
                    onChange={(e) => updateSuspect(index, 'lastSeenLocation', e.target.value)}
                    placeholder="Last seen location"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="datetime-local"
                    value={suspect.lastSeenTime}
                    onChange={(e) => updateSuspect(index, 'lastSeenTime', e.target.value)}
                    placeholder="Last seen time"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </form>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}