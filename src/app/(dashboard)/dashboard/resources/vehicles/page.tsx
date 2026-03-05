// src/app/(dashboard)/dashboard/resources/vehicles/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Car, Plus, Search, Filter, Edit, Trash2,
  CheckCircle, XCircle, AlertTriangle, Wrench,
  RefreshCw, ChevronLeft, ChevronRight, X, Save,
  FileText, Download, FileSpreadsheet, FileJson,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ── Types ─────────────────────────────────────────────────────────────────────

type VehicleStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'DECOMMISSIONED';
type VehicleType   = 'PATROL_CAR' | 'PICKUP' | 'VAN' | 'MOTORCYCLE' | 'LAND_CRUISER' | 'ARMOURED' | 'OTHER';

interface Officer {
  id: string;
  name: string;
  badgeNumber: string;
  role: string;
  stationId?: string;
}

interface Vehicle {
  id:           string;
  registration: string;
  make:         string;
  model:        string;
  year:         number;
  type:         VehicleType;
  status:       VehicleStatus;
  stationId?:   string;
  stationName?: string;
  assignedToId?: string;
  assignedToName?: string;
  mileage?:     number;
  fuelType?:    string;
  color?:       string;
  notes?:       string;
  lastService?: string;
  nextService?: string;
}

interface CurrentUser { id: string; role: string; stationId?: string; name?: string; }

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<VehicleStatus, { label: string; color: string; bg: string; icon: React.ComponentType<any> }> = {
  AVAILABLE:      { label: 'Available',      color: 'text-green-700 dark:text-green-400',  bg: 'bg-green-100 dark:bg-green-900/30',  icon: CheckCircle },
  IN_USE:         { label: 'In Use',         color: 'text-blue-700 dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-900/30',    icon: Car },
  MAINTENANCE:    { label: 'Maintenance',    color: 'text-amber-700 dark:text-amber-400',  bg: 'bg-amber-100 dark:bg-amber-900/30',  icon: Wrench },
  DECOMMISSIONED: { label: 'Decommissioned', color: 'text-red-700 dark:text-red-400',      bg: 'bg-red-100 dark:bg-red-900/30',      icon: XCircle },
};

const TYPE_LABELS: Record<VehicleType, string> = {
  PATROL_CAR: 'Patrol Car', PICKUP: 'Pickup', VAN: 'Van',
  MOTORCYCLE: 'Motorcycle', LAND_CRUISER: 'Land Cruiser', ARMOURED: 'Armoured', OTHER: 'Other',
};

const STORAGE_KEY = 'police_vehicles';

