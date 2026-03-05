// app/dashboard/communications/alerts/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Bell,
  BellOff,
  AlertTriangle,
  Info,
  CheckCircle,
  Zap,
  Shield,
  Search,
  RefreshCw,
  X,
  Eye,
  Check,
  MapPin,
  Users,
  Clock,
  Calendar,
  Trash2,
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import type {
  Alert,
  CreateAlertData,
  AlertType,
  AlertPriority,
  AlertScope,
  AlertStats,
} from "@/types/communications";

// ─── Constants & Config ───────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  AlertType,
  {
    label: string;
    icon: React.ElementType;
    bg: string;
    border: string;
    text: string;
    badge: string;
    iconColor: string;
  }
> = {
  CRITICAL: {
    label: "Critical",
    icon: AlertTriangle,
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700",
    iconColor: "text-red-500",
  },
  WARNING: {
    label: "Warning",
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
    iconColor: "text-amber-500",
  },
  INFO: {
    label: "Information",
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    iconColor: "text-blue-500",
  },
  SUCCESS: {
    label: "Notice",
    icon: CheckCircle,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
    iconColor: "text-emerald-500",
  },
  APB: {
    label: "APB",
    icon: Zap,
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    badge: "bg-purple-100 text-purple-700",
    iconColor: "text-purple-500",
  },
};

const PRIORITY_BADGE: Record<AlertPriority, string> = {
  URGENT: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-blue-600 text-white",
  LOW: "bg-gray-400 text-white",
};

const ALL_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "STATION_COMMANDER",
  "OCS",
  "DETECTIVE",
  "TRAFFIC_OFFICER",
  "GBV_OFFICER",
  "RECORDS_OFFICER",
  "OFFICER",
  "CONSTABLE",
  "PUBLIC",
];

// ─── Create Alert Modal ───────────────────────────────────────────────────────

interface CreateAlertModalProps {
  onClose: () => void;
  onCreate: (data: CreateAlertData) => Promise<void>;
}

