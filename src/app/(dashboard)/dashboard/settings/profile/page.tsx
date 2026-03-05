// app/dashboard/settings/profile/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  User, Phone, Shield, Building2, Save, Lock,
  Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw,
  Calendar, Hash, Briefcase, Edit3, X, BadgeCheck,
} from "lucide-react";
import { format } from "date-fns";
import type { ProfileData } from "@/types/settings";
import { ROLE_LABELS, ROLE_COLORS } from "@/types/settings";

// ─── Shared sub-components ────────────────────────────────────────────────────

function Avatar({ name, size = "lg" }: { name: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const palettes = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-violet-500 to-purple-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-cyan-500 to-blue-600",
  ];
  const grad = palettes[name.charCodeAt(0) % palettes.length];
  const sz = { sm: "w-8 h-8 text-xs", md: "w-11 h-11 text-sm", lg: "w-16 h-16 text-xl", xl: "w-20 h-20 text-2xl" }[size];
  return (
    <div className={`${sz} rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md`}>
      {initials}
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium animate-in slide-in-from-bottom-4 ${
      type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
    }`}>
      {type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
      {message}
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 w-44 flex-shrink-0 pt-0.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-sm text-gray-800">{value || <span className="text-gray-300">—</span>}</span>
    </div>
  );
}

function SectionCard({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

function FormField({
  label, value, onChange, type = "text", placeholder, required, error, half,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
  error?: string; half?: boolean;
}) {
  return (
    <div className={half ? "" : "col-span-2"}>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
          error ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    name: "", phoneNumber: "", rank: "", department: "",
    dateOfBirth: "", emergencyContact: "", emergencyPhone: "",
  });

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

  const showToast = (message: string, type: "success" | "error") => setToast({ message, type });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/profile");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setProfile(data.profile);
      setForm({
        name:             data.profile.name             ?? "",
        phoneNumber:      data.profile.phoneNumber      ?? "",
        rank:             data.profile.rank             ?? "",
        department:       data.profile.department       ?? "",
        dateOfBirth:      data.profile.dateOfBirth
          ? format(new Date(data.profile.dateOfBirth), "yyyy-MM-dd") : "",
        emergencyContact: data.profile.emergencyContact ?? "",
        emergencyPhone:   data.profile.emergencyPhone   ?? "",
      });
    } catch {
      showToast("Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    if (!form.name.trim()) { showToast("Name is required", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(data.profile);
      setEditMode(false);
      showToast("Profile updated", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const errors: Record<string, string> = {};
    if (!pwForm.currentPassword) errors.currentPassword = "Required";
    if (!pwForm.newPassword)      errors.newPassword     = "Required";
    else if (pwForm.newPassword.length < 8) errors.newPassword = "Minimum 8 characters";
    if (pwForm.newPassword !== pwForm.confirmPassword) errors.confirmPassword = "Passwords do not match";
    setPwErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPwSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_password", ...pwForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("Password changed successfully", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Password change failed", "error");
    } finally {
      setPwSaving(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-3xl space-y-5">
        {[240, 180, 260].map((h, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 animate-pulse" style={{ height: h }} />
        ))}
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-3xl space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Hero card ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
        <div className="p-6">
          <div className="flex items-start gap-5">
            <Avatar name={profile.name} size="xl" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">{profile.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{profile.email}</p>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${ROLE_COLORS[profile.role]}`}>
                      <Shield className="w-3 h-3" />
                      {ROLE_LABELS[profile.role]}
                    </span>
                    {profile.badgeNumber && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        <Hash className="w-3 h-3" />
                        {profile.badgeNumber}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                      profile.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${profile.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                      {profile.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${
                    editMode
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                  }`}
                >
                  {editMode ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  {editMode ? "Cancel" : "Edit Profile"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-8 mt-4 text-xs text-gray-500">
                {profile.station && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {profile.station.name}
                  </span>
                )}
                {profile.rank && (
                  <span className="flex items-center gap-1.5">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {profile.rank}
                  </span>
                )}
                {profile.lastLogin && (
                  <span className="flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Last login {format(new Date(profile.lastLogin), "dd MMM yyyy, HH:mm")}
                  </span>
                )}
                <span className="flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {format(new Date(profile.createdAt), "dd MMM yyyy")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Personal information ── */}
      {editMode ? (
        <SectionCard
          title="Edit Personal Information"
          subtitle="Update your name, contact details, and emergency info"
          action={
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Full name" required />
            <FormField label="Phone Number" value={form.phoneNumber} onChange={(v) => setForm({ ...form, phoneNumber: v })} type="tel" placeholder="+254 700 000 000" half />
            <FormField label="Rank" value={form.rank} onChange={(v) => setForm({ ...form, rank: v })} placeholder="e.g. Inspector" half />
            <FormField label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} placeholder="e.g. CID" half />
            <FormField label="Date of Birth" value={form.dateOfBirth} onChange={(v) => setForm({ ...form, dateOfBirth: v })} type="date" half />
            <FormField label="Emergency Contact" value={form.emergencyContact} onChange={(v) => setForm({ ...form, emergencyContact: v })} placeholder="Contact name" half />
            <FormField label="Emergency Phone" value={form.emergencyPhone} onChange={(v) => setForm({ ...form, emergencyPhone: v })} type="tel" placeholder="+254 700 000 000" half />
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Personal Information" subtitle="Your profile details">
          <InfoRow label="Full Name"         value={profile.name}             icon={User} />
          <InfoRow label="Email"             value={profile.email}            icon={User} />
          <InfoRow label="Phone"             value={profile.phoneNumber}      icon={Phone} />
          <InfoRow label="Rank"              value={profile.rank}             icon={BadgeCheck} />
          <InfoRow label="Department"        value={profile.department}       icon={Briefcase} />
          <InfoRow label="Date of Birth"     value={profile.dateOfBirth ? format(new Date(profile.dateOfBirth), "dd MMM yyyy") : null} icon={Calendar} />
          <InfoRow label="Emergency Contact" value={profile.emergencyContact} icon={User} />
          <InfoRow label="Emergency Phone"   value={profile.emergencyPhone}   icon={Phone} />
        </SectionCard>
      )}

      {/* ── Assignment info (read-only) ── */}
      <SectionCard title="Assignment & Access" subtitle="Role and station assignment managed by administrators">
        <InfoRow label="Role"         value={ROLE_LABELS[profile.role]}  icon={Shield} />
        <InfoRow label="Badge Number" value={profile.badgeNumber}        icon={Hash} />
        <InfoRow label="Station"      value={profile.station ? `${profile.station.name} (${profile.station.code})` : null} icon={Building2} />
        <InfoRow label="Account Status" value={profile.isActive ? "Active" : "Deactivated"} />
        <InfoRow label="Member Since"   value={format(new Date(profile.createdAt), "dd MMMM yyyy")} icon={Calendar} />
      </SectionCard>

      {/* ── Change password ── */}
      <SectionCard title="Security" subtitle="Change your login password">
        <div className="space-y-4 max-w-sm">
          {([
            { label: "Current Password",     key: "currentPassword" as const, showKey: "current"  as const },
            { label: "New Password",         key: "newPassword"     as const, showKey: "new"      as const },
            { label: "Confirm New Password", key: "confirmPassword" as const, showKey: "confirm"  as const },
          ]).map(({ label, key, showKey }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={showPw[showKey] ? "text" : "password"}
                  value={pwForm[key]}
                  onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    pwErrors[key] ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw({ ...showPw, [showKey]: !showPw[showKey] })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwErrors[key] && <p className="mt-1 text-xs text-red-500">{pwErrors[key]}</p>}
            </div>
          ))}

          <button
            onClick={handleChangePassword}
            disabled={pwSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-60 transition-colors"
          >
            {pwSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {pwSaving ? "Updating…" : "Update Password"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}