function loadVehicles(): Vehicle[] {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveVehicles(v: Vehicle[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const [vehicles,     setVehicles]    = useState<Vehicle[]>([]);
  const [officers,     setOfficers]    = useState<Officer[]>([]);
  const [currentUser,  setCurrentUser] = useState<CurrentUser | null>(null);
  const [search,       setSearch]      = useState('');
  const [statusFilter, setStatusFilter]= useState<VehicleStatus | ''>('');
  const [typeFilter,   setTypeFilter]  = useState<VehicleType | ''>('');
  const [showFilters,  setShowFilters] = useState(false);
  const [showModal,    setShowModal]   = useState(false);
  const [editVehicle,  setEditVehicle] = useState<Partial<Vehicle> | null>(null);
  const [saving,       setSaving]      = useState(false);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Load current user
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.success) setCurrentUser(d.user); });
    setVehicles(loadVehicles());
  }, []);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load officers when modal opens
  useEffect(() => {
    if (showModal) {
      loadOfficers();
    }
  }, [showModal]);

  const loadOfficers = async () => {
    setLoadingOfficers(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '1000');
      
      if (currentUser && !['SUPER_ADMIN', 'ADMIN'].includes(currentUser.role) && currentUser.stationId) {
        params.set('stationId', currentUser.stationId);
      }
      
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      
      if (data.success) {
        const activeOfficers = data.data.filter((o: any) => o.isActive);
        setOfficers(activeOfficers);
      }
    } catch (error) {
      console.error('Failed to load officers:', error);
    } finally {
      setLoadingOfficers(false);
    }
  };

  const canManage = currentUser && ['SUPER_ADMIN','ADMIN','STATION_COMMANDER'].includes(currentUser.role);

  const filtered = vehicles.filter(v => {
    const matchSearch = !search || [
      v.registration, 
      v.make, 
      v.model, 
      v.assignedToName,
      v.registration
    ].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    
    const matchStatus = !statusFilter || v.status === statusFilter;
    const matchType   = !typeFilter   || v.type   === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  // ── Export Functions ─────────────────────────────────────────────────────

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-KE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatNumber = (num?: number) => {
    return num ? num.toLocaleString() : '—';
  };

  const getStationInfo = () => {
    return {
      name: 'KENYA POLICE SERVICE',
      station: currentUser?.stationId ? 'Station Name' : 'HEADQUARTERS',
      address: 'P.O. Box 30083 - 00100, Nairobi',
      tel: '020-222222',
      email: 'info@police.go.ke'
    };
  };

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const station = getStationInfo();
      const currentDate = new Date().toLocaleDateString('en-KE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Add Letterhead
      doc.setFillColor(0, 51, 102);
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(station.name, 105, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('VEHICLE FLEET INVENTORY REPORT', 105, 25, { align: 'center' });

      // Add report metadata
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Generated by: ${currentUser?.name || 'Unknown'}`, 14, 40);
      doc.text(`Date: ${currentDate}`, 14, 45);
      doc.text(`Total Vehicles: ${filtered.length}`, 14, 50);

      // Filter information
      let filterInfo = [];
      if (statusFilter) filterInfo.push(`Status: ${STATUS_CFG[statusFilter].label}`);
      if (typeFilter) filterInfo.push(`Type: ${TYPE_LABELS[typeFilter]}`);
      if (filterInfo.length > 0) {
        doc.text(`Filters: ${filterInfo.join(' • ')}`, 14, 55);
      }

      // Prepare table data
      const tableData = filtered.map(v => [
        v.registration,
        `${v.make} ${v.model}`,
        v.year.toString(),
        TYPE_LABELS[v.type],
        STATUS_CFG[v.status].label,
        v.assignedToName || '—',
        formatNumber(v.mileage),
        v.fuelType || '—',
        v.color || '—',
        formatDate(v.lastService),
        formatDate(v.nextService)
      ]);

      // Add table
      autoTable(doc, {
        startY: 65,
        head: [['Reg No.', 'Make/Model', 'Year', 'Type', 'Status', 'Assigned To', 'Mileage', 'Fuel', 'Color', 'Last Service', 'Next Service']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 25 },
          2: { cellWidth: 12 },
          3: { cellWidth: 18 },
          4: { cellWidth: 18 },
          5: { cellWidth: 25 },
          6: { cellWidth: 15 },
          7: { cellWidth: 12 },
          8: { cellWidth: 12 },
          9: { cellWidth: 18 },
          10: { cellWidth: 18 }
        }
      });

      // Add summary at the bottom
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      // Status summary
      const statusCounts = Object.keys(STATUS_CFG).map(status => {
        const count = vehicles.filter(v => v.status === status).length;
        return `${STATUS_CFG[status as VehicleStatus].label}: ${count}`;
      });

      doc.setFontSize(9);
      doc.text('Status Summary:', 14, finalY);
      doc.text(statusCounts.join('  •  '), 14, finalY + 5);

      // Add footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('This is a computer generated report. No signature required.', 105, 280, { align: 'center' });

      // Save PDF
      doc.save(`vehicles-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const generateCSV = () => {
    try {
      const headers = ['Registration', 'Make', 'Model', 'Year', 'Type', 'Status', 
                       'Assigned To', 'Mileage (km)', 'Fuel Type', 'Color', 'Last Service', 'Next Service', 'Notes'];
      
      const rows = filtered.map(v => [
        v.registration,
        v.make,
        v.model,
        v.year.toString(),
        TYPE_LABELS[v.type],
        STATUS_CFG[v.status].label,
        v.assignedToName || '',
        v.mileage?.toString() || '',
        v.fuelType || '',
        v.color || '',
        v.lastService || '',
        v.nextService || '',
        v.notes || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `vehicles-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating CSV:', error);
      alert('Failed to generate CSV. Please try again.');
    }
  };

  const generateExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Main inventory sheet
      const mainData = [
        ['KENYA POLICE SERVICE - VEHICLE FLEET INVENTORY REPORT'],
        [`Generated by: ${currentUser?.name || 'Unknown'}`],
        [`Date: ${new Date().toLocaleString('en-KE')}`],
        [`Total Vehicles: ${filtered.length}`],
        [],
        ['Registration', 'Make', 'Model', 'Year', 'Type', 'Status', 
         'Assigned To', 'Mileage (km)', 'Fuel Type', 'Color', 'Last Service', 'Next Service', 'Notes'],
        ...filtered.map(v => [
          v.registration,
          v.make,
          v.model,
          v.year,
          TYPE_LABELS[v.type],
          STATUS_CFG[v.status].label,
          v.assignedToName || '',
          v.mileage || '',
          v.fuelType || '',
          v.color || '',
          v.lastService || '',
          v.nextService || '',
          v.notes || ''
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(mainData);

      ws['!cols'] = [
        { wch: 15 }, // Registration
        { wch: 12 }, // Make
        { wch: 12 }, // Model
        { wch: 8 },  // Year
        { wch: 15 }, // Type
        { wch: 12 }, // Status
        { wch: 25 }, // Assigned To
        { wch: 12 }, // Mileage
        { wch: 10 }, // Fuel Type
        { wch: 10 }, // Color
        { wch: 12 }, // Last Service
        { wch: 12 }, // Next Service
        { wch: 30 }, // Notes
      ];

      // Summary sheet
      const summaryData = [
        ['VEHICLE FLEET SUMMARY'],
        [],
        ['Status Summary'],
        ...Object.entries(STATUS_CFG).map(([status, cfg]) => [
          cfg.label,
          vehicles.filter(v => v.status === status).length
        ]),
        [],
        ['Type Summary'],
        ...Object.entries(TYPE_LABELS).map(([type, label]) => [
          label,
          vehicles.filter(v => v.type === type).length
        ]),
        [],
        ['Assigned Vehicles'],
        ['Officer Name', 'Registration', 'Make/Model', 'Type', 'Status'],
        ...filtered
          .filter(v => v.assignedToName)
          .map(v => [
            v.assignedToName,
            v.registration,
            `${v.make} ${v.model}`,
            TYPE_LABELS[v.type],
            STATUS_CFG[v.status].label
          ]),
        [],
        ['Service Due Soon'],
        ['Registration', 'Make/Model', 'Next Service', 'Days Left'],
        ...filtered
          .filter(v => v.nextService)
          .map(v => {
            const daysLeft = v.nextService ? 
              Math.ceil((new Date(v.nextService).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
            return [
              v.registration,
              `${v.make} ${v.model}`,
              formatDate(v.nextService),
              daysLeft && daysLeft > 0 ? `${daysLeft} days` : 'Overdue'
            ];
          })
          .filter(v => v[3] !== 'Overdue' || true)
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

      XLSX.utils.book_append_sheet(wb, ws, 'Vehicle Inventory');
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      XLSX.writeFile(wb, `vehicles-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Failed to generate Excel file. Please try again.');
    }
  };

  const openAdd  = () => { 
    setEditVehicle({ 
      status: 'AVAILABLE', 
      type: 'PATROL_CAR', 
      year: new Date().getFullYear() 
    }); 
    setShowModal(true); 
  };
  
  const openEdit = (v: Vehicle) => { 
    setEditVehicle({ ...v }); 
    setShowModal(true); 
  };

  const handleSave = () => {
    if (!editVehicle?.registration || !editVehicle.make || !editVehicle.model) {
      alert('Registration, make and model are required');
      return;
    }
    
    setSaving(true);
    
    let assignedToName = editVehicle.assignedToName;
    if (editVehicle.assignedToId && !assignedToName) {
      const officer = officers.find(o => o.id === editVehicle.assignedToId);
      assignedToName = officer ? `${officer.name} (${officer.badgeNumber})` : undefined;
    }
    
    const entry: Vehicle = {
      id:             editVehicle.id || `v-${Date.now()}`,
      registration:   editVehicle.registration!,
      make:           editVehicle.make!,
      model:          editVehicle.model!,
      year:           editVehicle.year || new Date().getFullYear(),
      type:           editVehicle.type || 'PATROL_CAR',
      status:         editVehicle.status || 'AVAILABLE',
      assignedToId:   editVehicle.assignedToId,
      assignedToName: assignedToName,
      mileage:        editVehicle.mileage,
      fuelType:       editVehicle.fuelType,
      color:          editVehicle.color,
      notes:          editVehicle.notes,
      lastService:    editVehicle.lastService,
      nextService:    editVehicle.nextService,
    };
    
    const updated = editVehicle.id
      ? vehicles.map(v => v.id === entry.id ? entry : v)
      : [...vehicles, entry];
    
    saveVehicles(updated);
    setVehicles(updated);
    setShowModal(false);
    setEditVehicle(null);
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this vehicle record?')) return;
    const updated = vehicles.filter(v => v.id !== id);
    saveVehicles(updated);
    setVehicles(updated);
  };

  const counts = Object.keys(STATUS_CFG).reduce<Record<string, number>>((acc, s) => {
    acc[s] = vehicles.filter(v => v.status === s).length;
    return acc;
  }, {});

  const availableOfficers = officers.filter(o => {
    if (currentUser && !['SUPER_ADMIN', 'ADMIN'].includes(currentUser.role) && currentUser.stationId) {
      return o.stationId === currentUser.stationId;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vehicles</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} in fleet</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <button
                  onClick={() => { generatePDF(); setShowExportMenu(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 first:rounded-t-lg"
                >
                  <FileText className="w-4 h-4 text-red-600" />
                  <span>PDF Document</span>
                </button>
                <button
                  onClick={() => { generateCSV(); setShowExportMenu(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                >
                  <FileJson className="w-4 h-4 text-green-600" />
                  <span>CSV File</span>
                </button>
                <button
                  onClick={() => { generateExcel(); setShowExportMenu(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 last:rounded-b-lg"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Excel File</span>
                </button>
              </div>
            )}
          </div>

          {canManage && (
            <button onClick={openAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(STATUS_CFG) as [VehicleStatus, typeof STATUS_CFG[VehicleStatus]][]).map(([status, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button key={status} onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
              className={`rounded-xl p-4 text-left border transition-all ${cfg.bg} ${statusFilter === status ? 'ring-2 ring-blue-400' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className={`flex items-center gap-2 mb-2 ${cfg.color}`}>
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{cfg.label}</span>
              </div>
              <p className={`text-2xl font-bold ${cfg.color}`}>{counts[status] ?? 0}</p>
            </button>
          );
        })}
      </div>

      {/* Search & filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by registration, make, model, assigned officer…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Type</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as VehicleType | '')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="">All Types</option>
                {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as VehicleStatus | '')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Vehicle table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Car className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No vehicles found</h3>
            {canManage && <button onClick={openAdd} className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm">Add First Vehicle</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Registration</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Make / Model</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mileage</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned To</th>
                  <th className="px-5 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map(v => {
                  const sc = STATUS_CFG[v.status];
                  const SI = sc.icon;
                  return (
                    <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Car className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">{v.registration}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{v.make} {v.model}</p>
                        <p className="text-xs text-gray-500">{v.year} • {v.color ?? '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{TYPE_LABELS[v.type]}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                          <SI className="w-3 h-3" />{sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {v.mileage ? `${v.mileage.toLocaleString()} km` : '—'}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {v.assignedToName || '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {canManage && (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEdit(v)} className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(v.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && editVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editVehicle.id ? 'Edit Vehicle' : 'Add Vehicle'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditVehicle(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: 'Registration *', key: 'registration', type: 'text', placeholder: 'KAA 123A', span: 2 },
                { label: 'Make *',         key: 'make',         type: 'text', placeholder: 'Toyota' },
                { label: 'Model *',        key: 'model',        type: 'text', placeholder: 'Land Cruiser' },
                { label: 'Year',           key: 'year',         type: 'number', placeholder: '2020' },
                { label: 'Color',          key: 'color',        type: 'text', placeholder: 'White' },
                { label: 'Mileage (km)',   key: 'mileage',      type: 'number', placeholder: '50000' },
                { label: 'Fuel Type',      key: 'fuelType',     type: 'text', placeholder: 'Diesel' },
              ].map(f => (
                <div key={f.key} className={(f as any).span === 2 ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{f.label}</label>
                  <input 
                    type={f.type} 
                    value={(editVehicle as any)[f.key] ?? ''}
                    onChange={e => setEditVehicle(p => ({ 
                      ...p, 
                      [f.key]: f.type === 'number' ? parseInt(e.target.value) || undefined : e.target.value 
                    }))}
                    placeholder={(f as any).placeholder}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              {/* Assigned To dropdown */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Assigned Officer
                </label>
                <select
                  value={editVehicle.assignedToId || ''}
                  onChange={e => {
                    const officerId = e.target.value;
                    const officer = officers.find(o => o.id === officerId);
                    setEditVehicle(p => ({
                      ...p,
                      assignedToId: officerId || undefined,
                      assignedToName: officer ? `${officer.name} (${officer.badgeNumber})` : undefined
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Unassigned --</option>
                  {loadingOfficers ? (
                    <option value="" disabled>Loading officers...</option>
                  ) : (
                    availableOfficers.map(officer => (
                      <option key={officer.id} value={officer.id}>
                        {officer.name} ({officer.badgeNumber}) - {officer.role.replace(/_/g, ' ')}
                      </option>
                    ))
                  )}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {availableOfficers.length} active officer{availableOfficers.length !== 1 ? 's' : ''} available
                </p>
              </div>

              {/* Type and Status dropdowns */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                <select value={editVehicle.type ?? 'PATROL_CAR'}
                  onChange={e => setEditVehicle(p => ({ ...p, type: e.target.value as VehicleType }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                <select value={editVehicle.status ?? 'AVAILABLE'}
                  onChange={e => setEditVehicle(p => ({ ...p, status: e.target.value as VehicleStatus }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              {/* Service dates */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Last Service</label>
                <input 
                  type="date" 
                  value={editVehicle.lastService ?? ''}
                  onChange={e => setEditVehicle(p => ({ ...p, lastService: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Next Service</label>
                <input 
                  type="date" 
                  value={editVehicle.nextService ?? ''}
                  onChange={e => setEditVehicle(p => ({ ...p, nextService: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                />
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                <textarea 
                  value={editVehicle.notes ?? ''} 
                  rows={2}
                  onChange={e => setEditVehicle(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                  placeholder="Any additional notes about the vehicle..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => { setShowModal(false); setEditVehicle(null); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}