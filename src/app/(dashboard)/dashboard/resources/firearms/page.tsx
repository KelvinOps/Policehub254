// src/app/(dashboard)/dashboard/resources/firearms/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Shield, Plus, Search, Filter, Edit, Trash2,
  CheckCircle, XCircle, AlertTriangle, Lock, Save, X,
  FileText, Download, FileSpreadsheet, FileJson,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ── Types ─────────────────────────────────────────────────────────────────────

type FirearmStatus = 'SERVICEABLE' | 'ISSUED' | 'MAINTENANCE' | 'CONDEMNED';
type FirearmType   = 'PISTOL' | 'RIFLE' | 'SHOTGUN' | 'SMG' | 'SNIPER' | 'OTHER';

interface Officer {
  id: string;
  name: string;
  badgeNumber: string;
  role: string;
  stationId?: string;
}

interface Firearm {
  id:              string;
  serialNumber:    string;
  type:            FirearmType;
  make:            string;
  model:           string;
  caliber:         string;
  status:          FirearmStatus;
  issuedToId?:     string;   // officer ID
  issuedToName?:   string;   // officer name
  issuedBadge?:    string;   // officer badge number
  issuedDate?:     string;
  storeLocation?:  string;
  notes?:          string;
  lastInspection?: string;
}

interface CurrentUser { id: string; role: string; stationId?: string; name?: string; }

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<FirearmStatus, { label: string; color: string; bg: string; icon: React.ComponentType<any> }> = {
  SERVICEABLE: { label: 'Serviceable', color: 'text-green-700 dark:text-green-400',  bg: 'bg-green-100 dark:bg-green-900/30',  icon: CheckCircle },
  ISSUED:      { label: 'Issued',      color: 'text-blue-700 dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-900/30',    icon: Lock },
  MAINTENANCE: { label: 'Maintenance', color: 'text-amber-700 dark:text-amber-400',  bg: 'bg-amber-100 dark:bg-amber-900/30',  icon: AlertTriangle },
  CONDEMNED:   { label: 'Condemned',   color: 'text-red-700 dark:text-red-400',      bg: 'bg-red-100 dark:bg-red-900/30',      icon: XCircle },
};

const TYPE_LABELS: Record<FirearmType, string> = {
  PISTOL: 'Pistol', RIFLE: 'Rifle', SHOTGUN: 'Shotgun',
  SMG: 'Sub-Machine Gun', SNIPER: 'Sniper Rifle', OTHER: 'Other',
};

const STORAGE_KEY = 'police_firearms';

