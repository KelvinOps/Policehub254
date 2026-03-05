// src/app/(dashboard)/dashboard/resources/equipment/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Package, Plus, Search, Filter, Edit, Trash2,
  CheckCircle, XCircle, AlertTriangle, Archive, Save, X,
  FileText, Download, FileSpreadsheet, FileJson,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ── Types ─────────────────────────────────────────────────────────────────────

type EquipmentStatus   = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'CONDEMNED';
type EquipmentCategory = 'COMMUNICATION' | 'PROTECTIVE' | 'SURVEILLANCE' | 'MEDICAL' | 'IT' | 'OFFICE' | 'OTHER';

interface Officer {
  id: string;
  name: string;
  badgeNumber: string;
  role: string;
  stationId?: string;
}

interface Equipment {
  id:            string;
  name:          string;
  category:      EquipmentCategory;
  serialNumber?: string;
  quantity:      number;
  available:     number;
  status:        EquipmentStatus;
  issuedToId?:   string;   // officer ID
  issuedToName?: string;   // officer name
  issuedBadge?:  string;   // officer badge number
  issuedDate?:   string;
  location?:     string;
  condition?:    string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  notes?:        string;
}

interface CurrentUser { id: string; role: string; stationId?: string; name?: string; }

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<EquipmentStatus, { label: string; color: string; bg: string; icon: React.ComponentType<any> }> = {
  AVAILABLE:   { label: 'Available',   color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30',  icon: CheckCircle },
  IN_USE:      { label: 'In Use',      color: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-100 dark:bg-blue-900/30',    icon: Archive },
  MAINTENANCE: { label: 'Maintenance', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30',  icon: AlertTriangle },
  CONDEMNED:   { label: 'Condemned',   color: 'text-red-700 dark:text-red-400',     bg: 'bg-red-100 dark:bg-red-900/30',      icon: XCircle },
};

const CAT_LABELS: Record<EquipmentCategory, string> = {
  COMMUNICATION: 'Communication', PROTECTIVE: 'Protective Gear',
  SURVEILLANCE: 'Surveillance',   MEDICAL: 'Medical',
  IT: 'IT / Tech',               OFFICE: 'Office',
  OTHER: 'Other',
};

const CAT_ICONS: Record<EquipmentCategory, string> = {
  COMMUNICATION: '📡', PROTECTIVE: '🦺', SURVEILLANCE: '📷',
  MEDICAL: '🩺', IT: '💻', OFFICE: '🗂️', OTHER: '📦',
};

const STORAGE_KEY = 'police_equipment';

function load(): Equipment[] {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function save(data: Equipment[]) { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

// ── Component ─────────────────────────────────────────────────────────────────

export default function EquipmentPage() {
  const [items,       setItems]       = useState<Equipment[]>([]);
  const [officers,    setOfficers]    = useState<Officer[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [search,      setSearch]      = useState('');
  const [catFilter,   setCatFilter]   = useState<EquipmentCategory | ''>('');
  const [statFilter,  setStatFilter]  = useState<EquipmentStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [editItem,    setEditItem]    = useState<Partial<Equipment> | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.success) setCurrentUser(d.user); });
    setItems(load());
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
      params.set('isActive', 'true');
      
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

  const filtered = items.filter(item => {
    const matchSearch = !search || [
      item.name, 
      item.serialNumber, 
      item.issuedToName,
      item.issuedBadge,
      item.location
    ].some(s => s?.toLowerCase().includes(search.toLowerCase()));
    
    const matchCat    = !catFilter  || item.category === catFilter;
    const matchStat   = !statFilter || item.status   === statFilter;
    return matchSearch && matchCat && matchStat;
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
      doc.text('EQUIPMENT INVENTORY REPORT', 105, 25, { align: 'center' });

      // Add report metadata
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Generated by: ${currentUser?.name || 'Unknown'}`, 14, 40);
      doc.text(`Date: ${currentDate}`, 14, 45);
      doc.text(`Total Items: ${filtered.length}`, 14, 50);
      doc.text(`Total Units: ${items.reduce((s, i) => s + i.quantity, 0)}`, 14, 55);

      // Filter information
      let filterInfo = [];
      if (catFilter) filterInfo.push(`Category: ${CAT_LABELS[catFilter]}`);
      if (statFilter) filterInfo.push(`Status: ${STATUS_CFG[statFilter].label}`);
      if (filterInfo.length > 0) {
        doc.text(`Filters: ${filterInfo.join(' • ')}`, 14, 60);
      }

      // Prepare table data
      const tableData = filtered.map(item => [
        item.name,
        CAT_LABELS[item.category],
        item.serialNumber || '—',
        `${item.available}/${item.quantity}`,
        STATUS_CFG[item.status].label,
        item.issuedToName || '—',
        item.issuedBadge || '—',
        formatDate(item.issuedDate),
        item.location || '—',
        item.condition || '—',
        formatDate(item.warrantyExpiry)
      ]);

      // Add table
      autoTable(doc, {
        startY: 70,
        head: [['Equipment', 'Category', 'Serial No.', 'Qty/Avail', 'Status', 'Issued To', 'Badge No.', 'Issue Date', 'Location', 'Condition', 'Warranty']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 20 },
          2: { cellWidth: 18 },
          3: { cellWidth: 15 },
          4: { cellWidth: 15 },
          5: { cellWidth: 22 },
          6: { cellWidth: 15 },
          7: { cellWidth: 15 },
          8: { cellWidth: 18 },
          9: { cellWidth: 15 },
          10: { cellWidth: 15 }
        }
      });

      // Add summary at the bottom
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      // Category summary
      const catCounts = Object.keys(CAT_LABELS).map(cat => {
        const count = items.filter(i => i.category === cat).length;
        const units = items.filter(i => i.category === cat).reduce((s, i) => s + i.quantity, 0);
        return `${CAT_LABELS[cat as EquipmentCategory]}: ${units} units`;
      });

      doc.setFontSize(9);
      doc.text('Category Summary:', 14, finalY);
      doc.text(catCounts.join('  •  '), 14, finalY + 5);

      // Add footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('This is a computer generated report. No signature required.', 105, 280, { align: 'center' });

      // Save PDF
      doc.save(`equipment-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const generateCSV = () => {
    try {
      const headers = ['Equipment', 'Category', 'Serial Number', 'Total Quantity', 'Available', 'Status', 
                       'Issued To', 'Badge Number', 'Issue Date', 'Location', 'Condition', 'Purchase Date', 'Warranty Expiry', 'Notes'];
      
      const rows = filtered.map(item => [
        item.name,
        CAT_LABELS[item.category],
        item.serialNumber || '',
        item.quantity.toString(),
        item.available.toString(),
        STATUS_CFG[item.status].label,
        item.issuedToName || '',
        item.issuedBadge || '',
        item.issuedDate || '',
        item.location || '',
        item.condition || '',
        item.purchaseDate || '',
        item.warrantyExpiry || '',
        item.notes || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `equipment-report-${new Date().toISOString().split('T')[0]}.csv`);
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
        ['KENYA POLICE SERVICE - EQUIPMENT INVENTORY REPORT'],
        [`Generated by: ${currentUser?.name || 'Unknown'}`],
        [`Date: ${new Date().toLocaleString('en-KE')}`],
        [`Total Items: ${items.length}`],
        [`Total Units: ${items.reduce((s, i) => s + i.quantity, 0)}`],
        [],
        ['Equipment', 'Category', 'Serial Number', 'Total Quantity', 'Available', 'Status', 
         'Issued To', 'Badge Number', 'Issue Date', 'Location', 'Condition', 'Purchase Date', 'Warranty Expiry', 'Notes'],
        ...filtered.map(item => [
          item.name,
          CAT_LABELS[item.category],
          item.serialNumber || '',
          item.quantity,
          item.available,
          STATUS_CFG[item.status].label,
          item.issuedToName || '',
          item.issuedBadge || '',
          item.issuedDate || '',
          item.location || '',
          item.condition || '',
          item.purchaseDate || '',
          item.warrantyExpiry || '',
          item.notes || ''
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(mainData);

      ws['!cols'] = [
        { wch: 25 }, // Equipment
        { wch: 18 }, // Category
        { wch: 15 }, // Serial Number
        { wch: 10 }, // Total Quantity
        { wch: 10 }, // Available
        { wch: 12 }, // Status
        { wch: 25 }, // Issued To
        { wch: 15 }, // Badge Number
        { wch: 12 }, // Issue Date
        { wch: 15 }, // Location
        { wch: 12 }, // Condition
        { wch: 12 }, // Purchase Date
        { wch: 12 }, // Warranty Expiry
        { wch: 30 }, // Notes
      ];

      // Summary sheet
      const summaryData = [
        ['EQUIPMENT SUMMARY'],
        [],
        ['Category Summary'],
        ['Category', 'Items', 'Total Units', 'Available Units'],
        ...Object.entries(CAT_LABELS).map(([cat, label]) => {
          const catItems = items.filter(i => i.category === cat);
          const totalUnits = catItems.reduce((s, i) => s + i.quantity, 0);
          const availableUnits = catItems.reduce((s, i) => s + i.available, 0);
          return [label, catItems.length, totalUnits, availableUnits];
        }),
        [],
        ['Status Summary'],
        ['Status', 'Count'],
        ...Object.entries(STATUS_CFG).map(([status, cfg]) => [
          cfg.label,
          items.filter(i => i.status === status).length
        ]),
        [],
        ['Issued Equipment'],
        ['Officer Name', 'Badge Number', 'Equipment', 'Serial Number', 'Category', 'Issue Date'],
        ...filtered
          .filter(i => i.issuedToName)
          .map(i => [
            i.issuedToName,
            i.issuedBadge,
            i.name,
            i.serialNumber || '',
            CAT_LABELS[i.category],
            formatDate(i.issuedDate)
          ]),
        [],
        ['Low Stock Alert (<20% available)'],
        ['Equipment', 'Category', 'Available', 'Total', 'Percentage'],
        ...filtered
          .filter(i => i.available < i.quantity * 0.2)
          .map(i => [
            i.name,
            CAT_LABELS[i.category],
            i.available,
            i.quantity,
            `${Math.round((i.available / i.quantity) * 100)}%`
          ])
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

      XLSX.utils.book_append_sheet(wb, ws, 'Equipment Inventory');
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      XLSX.writeFile(wb, `equipment-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Failed to generate Excel file. Please try again.');
    }
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
        status: 'AVAILABLE'
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
        issuedDate: p?.issuedDate || new Date().toISOString().split('T')[0],
        status: 'IN_USE'
      }));
    }
  };

  const openAdd  = () => { 
    setEditItem({ 
      status: 'AVAILABLE', 
      category: 'OTHER', 
      quantity: 1, 
      available: 1 
    }); 
    setShowModal(true); 
  };
  
  const openEdit = (item: Equipment) => { 
    setEditItem({ ...item }); 
    setShowModal(true); 
  };

  const handleSave = () => {
    if (!editItem?.name || !editItem.category) {
      alert('Name and category are required');
      return;
    }
    setSaving(true);
    
    const entry: Equipment = {
      id:            editItem.id || `eq-${Date.now()}`,
      name:          editItem.name!,
      category:      editItem.category!,
      serialNumber:  editItem.serialNumber,
      quantity:      editItem.quantity || 1,
      available:     editItem.available ?? editItem.quantity ?? 1,
      status:        editItem.status || 'AVAILABLE',
      issuedToId:    editItem.issuedToId,
      issuedToName:  editItem.issuedToName,
      issuedBadge:   editItem.issuedBadge,
      issuedDate:    editItem.issuedDate,
      location:      editItem.location,
      condition:     editItem.condition,
      purchaseDate:  editItem.purchaseDate,
      warrantyExpiry: editItem.warrantyExpiry,
      notes:         editItem.notes,
    };
    
    const updated = editItem.id
      ? items.map(i => i.id === entry.id ? entry : i)
      : [...items, entry];
    
    save(updated);
    setItems(updated);
    setShowModal(false);
    setEditItem(null);
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this equipment record?')) return;
    const updated = items.filter(i => i.id !== id);
    save(updated);
    setItems(updated);
  };

  // Summary by category
  const totalItems     = items.reduce((s, i) => s + i.quantity, 0);
  const totalAvailable = items.reduce((s, i) => s + i.available, 0);

  // Group by category for view
  const byCategory = Object.keys(CAT_LABELS).map(cat => ({
    cat: cat as EquipmentCategory,
    count: items.filter(i => i.category === cat).length,
    qty:   items.filter(i => i.category === cat).reduce((s, i) => s + i.quantity, 0),
  })).filter(c => c.count > 0);

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Equipment</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {items.length} item type{items.length !== 1 ? 's' : ''} · {totalItems} units total · {totalAvailable} available
          </p>
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
              <Plus className="w-4 h-4" /> Add Equipment
            </button>
          )}
        </div>
      </div>

      {/* Category overview */}
      {byCategory.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {byCategory.map(({ cat, count, qty }) => (
            <button key={cat} onClick={() => setCatFilter(catFilter === cat ? '' : cat)}
              className={`rounded-xl p-3 text-left border transition-all ${catFilter === cat ? 'border-blue-400 ring-2 ring-blue-300 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
              <div className="text-lg mb-1">{CAT_ICONS[cat]}</div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{CAT_LABELS[cat]}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{qty}</p>
              <p className="text-xs text-gray-400">{count} type{count !== 1 ? 's' : ''}</p>
            </button>
          ))}
        </div>
      )}

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(STATUS_CFG) as [EquipmentStatus, typeof STATUS_CFG[EquipmentStatus]][]).map(([status, cfg]) => {
          const Icon = cfg.icon;
          const cnt  = items.filter(i => i.status === status).length;
          return (
            <button key={status} onClick={() => setStatFilter(statFilter === status ? '' : status)}
              className={`rounded-xl p-4 text-left border transition-all ${cfg.bg} ${statFilter === status ? 'ring-2 ring-blue-400' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className={`flex items-center gap-2 mb-2 ${cfg.color}`}>
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{cfg.label}</span>
              </div>
              <p className={`text-2xl font-bold ${cfg.color}`}>{cnt}</p>
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
              placeholder="Search by name, serial, officer name, badge number, location…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value as EquipmentCategory | '')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                <option value="">All Categories</option>
                {Object.entries(CAT_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={statFilter} onChange={e => setStatFilter(e.target.value as EquipmentStatus | '')}
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
            <Package className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No equipment found</h3>
            {canManage && <button onClick={openAdd} className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm">Add First Item</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Equipment</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty / Avail</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Issued To</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Warranty</th>
                  <th className="px-5 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map(item => {
                  const sc  = STATUS_CFG[item.status];
                  const SI  = sc.icon;
                  const low = item.available < item.quantity * 0.2;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{CAT_ICONS[item.category]}</span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                            {item.serialNumber && <p className="text-xs text-gray-400 font-mono">#{item.serialNumber}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{CAT_LABELS[item.category]}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${low ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                            {item.available} / {item.quantity}
                          </span>
                          {low && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                        </div>
                        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                          <div className={`h-1.5 rounded-full ${low ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${(item.available / item.quantity) * 100}%` }} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                          <SI className="w-3 h-3" />{sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{item.location || '—'}</td>
                      <td className="px-5 py-4">
                        {item.issuedToName
                          ? <div>
                              <p className="text-sm text-gray-900 dark:text-white">{item.issuedToName}</p>
                              <p className="text-xs text-gray-400">Badge: {item.issuedBadge}</p>
                              {item.issuedDate && <p className="text-xs text-gray-400">Issued: {formatDate(item.issuedDate)}</p>}
                            </div>
                          : <span className="text-gray-400 text-sm">—</span>
                        }
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {item.warrantyExpiry
                          ? <span className={new Date(item.warrantyExpiry) < new Date() ? 'text-red-500' : ''}>
                              {formatDate(item.warrantyExpiry)}
                            </span>
                          : '—'}
                      </td>
                      <td className="px-5 py-4">
                        {canManage && (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => openEdit(item)} className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
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
                {editItem.id ? 'Edit Equipment' : 'Add Equipment'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditItem(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Equipment Name *</label>
                <input type="text" value={editItem.name ?? ''} onChange={e => setEditItem(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Body Camera, Radio Set…"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category *</label>
                <select value={editItem.category ?? 'OTHER'} onChange={e => setEditItem(p => ({ ...p, category: e.target.value as EquipmentCategory }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                  {Object.entries(CAT_LABELS).map(([k,v]) => <option key={k} value={k}>{CAT_ICONS[k as EquipmentCategory]} {v}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                <select value={editItem.status ?? 'AVAILABLE'} onChange={e => setEditItem(p => ({ ...p, status: e.target.value as EquipmentStatus }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                  {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Quantity</label>
                <input type="number" value={editItem.quantity ?? 1} 
                  onChange={e => setEditItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Available</label>
                <input type="number" value={editItem.available ?? editItem.quantity ?? 1} 
                  onChange={e => setEditItem(p => ({ ...p, available: parseInt(e.target.value) || 0 }))}
                  min="0" max={editItem.quantity}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Serial / Tag No.</label>
                <input type="text" value={editItem.serialNumber ?? ''} 
                  onChange={e => setEditItem(p => ({ ...p, serialNumber: e.target.value }))}
                  placeholder="SN-12345"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Condition</label>
                <input type="text" value={editItem.condition ?? ''} 
                  onChange={e => setEditItem(p => ({ ...p, condition: e.target.value }))}
                  placeholder="Good / Fair / Poor"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Storage Location</label>
                <input type="text" value={editItem.location ?? ''} 
                  onChange={e => setEditItem(p => ({ ...p, location: e.target.value }))}
                  placeholder="Store Room B"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" 
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Purchase Date</label>
                <input type="date" value={editItem.purchaseDate ?? ''} 
                  onChange={e => setEditItem(p => ({ ...p, purchaseDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Warranty Expiry</label>
                <input type="date" value={editItem.warrantyExpiry ?? ''} 
                  onChange={e => setEditItem(p => ({ ...p, warrantyExpiry: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                <textarea value={editItem.notes ?? ''} rows={2} 
                  onChange={e => setEditItem(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any additional notes about the equipment..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
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