function CreateAlertModal({ onClose, onCreate }: CreateAlertModalProps) {
  const [form, setForm] = useState<CreateAlertData>({
    title: "",
    message: "",
    type: "INFO",
    priority: "MEDIUM",
    scope: "STATION",
    targetRoles: [],
  });
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.message.trim()) e.message = "Message is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      targetRoles: f.targetRoles.includes(role)
        ? f.targetRoles.filter((r) => r !== role)
        : [...f.targetRoles, role],
    }));
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setCreating(true);
    try {
      await onCreate(form);
    } finally {
      setCreating(false);
    }
  };

  const cfg = TYPE_CONFIG[form.type];
  const TypeIcon = cfg.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${cfg.bg}`}>
              <TypeIcon className={`w-5 h-5 ${cfg.iconColor}`} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Create Alert</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Alert Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alert Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(TYPE_CONFIG) as AlertType[]).map((t) => {
                const c = TYPE_CONFIG[t];
                const Icon = c.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      form.type === t
                        ? `${c.bg} ${c.border} ${c.text}`
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as AlertPriority[]).map(
                (p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      form.priority === p
                        ? PRIORITY_BADGE[p]
                        : "border border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. BOLO – Armed Suspect at Large"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Full details, instructions, or information for the broadcast..."
              rows={5}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                errors.message ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
            />
            {errors.message && (
              <p className="mt-1 text-xs text-red-500">{errors.message}</p>
            )}
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Broadcast Scope
            </label>
            <div className="flex gap-2">
              {(["STATION", "COUNTY", "NATIONAL"] as AlertScope[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, scope: s })}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-all ${
                    form.scope === s
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                  }`}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Target Roles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Target Roles{" "}
                <span className="text-gray-400 font-normal">
                  (empty = all roles)
                </span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    targetRoles:
                      form.targetRoles.length === ALL_ROLES.length
                        ? []
                        : [...ALL_ROLES],
                  })
                }
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {form.targetRoles.length === ALL_ROLES.length
                  ? "Deselect all"
                  : "Select all"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    form.targetRoles.includes(role)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                  }`}
                >
                  {role.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires At{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={form.expiresAt ?? ""}
              onChange={(e) =>
                setForm({ ...form, expiresAt: e.target.value || undefined })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {creating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            {creating ? "Broadcasting..." : "Broadcast Alert"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

interface AlertCardProps {
  alert: Alert;
  onAcknowledge: (id: string, notes?: string) => Promise<void>;
  onDeactivate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  canManage: boolean;
}

function AlertCard({
  alert,
  onAcknowledge,
  onDeactivate,
  onDelete,
  canManage,
}: AlertCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAckForm, setShowAckForm] = useState(false);
  const [ackNotes, setAckNotes] = useState("");
  const [acking, setAcking] = useState(false);

  const cfg = TYPE_CONFIG[alert.type];
  const TypeIcon = cfg.icon;
  const expired = alert.expiresAt ? isPast(new Date(alert.expiresAt)) : false;
  const isInactive = !alert.isActive || expired;

  const handleAck = async () => {
    setAcking(true);
    try {
      await onAcknowledge(alert.id, ackNotes || undefined);
      setShowAckForm(false);
      setAckNotes("");
    } finally {
      setAcking(false);
    }
  };

  return (
    <div
      className={`rounded-xl border-2 transition-all ${cfg.border} ${cfg.bg} ${
        isInactive ? "opacity-60" : ""
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`flex-shrink-0 w-9 h-9 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center`}
          >
            <TypeIcon className={`w-4 h-4 ${cfg.iconColor}`} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-semibold text-sm ${cfg.text} leading-tight`}>
                  {alert.title}
                </h3>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    PRIORITY_BADGE[alert.priority]
                  }`}
                >
                  {alert.priority}
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.badge}`}
                >
                  {cfg.label}
                </span>
                {!alert.isActive && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    INACTIVE
                  </span>
                )}
                {expired && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    EXPIRED
                  </span>
                )}
                {/* Pulsing dot for active URGENT alerts */}
                {!isInactive && alert.priority === "URGENT" && (
                  <span className="flex items-center gap-1 text-[10px] text-red-600 font-semibold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    LIVE
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {!alert.acknowledgedByMe && !isInactive && (
                  <button
                    onClick={() => setShowAckForm(!showAckForm)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:border-green-300 hover:text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Acknowledge
                  </button>
                )}
                {alert.acknowledgedByMe && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 text-green-600 text-xs font-medium rounded-lg">
                    <CheckCircle className="w-3 h-3" />
                    Acknowledged
                  </span>
                )}
                {canManage && (
                  <>
                    {alert.isActive && !expired && (
                      <button
                        onClick={() => onDeactivate(alert.id)}
                        className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Deactivate alert"
                      >
                        <BellOff className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(alert.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Message body */}
            <p className={`text-xs leading-relaxed mb-2.5 ${cfg.text}`}>
              {expanded || alert.message.length <= 220
                ? alert.message
                : alert.message.slice(0, 220) + "…"}
              {alert.message.length > 220 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="ml-1 underline opacity-70 hover:opacity-100 font-medium"
                >
                  {expanded ? "show less" : "read more"}
                </button>
              )}
            </p>

            {/* Meta row */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 flex-shrink-0" />
                {alert.createdBy.name}
                {alert.createdBy.badgeNumber
                  ? ` (${alert.createdBy.badgeNumber})`
                  : ""}
              </span>
              {alert.station && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {alert.station.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 flex-shrink-0" />
                {alert.scope}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 flex-shrink-0" />
                {formatDistanceToNow(new Date(alert.createdAt), {
                  addSuffix: true,
                })}
              </span>
              {alert.expiresAt && (
                <span
                  className={`flex items-center gap-1 ${expired ? "text-red-500 font-medium" : ""}`}
                >
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  {expired ? "Expired" : "Expires"}{" "}
                  {format(new Date(alert.expiresAt), "dd MMM yyyy, HH:mm")}
                </span>
              )}
              {alert.targetRoles.length > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 flex-shrink-0" />
                  {alert.targetRoles.length === ALL_ROLES.length
                    ? "All roles"
                    : alert.targetRoles.length <= 2
                    ? alert.targetRoles.map((r) => r.replace(/_/g, " ")).join(", ")
                    : `${alert.targetRoles
                        .slice(0, 2)
                        .map((r) => r.replace(/_/g, " "))
                        .join(", ")} +${alert.targetRoles.length - 2} more`}
                </span>
              )}
            </div>

            {/* Acknowledgments list */}
            {alert.acknowledgments.length > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-white/60">
                <p className="text-xs font-medium text-gray-500 mb-1.5">
                  {alert.acknowledgments.length} acknowledgment
                  {alert.acknowledgments.length !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {alert.acknowledgments.slice(0, 6).map((ack) => (
                    <span
                      key={ack.id}
                      title={`Acknowledged ${format(
                        new Date(ack.acknowledgedAt),
                        "dd MMM yyyy, HH:mm"
                      )}${ack.notes ? ` — "${ack.notes}"` : ""}`}
                      className="text-[10px] px-1.5 py-0.5 bg-white/70 rounded border border-white text-gray-600"
                    >
                      {ack.user.name}
                    </span>
                  ))}
                  {alert.acknowledgments.length > 6 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/70 rounded border border-white text-gray-500">
                      +{alert.acknowledgments.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Acknowledge form */}
            {showAckForm && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Acknowledgment note{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </p>
                <textarea
                  value={ackNotes}
                  onChange={(e) => setAckNotes(e.target.value)}
                  placeholder="Any notes or actions taken..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleAck}
                    disabled={acking}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
                  >
                    {acking ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    {acking ? "Confirming..." : "Confirm Acknowledgment"}
                  </button>
                  <button
                    onClick={() => {
                      setShowAckForm(false);
                      setAckNotes("");
                    }}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">(
    "ACTIVE"
  );
  const [stats, setStats] = useState<AlertStats>({
    total: 0,
    active: 0,
    critical: 0,
    unacknowledged: 0,
  });

  // Replace with your actual role from session/context
  const canManage = true;

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: typeFilter,
        priority: priorityFilter,
        active: activeFilter,
        search,
      });
      const res = await fetch(`/api/communications/alerts?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setStats(
        data.stats ?? {
          total: 0,
          active: 0,
          critical: 0,
          unacknowledged: 0,
        }
      );
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, priorityFilter, activeFilter, search]);

  useEffect(() => {
    fetchAlerts();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCreate = async (data: CreateAlertData) => {
    const res = await fetch("/api/communications/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await fetchAlerts();
      setShowCreate(false);
    }
  };

  const handleAcknowledge = async (id: string, notes?: string) => {
    await fetch(`/api/communications/alerts/${id}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    await fetchAlerts();
  };

  const handleDeactivate = async (id: string) => {
    await fetch(`/api/communications/alerts/${id}/deactivate`, {
      method: "PATCH",
    });
    await fetchAlerts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this alert permanently? This cannot be undone.")) return;
    await fetch(`/api/communications/alerts/${id}`, { method: "DELETE" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {showCreate && (
        <CreateAlertModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
              <Bell className="w-6 h-6 text-blue-600" />
              Alerts &amp; Notifications
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Broadcast and manage operational alerts across stations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAlerts}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg border border-gray-200 transition-colors"
              title="Refresh alerts"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            {canManage && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Alert
              </button>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {(
            [
              {
                label: "Total Alerts",
                value: stats.total,
                icon: Bell,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "Active",
                value: stats.active,
                icon: Zap,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                label: "Critical",
                value: stats.critical,
                icon: AlertTriangle,
                color: "text-red-600",
                bg: "bg-red-50",
              },
              {
                label: "Unacknowledged",
                value: stats.unacknowledged,
                icon: Eye,
                color: "text-amber-600",
                bg: "bg-amber-50",
              },
            ] as const
          ).map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${s.bg}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none text-gray-600 bg-white"
          >
            <option value="ALL">All Types</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
            <option value="SUCCESS">Notice</option>
            <option value="APB">APB</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none text-gray-600 bg-white"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Active filter */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  activeFilter === f
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-50 bg-white"
                }`}
              >
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Alert list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200 text-gray-400">
            <BellOff className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-base font-medium text-gray-500">
              No alerts found
            </p>
            <p className="text-sm mt-1">
              {canManage
                ? "Create an alert to broadcast to officers"
                : "Check back later for updates"}
            </p>
            {canManage && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Alert
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onDeactivate={handleDeactivate}
                onDelete={handleDelete}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}