function load(): Firearm[] {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function save(data: Firearm[]) { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

// ── Component ─────────────────────────────────────────────────────────────────

export default function FirearmsPage() {
  const [firearms,     setFirearms]   = useState<Firearm[]>([]);
  const [officers,     setOfficers]   = useState<Officer[]>([]);
  const [currentUser,  setCurrentUser]= useState<CurrentUser | null>(null);
  const [search,       setSearch]     = useState('');
  const [statusFilter, setStatusFilter]=useState<FirearmStatus | ''>('');
  const [typeFilter,   setTypeFilter] = useState<FirearmType | ''>('');
  const [showFilters,  setShowFilters]= useState(false);
  const [showModal,    setShowModal]  = useState(false);
  const [editItem,     setEditItem]   = useState<Partial<Firearm> | null>(null);
  const [saving,       setSaving]     = useState(false);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.success) setCurrentUser(d.user); });
    setFirearms(load());
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
      params.set('limit', '1000'); // Get all officers
      params.set('isActive', 'true'); // Only active officers
      
      // If user is not admin, only show officers from their station
      if (currentUser && !['SUPER_ADMIN', 'ADMIN'].includes(currentUser.role) && currentUser.stationId) {
        params.set('stationId', currentUser.stationId);
      }
      
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setOfficers(data.data);
      }
    } catch (error) {
      console.error('Failed to load officers:', error);
    } finally {
      setLoadingOfficers(false);
    }
  };

  const canManage = currentUser && ['SUPER_ADMIN','ADMIN','STATION_COMMANDER'].includes(currentUser.role);

  const filtered = firearms.filter(f => {
    const matchSearch = !search || [
      f.serialNumber, 
      f.make, 
      f.model, 
      f.issuedToName,
      f.issuedBadge
    ].some(s => s?.toLowerCase().includes(search.toLowerCase()));
    
    const matchStatus = !statusFilter || f.status === statusFilter;
    const matchType   = !typeFilter   || f.type   === typeFilter;
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

  const getStationInfo = () => {
    // This would ideally come from the user's station
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
      doc.setFillColor(0, 51, 102); // Dark blue
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(station.name, 105, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('FIREARMS INVENTORY REPORT', 105, 25, { align: 'center' });

      // Add report metadata
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Generated by: ${currentUser?.name || 'Unknown'}`, 14, 40);
      doc.text(`Date: ${currentDate}`, 14, 45);
      doc.text(`Total Firearms: ${filtered.length}`, 14, 50);

      // Filter information
      let filterInfo = [];
      if (statusFilter) filterInfo.push(`Status: ${STATUS_CFG[statusFilter].label}`);
      if (typeFilter) filterInfo.push(`Type: ${TYPE_LABELS[typeFilter]}`);
      if (filterInfo.length > 0) {
        doc.text(`Filters: ${filterInfo.join(' • ')}`, 14, 55);
      }

      // Prepare table data
      const tableData = filtered.map(f => [
        f.serialNumber,
        TYPE_LABELS[f.type],
        `${f.make} ${f.model}`,
        f.caliber || '—',
        STATUS_CFG[f.status].label,
        f.issuedToName || '—',
        f.issuedBadge || '—',
        formatDate(f.issuedDate),
        f.storeLocation || '—',
        formatDate(f.lastInspection)
      ]);

      // Add table using autoTable
      autoTable(doc, {
        startY: 65,
        head: [['Serial No.', 'Type', 'Make/Model', 'Caliber', 'Status', 'Issued To', 'Badge No.', 'Issue Date', 'Location', 'Last Insp.']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 18 },
          2: { cellWidth: 25 },
          3: { cellWidth: 15 },
          4: { cellWidth: 18 },
          5: { cellWidth: 25 },
          6: { cellWidth: 18 },
          7: { cellWidth: 18 },
          8: { cellWidth: 18 },
          9: { cellWidth: 18 }
        }
      });

      // Add summary at the bottom
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      // Status summary
      const statusCounts = Object.keys(STATUS_CFG).map(status => {
        const count = firearms.filter(f => f.status === status).length;
        return `${STATUS_CFG[status as FirearmStatus].label}: ${count}`;
      });

      doc.setFontSize(9);
      doc.text('Status Summary:', 14, finalY);
      doc.text(statusCounts.join('  •  '), 14, finalY + 5);

      // Add footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('This is a computer generated report. No signature required.', 105, 280, { align: 'center' });

      // Save PDF
      doc.save(`firearms-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const generateCSV = () => {
    try {
      const headers = ['Serial Number', 'Type', 'Make', 'Model', 'Caliber', 'Status', 
                       'Issued To', 'Badge Number', 'Issue Date', 'Store Location', 'Last Inspection', 'Notes'];
      
      const rows = filtered.map(f => [
        f.serialNumber,
        TYPE_LABELS[f.type],
        f.make,
        f.model,
        f.caliber || '',
        STATUS_CFG[f.status].label,
        f.issuedToName || '',
        f.issuedBadge || '',
        f.issuedDate || '',
        f.storeLocation || '',
        f.lastInspection || '',
        f.notes || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `firearms-report-${new Date().toISOString().split('T')[0]}.csv`);
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
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Prepare data for main sheet
      const mainData = [
        ['KENYA POLICE SERVICE - FIREARMS INVENTORY REPORT'],
        [`Generated by: ${currentUser?.name || 'Unknown'}`],
        [`Date: ${new Date().toLocaleString('en-KE')}`],
        [`Total Firearms: ${filtered.length}`],
        [],
        ['Serial Number', 'Type', 'Make', 'Model', 'Caliber', 'Status', 
         'Issued To', 'Badge Number', 'Issue Date', 'Store Location', 'Last Inspection', 'Notes'],
        ...filtered.map(f => [
          f.serialNumber,
          TYPE_LABELS[f.type],
          f.make,
          f.model,
          f.caliber || '',
          STATUS_CFG[f.status].label,
          f.issuedToName || '',
          f.issuedBadge || '',
          f.issuedDate || '',
          f.storeLocation || '',
          f.lastInspection || '',
          f.notes || ''
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(mainData);

      // Add column widths
      ws['!cols'] = [
        { wch: 15 }, // Serial Number
        { wch: 15 }, // Type
        { wch: 12 }, // Make
        { wch: 12 }, // Model
        { wch: 10 }, // Caliber
        { wch: 12 }, // Status
        { wch: 20 }, // Issued To
        { wch: 15 }, // Badge Number
        { wch: 12 }, // Issue Date
        { wch: 15 }, // Store Location
        { wch: 12 }, // Last Inspection
        { wch: 30 }, // Notes
      ];

      // Add summary sheet
      const summaryData = [
        ['FIREARMS INVENTORY SUMMARY'],
        [],
        ['Status Summary'],
        ...Object.entries(STATUS_CFG).map(([status, cfg]) => [
          cfg.label,
          firearms.filter(f => f.status === status).length
        ]),
        [],
        ['Type Summary'],
        ...Object.entries(TYPE_LABELS).map(([type, label]) => [
          label,
          firearms.filter(f => f.type === type).length
        ]),
        [],
        ['Issued Firearms'],
        ['Officer Name', 'Badge Number', 'Serial Number', 'Type', 'Issue Date'],
        ...filtered
          .filter(f => f.status === 'ISSUED' && f.issuedToName)
          .map(f => [
            f.issuedToName,
            f.issuedBadge,
            f.serialNumber,
            TYPE_LABELS[f.type],
            f.issuedDate
          ])
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

      // Add sheets to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Firearms Inventory');
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Save file
      XLSX.writeFile(wb, `firearms-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Failed to generate Excel file. Please try again.');
    }
  };

  const openAdd  = () => { 
    setEditItem({ 
      status: 'SERVICEABLE', 
      type: 'PISTOL' 
    }); 
    setShowModal(true); 
  };
  
  const openEdit = (f: Firearm) => { 
    setEditItem({ ...f }); 
    setShowModal(true); 
  };

  const handleOfficerChange = (officerId: string) => {
    if (!officerId) {
      // Clear officer assignment
      setEditItem(p => ({
        ...p,
        issuedToId: undefined,
        issuedToName: undefined,
        issuedBadge: undefined,
        issuedDate: undefined,
        status: 'SERVICEABLE' // Change status back to serviceable when unassigned
      }));
      return;
    }
    
    const officer = officers.find(o => o.id === officerId);
    if (officer) {
      setEditItem(p => ({
        ...p,
        issuedToId: officer.id,
        issuedToName: officer.name,
        issuedBadge: officer.badgeNumber,
        issuedDate: p?.issuedDate || new Date().toISOString().split('T')[0], // Set today if not set
        status: 'ISSUED' // Auto-set status to ISSUED when assigned
      }));
    }
  };

  const handleSave = () => {
    if (!editItem?.serialNumber || !editItem.make || !editItem.model) {
      alert('Serial number, make and model are required');
      return;
    }
    setSaving(true);
    
    const entry: Firearm = {
      id:              editItem.id || `fw-${Date.now()}`,
      serialNumber:    editItem.serialNumber!,
      type:            editItem.type || 'PISTOL',
      make:            editItem.make!,
      model:           editItem.model!,
      caliber:         editItem.caliber || '',
      status:          editItem.status || 'SERVICEABLE',
      issuedToId:      editItem.issuedToId,
      issuedToName:    editItem.issuedToName,
      issuedBadge:     editItem.issuedBadge,
      issuedDate:      editItem.issuedDate,
      storeLocation:   editItem.storeLocation,
      notes:           editItem.notes,
      lastInspection:  editItem.lastInspection,
    };
    
    const updated = editItem.id
      ? firearms.map(f => f.id === entry.id ? entry : f)
      : [...firearms, entry];
    
    save(updated);
    setFirearms(updated);
    setShowModal(false);
    setEditItem(null);
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this firearm record?')) return;
    const updated = firearms.filter(f => f.id !== id);
    save(updated);
    setFirearms(updated);
  };

  const counts = Object.keys(STATUS_CFG).reduce<Record<string, number>>((acc, s) => {
    acc[s] = firearms.filter(f => f.status === s).length;
    return acc;
  }, {});

  // Get available officers based on user's station
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Firearms</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{firearms.length} firearm{firearms.length !== 1 ? 's' : ''} in armory</p>
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
              <Plus className="w-4 h-4" /> Register Firearm
            </button>
          )}
        </div>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(STATUS_CFG) as [FirearmStatus, typeof STATUS_CFG[FirearmStatus]][]).map(([status, cfg]) => {
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

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by serial, make, model, officer name, badge number…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg text-sm">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as FirearmType | '')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                <option value="">All Types</option>
                {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as FirearmStatus | '')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No firearms found</h3>
            {canManage && <button onClick={openAdd} className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm">Register First Firearm</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Serial No.</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Make / Model</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Caliber</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Issued To</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Inspection</th>
                  <th className="px-5 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map(f => {
                  const sc = STATUS_CFG[f.status];
                  const SI = sc.icon;
                  return (
                    <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{f.serialNumber}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{TYPE_LABELS[f.type]}</td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{f.make} {f.model}</p>
                        {f.storeLocation && <p className="text-xs text-gray-400">Store: {f.storeLocation}</p>}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{f.caliber || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                          <SI className="w-3 h-3" />{sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {f.issuedToName
                          ? <div>
                              <p className="text-sm text-gray-900 dark:text-white">{f.issuedToName}</p>
                              <p className="text-xs text-gray-400">Badge: {f.issuedBadge}</p>
                              {f.issuedDate && <p className="text-xs text-gray-400">Issued: {new Date(f.issuedDate).toLocaleDateString('en-KE')}</p>}
                            </div>
                          : <span className="text-gray-400 text-sm">—</span>
                        }
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {f.lastInspection ? new Date(f.lastInspection).toLocaleDateString('en-KE') : '—'}
                      </td>
                      <td className="px-5 py-4">
                        {canManage && (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => openEdit(f)} className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(f.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
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
      {showModal && editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editItem.id ? 'Edit Firearm' : 'Register Firearm'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditItem(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {/* Basic Info */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Serial Number *</label>
                <input 
                  type="text" 
                  value={editItem.serialNumber ?? ''}
                  onChange={e => setEditItem(p => ({ ...p, serialNumber: e.target.value }))}
                  placeholder="SN-12345"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Make *</label>
                <input 
                  type="text" 
                  value={editItem.make ?? ''}
                  onChange={e => setEditItem(p => ({ ...p, make: e.target.value }))}
                  placeholder="Glock"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Model *</label>
                <input 
                  type="text" 
                  value={editItem.model ?? ''}
                  onChange={e => setEditItem(p => ({ ...p, model: e.target.value }))}
                  placeholder="17"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Caliber</label>
                <input 
                  type="text" 
                  value={editItem.caliber ?? ''}
                  onChange={e => setEditItem(p => ({ ...p, caliber: e.target.value }))}
                  placeholder="9mm"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Store Location</label>
                <input 
                  type="text" 
                  value={editItem.storeLocation ?? ''}
                  onChange={e => setEditItem(p => ({ ...p, storeLocation: e.target.value }))}
                  placeholder="Armory Rack A"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                <select 
                  value={editItem.type ?? 'PISTOL'} 
                  onChange={e => setEditItem(p => ({ ...p, type: e.target.value as FirearmType }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                <select 
                  value={editItem.status ?? 'SERVICEABLE'} 
                  onChange={e => setEditItem(p => ({ ...p, status: e.target.value as FirearmStatus }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              {/* Officer Assignment Section */}
              <div className="col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Officer Assignment</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Assign to Officer</label>
                    <select
                      value={editItem.issuedToId || ''}
                      onChange={e => handleOfficerChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
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
                  </div>

                  {editItem.issuedToId && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Officer Name</label>
                        <input 
                          type="text" 
                          value={editItem.issuedToName || ''}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Badge Number</label>
                        <input 
                          type="text" 
                          value={editItem.issuedBadge || ''}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Issue Date</label>
                        <input 
                          type="date" 
                          value={editItem.issuedDate || ''}
                          onChange={e => setEditItem(p => ({ ...p, issuedDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Inspection and Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Last Inspection</label>
                <input 
                  type="date" 
                  value={editItem.lastInspection ?? ''}
                  onChange={e => setEditItem(p => ({ ...p, lastInspection: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                <textarea 
                  value={editItem.notes ?? ''} 
                  rows={2} 
                  onChange={e => setEditItem(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any additional notes about the firearm..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => { setShowModal(false); setEditItem(null); }} 
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} 
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}