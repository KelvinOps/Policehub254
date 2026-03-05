// app/dashboard/settings/stations/page.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Plus, Search, Edit2, Trash2, MapPin, Phone, Mail,
  Building2, ChevronDown, X, Filter, MoreVertical,
  CheckCircle, XCircle
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────

interface Station {
  id: string;
  name: string;
  code: string;
  county: string;
  subCounty: string;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  latitude?: number | null;
  longitude?: number | null;
  commander?: string | null;
  capacity?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    User: number;
    Case: number;
    OccurrenceBook: number;
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
}

// ─── Utility Components ─────────────────────────────────────────────────

const StatusBadge = ({ isActive }: { isActive: boolean }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
    isActive 
      ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
      : "bg-gray-100 text-gray-600 border border-gray-200"
  }`}>
    {isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    {isActive ? "Active" : "Inactive"}
  </span>
);

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {/* Header skeleton */}
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
    </div>

    {/* Filters skeleton */}
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
    </div>

    {/* Table skeleton */}
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4">
            <div className="h-16 bg-gray-50 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Station Modal ─────────────────────────────────────────────────────

const StationModal = ({ 
  isOpen, 
  onClose, 
  station, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  station?: Station | null; 
  onSuccess: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    county: "",
    subCounty: "",
    address: "",
    phoneNumber: "",
    email: "",
    commander: "",
    capacity: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset form when modal opens/closes
  useEffect(() => {
    if (station) {
      setFormData({
        name: station.name || "",
        code: station.code || "",
        county: station.county || "",
        subCounty: station.subCounty || "",
        address: station.address || "",
        phoneNumber: station.phoneNumber || "",
        email: station.email || "",
        commander: station.commander || "",
        capacity: station.capacity?.toString() || "",
      });
    } else {
      setFormData({
        name: "",
        code: "",
        county: "",
        subCounty: "",
        address: "",
        phoneNumber: "",
        email: "",
        commander: "",
        capacity: "",
      });
    }
    setError("");
  }, [station, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = station 
        ? `/api/settings/stations/${station.id}` 
        : "/api/settings/stations";
      
      const method = station ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save station");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {station ? "Edit Station" : "Add New Station"}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Station Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Central Police Station"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Station Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., CPS001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    County <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.county}
                    onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Nairobi"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Sub-County <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subCounty}
                    onChange={(e) => setFormData({ ...formData, subCounty: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Central"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Kenyatta Avenue"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 020 222 2222"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., station@police.go.ke"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Station Commander
                  </label>
                  <input
                    type="text"
                    value={formData.commander}
                    onChange={(e) => setFormData({ ...formData, commander: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Chief Inspector John Doe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Capacity (officers)
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 100"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading ? "Saving..." : station ? "Update Station" : "Create Station"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [countyFilter, setCountyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 20,
  });

  // Fetch stations
  const fetchStations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(countyFilter && { county: countyFilter }),
        ...(statusFilter !== "all" && { isActive: (statusFilter === "active").toString() }),
      });

      const res = await fetch(`/api/settings/stations?${params}`);
      const data = await res.json();

      if (res.ok) {
        setStations(data.stations || []);
        setPagination({
          total: data.total || 0,
          page: data.page || 1,
          limit: data.limit || 20,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, [pagination.page, search, countyFilter, statusFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Get unique counties for filter
  const counties = [...new Set(stations.map(s => s.county))];

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this station?")) return;

    try {
      const res = await fetch(`/api/settings/stations/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchStations();
      }
    } catch (error) {
      console.error("Failed to delete station:", error);
    }
  };

  if (loading && stations.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Police Stations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all police stations and their details
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Station
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, code, or county..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* County Filter */}
          <select
            value={countyFilter}
            onChange={(e) => setCountyFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Counties</option>
            {counties.map(county => (
              <option key={county} value={county}>{county}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Stations List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Station
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commander
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stations.map((station) => (
                <tr key={station.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{station.name}</div>
                      <div className="text-xs text-gray-500">Code: {station.code}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-gray-900">{station.county}</div>
                        <div className="text-xs text-gray-500">{station.subCounty}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {station.phoneNumber && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Phone className="w-3 h-3" />
                          {station.phoneNumber}
                        </div>
                      )}
                      {station.email && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Mail className="w-3 h-3" />
                          {station.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{station.commander || "—"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge isActive={station.isActive} />
                  </td>
                  <td className="px-6 py-4">
                    {station._count && (
                      <div className="flex gap-2 text-xs">
                        <span title="Officers">{station._count.User} 👤</span>
                        <span title="Cases">{station._count.Case} 📋</span>
                        <span title="OB Entries">{station._count.OccurrenceBook} 📚</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingStation(station)}
                        className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(station.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {stations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm">No stations found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your filters or add a new station
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} stations
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page * pagination.limit >= pagination.total}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <StationModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchStations}
      />

      <StationModal
        isOpen={!!editingStation}
        onClose={() => setEditingStation(null)}
        station={editingStation}
        onSuccess={fetchStations}
      />
    </div>
  );
}