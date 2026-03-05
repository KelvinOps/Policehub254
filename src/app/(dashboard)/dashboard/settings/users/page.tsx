// app/dashboard/settings/users/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Search, Shield, Building2, Hash,
  Phone, Mail, Edit3, UserX, UserCheck, CheckCircle,
  AlertCircle, RefreshCw, X, ChevronLeft, ChevronRight,
  Eye, EyeOff, Calendar, BadgeCheck, User,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { UserData, StationData } from "@/types/settings";
import { ROLE_LABELS, ROLE_COLORS, USER_ROLES } from "@/types/settings";
import type { UserRole } from "@prisma/client";

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium ${
      type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
    }`}>
      {type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
      {message}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const palettes = [
    "from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600",
    "from-violet-500 to-purple-600", "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600", "from-cyan-500 to-blue-600",
  ];
  const grad = palettes[name.charCodeAt(0) % palettes.length];
  const sz = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-base" }[size];
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ─── User Form Modal ──────────────────────────────────────────────────────────

interface UserFormProps {
  user?: UserData;
  stations: StationData[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

function UserFormModal({ user: editUser, stations, onClose, onSave }: UserFormProps) {
  const [form, setForm] = useState({
    name:        editUser?.name        ?? "",
    email:       editUser?.email       ?? "",
    password:    "",
    role:        (editUser?.role ?? "OFFICER") as UserRole,
    badgeNumber: editUser?.badgeNumber ?? "",
    phoneNumber: editUser?.phoneNumber ?? "",
    rank:        editUser?.rank        ?? "",
    department:  editUser?.department  ?? "",
    stationId:   editUser?.stationId   ?? "",
    newPassword: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())  e.name  = "Required";
    if (!form.email.trim()) e.email = "Required";
    if (!editUser && !form.password) e.password = "Required";
    if (!editUser && form.password && form.password.length < 8) e.password = "Min 8 characters";
    if (!form.role) e.role = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name:        form.name.trim(),
        email:       form.email.trim(),
        role:        form.role,
        badgeNumber: form.badgeNumber.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        rank:        form.rank.trim()        || undefined,
        department:  form.department.trim()  || undefined,
        stationId:   form.stationId          || undefined,
      };
      if (!editUser) payload.password = form.password;
      if (editUser && form.newPassword) payload.newPassword = form.newPassword;
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (key: string) =>
    `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
      errors[key] ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300"
    }`;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              {editUser ? `Edit ${editUser.name}` : "Add New User"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name <span className="text-red-400">*</span></label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className={inputCls("name")} />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email <span className="text-red-400">*</span></label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="officer@police.go.ke" className={inputCls("email")} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Role <span className="text-red-400">*</span></label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className={inputCls("role")}>
                {USER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {editUser ? "Reset Password" : "Password *"}
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={editUser ? form.newPassword : form.password}
                  onChange={(e) => setForm(editUser ? { ...form, newPassword: e.target.value } : { ...form, password: e.target.value })}
                  placeholder={editUser ? "Leave blank to keep current" : "Min 8 characters"}
                  className={`${inputCls("password")} pr-10`}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            {/* Badge */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Badge Number</label>
              <input type="text" value={form.badgeNumber} onChange={(e) => setForm({ ...form, badgeNumber: e.target.value })} placeholder="e.g. KPS-12345" className={inputCls("badgeNumber")} />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone Number</label>
              <input type="tel" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="+254 700 000 000" className={inputCls("phoneNumber")} />
            </div>

            {/* Rank */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Rank</label>
              <input type="text" value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} placeholder="e.g. Inspector" className={inputCls("rank")} />
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Department</label>
              <input type="text" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. CID" className={inputCls("department")} />
            </div>

            {/* Station */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Assigned Station</label>
              <select value={form.stationId} onChange={(e) => setForm({ ...form, stationId: e.target.value })} className={inputCls("stationId")}>
                <option value="">No station assigned</option>
                {stations.filter((s) => s.isActive).map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
            {saving ? "Saving…" : editUser ? "Save Changes" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User row ─────────────────────────────────────────────────────────────────

interface UserRowProps {
  user: UserData;
  onEdit: () => void;
  onToggle: () => void;
}

function UserRow({ user, onEdit, onToggle }: UserRowProps) {
  return (
    <tr className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${!user.isActive ? "opacity-50" : ""}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${ROLE_COLORS[user.role]}`}>
          {ROLE_LABELS[user.role]}
        </span>
      </td>
      <td className="px-4 py-3">
        {user.badgeNumber
          ? <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">{user.badgeNumber}</span>
          : <span className="text-gray-300 text-xs">—</span>
        }
      </td>
      <td className="px-4 py-3">
        {user.station
          ? <span className="text-xs text-gray-600">{user.station.name}</span>
          : <span className="text-gray-300 text-xs">—</span>
        }
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${
          user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
          {user.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {user.lastLogin
          ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })
          : "Never"
        }
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Edit user"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggle}
            className={`p-1.5 rounded-lg transition-colors ${
              user.isActive
                ? "text-gray-400 hover:text-red-500 hover:bg-red-50"
                : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
            }`}
            title={user.isActive ? "Deactivate" : "Reactivate"}
          >
            {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [stationFilter, setStationFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("true");
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserData | undefined>();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => setToast({ message, type });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: "20" });
      if (roleFilter)    params.set("role",      roleFilter);
      if (stationFilter) params.set("stationId", stationFilter);
      if (activeFilter !== "") params.set("isActive", activeFilter);
      const res = await fetch(`/api/settings/users?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [search, page, roleFilter, stationFilter, activeFilter]);

  const fetchStations = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/stations?limit=100&isActive=true");
      if (res.ok) {
        const data = await res.json();
        setStations(data.stations ?? []);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchStations(); }, [fetchStations]);

  const handleCreate = async (data: Record<string, unknown>) => {
    const res = await fetch("/api/settings/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { showToast(json.error, "error"); return; }
    showToast("User created", "success");
    setShowForm(false);
    fetchUsers();
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editUser) return;
    const res = await fetch(`/api/settings/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { showToast(json.error, "error"); return; }
    showToast("User updated", "success");
    setEditUser(undefined);
    fetchUsers();
  };

  const handleToggle = async (user: UserData) => {
    if (!confirm(`${user.isActive ? "Deactivate" : "Reactivate"} "${user.name}"?`)) return;
    const method = user.isActive ? "DELETE" : "PATCH";
    const body   = user.isActive ? undefined : JSON.stringify({ isActive: true });
    const res = await fetch(`/api/settings/users/${user.id}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body,
    });
    const json = await res.json();
    if (!res.ok) { showToast(json.error, "error"); return; }
    showToast(user.isActive ? "User deactivated" : "User reactivated", "success");
    fetchUsers();
  };

  const totalPages = Math.ceil(total / 20);

  // ── Active / Inactive counts for header ──────────────────────────────────
  const activeCount   = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {(showForm || editUser) && (
        <UserFormModal
          user={editUser}
          stations={stations}
          onClose={() => { setShowForm(false); setEditUser(undefined); }}
          onSave={editUser ? handleEdit : handleCreate}
        />
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or badge…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-600"
        >
          <option value="">All Roles</option>
          {USER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>

        <select
          value={stationFilter}
          onChange={(e) => { setStationFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-600"
        >
          <option value="">All Stations</option>
          {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {/* Status toggle */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
          {[["true", "Active"], ["false", "Inactive"], ["", "All"]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => { setActiveFilter(val); setPage(1); }}
              className={`px-3 py-2.5 text-xs font-medium transition-colors ${
                activeFilter === val ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* ── Summary stats ── */}
      {!loading && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{total} user{total !== 1 ? "s" : ""} found</span>
            {activeFilter === "" && (
              <>
                <span className="text-emerald-600 font-medium">{activeCount} active</span>
                {inactiveCount > 0 && <span className="text-gray-400">{inactiveCount} inactive</span>}
              </>
            )}
          </div>
          <button onClick={fetchUsers} disabled={loading} className="text-gray-400 hover:text-gray-600">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-200 rounded w-48" />
                  <div className="h-2.5 bg-gray-100 rounded w-36" />
                </div>
                <div className="h-5 bg-gray-100 rounded w-24" />
                <div className="h-5 bg-gray-100 rounded w-16" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Users className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-base font-medium text-gray-500">No users found</p>
            <p className="text-sm mt-1">
              {search ? `No results for "${search}"` : "Add a user to get started"}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add First User
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {["Officer", "Role", "Badge", "Station", "Status", "Last Login", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onEdit={() => setEditUser(u)}
                    onToggle={() => handleToggle(u)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 rounded-xl transition-all disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-gray-500 px-3">
            Page {page} of {totalPages} · {total} total
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 rounded-xl transition-all disabled:opacity-40"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}