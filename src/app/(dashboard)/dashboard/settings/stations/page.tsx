// ============================================
// FILE: src/app/(dashboard)/settings/stations/page.tsx
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Trash2, Search, Building } from 'lucide-react';

interface Station {
  id: string;
  name: string;
  code: string;
  county: string;
  subCounty: string;
  address: string;
  phoneNumber: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/settings/stations');
      const data = await response.json();
      if (data.success) {
        setStations(data.stations);
      }
    } catch (error) {
      console.error('Failed to fetch stations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user can manage stations
  const canManageStations = currentUser?.role && 
    ['SUPER_ADMIN', 'STATION_COMMANDER'].includes(currentUser.role);

  const canEditStation = (stationId: string) => {
    if (currentUser?.role === 'SUPER_ADMIN') return true;
    if (currentUser?.role === 'STATION_COMMANDER' && currentUser?.stationId === stationId) {
      return true;
    }
    return false;
  };

  const filteredStations = stations.filter(station =>
    searchTerm
      ? station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.county.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-t-2 border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Police Stations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {canManageStations ? 'Manage police stations' : 'View police stations'}
          </p>
        </div>
        {currentUser?.role === 'SUPER_ADMIN' && (
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" />
            Add Station
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stations.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Stations</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600">
            {stations.filter(s => s.isActive).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Active Stations</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600">
            {new Set(stations.map(s => s.county)).size}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Counties Covered</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search stations by name, code, or county..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Stations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStations.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No stations found</p>
          </div>
        ) : (
          filteredStations.map((station) => (
            <div
              key={station.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Building className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {station.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Code: {station.code}
                    </p>
                  </div>
                </div>
                {station.isActive ? (
                  <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300 rounded">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300 rounded">
                    Inactive
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="text-gray-600 dark:text-gray-400">
                    <div>{station.county} County</div>
                    <div>{station.subCounty} Sub-County</div>
                    {station.address && <div className="text-xs mt-1">{station.address}</div>}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {station.phoneNumber && <div>Tel: {station.phoneNumber}</div>}
                  {station.email && <div>Email: {station.email}</div>}
                </div>
              </div>

              {canEditStation(station.id) && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition">
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {currentUser?.role === 'SUPER_ADMIN' && (
                    <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}