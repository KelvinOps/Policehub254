// app/dashboard/communications/messages/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Send,
  Plus,
  Archive,
  Trash2,
  Paperclip,
  Inbox,
  X,
  CheckCheck,
  Clock,
  RefreshCw,
  Reply,
  MailOpen,
  Filter,
  ChevronDown,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type {
  InternalMessage,
  MessageUser,
  ComposeData,
  MessageTab,
  MessagePriority,
} from "@/types/communications";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  MessagePriority,
  { label: string; className: string }
> = {
  URGENT: {
    label: "URGENT",
    className: "bg-red-100 text-red-700 border border-red-200",
  },
  HIGH: {
    label: "HIGH",
    className: "bg-orange-100 text-orange-700 border border-orange-200",
  },
  MEDIUM: {
    label: "MEDIUM",
    className: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  LOW: {
    label: "LOW",
    className: "bg-gray-100 text-gray-600 border border-gray-200",
  },
};

const PRIORITY_ACTIVE: Record<MessagePriority, string> = {
  URGENT: "bg-red-600 text-white border-red-600",
  HIGH: "bg-orange-500 text-white border-orange-500",
  MEDIUM: "bg-blue-600 text-white border-blue-600",
  LOW: "bg-gray-600 text-white border-gray-600",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: MessagePriority }) {
  const { label, className } = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.MEDIUM;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${className}`}>
      {label}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "READ")
    return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
  if (status === "DELIVERED")
    return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
  return <Clock className="w-3.5 h-3.5 text-gray-300" />;
}

function Avatar({
  name,
  size = "sm",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const palette = [
    "bg-blue-600",
    "bg-indigo-600",
    "bg-violet-600",
    "bg-emerald-600",
    "bg-rose-600",
    "bg-amber-600",
    "bg-cyan-600",
    "bg-teal-600",
  ];
  const color = palette[name.charCodeAt(0) % palette.length];

  const sizeClass = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  }[size];

  return (
    <div
      className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

// ─── Compose Modal ────────────────────────────────────────────────────────────

interface ComposeModalProps {
  onClose: () => void;
  onSend: (data: ComposeData) => Promise<void>;
  replyTo?: InternalMessage;
  officers: MessageUser[];
}

function ComposeModal({ onClose, onSend, replyTo, officers }: ComposeModalProps) {
  const [form, setForm] = useState<ComposeData>({
    receiverId: replyTo?.senderId ?? "",
    subject: replyTo ? `Re: ${replyTo.subject}` : "",
    content: "",
    priority: "MEDIUM",
    replyToId: replyTo?.id,
    threadId: replyTo?.threadId ?? replyTo?.id,
  });
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.receiverId) e.receiverId = "Select a recipient";
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (!form.content.trim()) e.content = "Message cannot be empty";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setSending(true);
    try {
      await onSend(form);
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {replyTo ? "Reply to Message" : "New Message"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To <span className="text-red-500">*</span>
            </label>
            <select
              value={form.receiverId}
              onChange={(e) => setForm({ ...form, receiverId: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.receiverId ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
            >
              <option value="">Select officer...</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} — {o.role.replace(/_/g, " ")}
                  {o.badgeNumber ? ` (${o.badgeNumber})` : ""}
                </option>
              ))}
            </select>
            {errors.receiverId && (
              <p className="mt-1 text-xs text-red-500">{errors.receiverId}</p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Message subject..."
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.subject ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
            />
            {errors.subject && (
              <p className="mt-1 text-xs text-red-500">{errors.subject}</p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <div className="flex gap-2">
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as MessagePriority[]).map(
                (p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      form.priority === p
                        ? PRIORITY_ACTIVE[p]
                        : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write your message here..."
              rows={8}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                errors.content ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
            />
            {errors.content && (
              <p className="mt-1 text-xs text-red-500">{errors.content}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Paperclip className="w-4 h-4" />
            Attach file
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [selected, setSelected] = useState<InternalMessage | null>(null);
  const [tab, setTab] = useState<MessageTab>("inbox");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState<InternalMessage | undefined>();
  const [officers, setOfficers] = useState<MessageUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab,
        search,
        priority: priorityFilter,
        page: String(page),
        limit: "20",
      });
      const res = await fetch(`/api/communications/messages?${params}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setMessages(data.messages ?? []);
      setTotalCount(data.total ?? 0);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [tab, search, priorityFilter, page]);

  const fetchOfficers = useCallback(async () => {
    try {
      const res = await fetch("/api/personnel?limit=200&isActive=true");
      if (res.ok) {
        const data = await res.json();
        setOfficers(data.users ?? []);
      }
    } catch {
      // silently fail — officers list is non-critical
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    fetchOfficers();
  }, [fetchOfficers]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openMessage = async (msg: InternalMessage) => {
    setSelected(msg);
    if (!msg.isRead && msg.receiverId) {
      try {
        await fetch(`/api/communications/messages/${msg.id}/read`, {
          method: "PATCH",
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, isRead: true, status: "READ" } : m
          )
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // non-critical
      }
    }
  };

  const handleSend = async (data: ComposeData) => {
    const res = await fetch("/api/communications/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await fetchMessages();
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await fetch(`/api/communications/messages/${id}/archive`, {
        method: "PATCH",
      });
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      // non-critical
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this message? This cannot be undone.")) return;
    try {
      await fetch(`/api/communications/messages/${id}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      // non-critical
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      await fetch("/api/communications/messages/markAllRead", {
        method: "PATCH",
      });
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true, status: "READ" as const })));
      setUnreadCount(0);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleReply = (msg: InternalMessage) => {
    setReplyTo(msg);
    setShowCompose(true);
  };

  const closeCompose = () => {
    setShowCompose(false);
    setReplyTo(undefined);
  };

  // ── Tab change helpers ──────────────────────────────────────────────────────

  const changeTab = (newTab: MessageTab) => {
    setTab(newTab);
    setSelected(null);
    setPage(1);
    setSearch("");
    setPriorityFilter("ALL");
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">
      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          onClose={closeCompose}
          onSend={handleSend}
          replyTo={replyTo}
          officers={officers}
        />
      )}

      {/* ── Sidebar (folders + priority filter) ── */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Compose button */}
        <div className="p-3 border-b border-gray-100">
          <button
            onClick={() => setShowCompose(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Compose
          </button>
        </div>

        {/* Folder nav */}
        <nav className="p-2 space-y-0.5 border-b border-gray-100">
          {(
            [
              { id: "inbox" as MessageTab, label: "Inbox", icon: Inbox },
              { id: "sent" as MessageTab, label: "Sent", icon: Send },
              { id: "archived" as MessageTab, label: "Archived", icon: Archive },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => changeTab(id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                tab === id
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4" />
                {label}
              </div>
              {id === "inbox" && unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Priority filter */}
        <div className="p-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5">
            Filter by Priority
          </p>
          {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                priorityFilter === p
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {p === "ALL" ? "All Priorities" : p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Mark all read (inbox only) */}
        {tab === "inbox" && unreadCount > 0 && (
          <div className="mt-auto p-3 border-t border-gray-100">
            <button
              onClick={handleMarkAllRead}
              disabled={markingAllRead}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {markingAllRead ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              Mark all as read
            </button>
          </div>
        )}
      </div>

      {/* ── Message list ── */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Search */}
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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
        </div>

        {/* List header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50">
          <span className="text-xs text-gray-400 font-medium">
            {loading ? "Loading..." : `${totalCount} message${totalCount !== 1 ? "s" : ""}`}
          </span>
          <button
            onClick={fetchMessages}
            disabled={loading}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            // Skeleton
            <div className="space-y-0.5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-gray-50 animate-pulse">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 p-4">
              <Inbox className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium text-gray-500">No messages</p>
              <p className="text-xs text-center mt-1">
                {search
                  ? `No results for "${search}"`
                  : tab === "inbox"
                  ? "Your inbox is empty"
                  : tab === "sent"
                  ? "No sent messages yet"
                  : "No archived messages"}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const counterpart = tab === "sent" ? msg.receiver : msg.sender;
              const isUnread = !msg.isRead && tab === "inbox";

              return (
                <button
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    selected?.id === msg.id
                      ? "bg-blue-50 border-l-2 border-l-blue-600"
                      : "border-l-2 border-l-transparent"
                  } ${isUnread ? "bg-blue-50/40" : ""}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="relative flex-shrink-0">
                      <Avatar name={counterpart.name} />
                      {isUnread && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={`text-sm truncate ${
                            isUnread
                              ? "font-semibold text-gray-900"
                              : "font-medium text-gray-700"
                          }`}
                        >
                          {counterpart.name}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                          {formatDistanceToNow(new Date(msg.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p
                        className={`text-xs truncate mb-1 ${
                          isUnread
                            ? "font-medium text-gray-800"
                            : "text-gray-600"
                        }`}
                      >
                        {msg.subject}
                      </p>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-gray-400 truncate flex-1">
                          {msg.content.slice(0, 55)}
                          {msg.content.length > 55 ? "..." : ""}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <PriorityBadge priority={msg.priority} />
                          {tab === "sent" && <StatusIcon status={msg.status} />}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalCount > 20 && (
          <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-white">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs text-gray-500 disabled:opacity-40 hover:text-blue-600 transition-colors font-medium"
            >
              ← Previous
            </button>
            <span className="text-xs text-gray-400">
              {(page - 1) * 20 + 1}–{Math.min(page * 20, totalCount)} of{" "}
              {totalCount}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= totalCount}
              className="text-xs text-gray-500 disabled:opacity-40 hover:text-blue-600 transition-colors font-medium"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Message viewer ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selected ? (
          <>
            {/* Viewer header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1.5 leading-tight">
                    {selected.subject}
                  </h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    <PriorityBadge priority={selected.priority} />
                    <span className="text-sm text-gray-500">
                      From{" "}
                      <span className="font-medium text-gray-700">
                        {selected.sender.name}
                      </span>
                    </span>
                    <span className="text-gray-300">→</span>
                    <span className="text-sm text-gray-500">
                      To{" "}
                      <span className="font-medium text-gray-700">
                        {selected.receiver.name}
                      </span>
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(selected.createdAt), "PPpp")}
                    </span>
                    {selected.status === "READ" && (
                      <span className="flex items-center gap-1 text-xs text-blue-500">
                        <CheckCheck className="w-3.5 h-3.5" />
                        Read
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleReply(selected)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    Reply
                  </button>
                  <button
                    onClick={() => handleArchive(selected.id)}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Archive"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Message body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl">
                <div className="flex gap-4 mb-6">
                  <Avatar name={selected.sender.name} size="md" />
                  <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    {/* Sender info */}
                    <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-50">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {selected.sender.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {selected.sender.role.replace(/_/g, " ")}
                          {selected.sender.badgeNumber
                            ? ` · Badge #${selected.sender.badgeNumber}`
                            : ""}
                          {selected.sender.rank
                            ? ` · ${selected.sender.rank}`
                            : ""}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {format(new Date(selected.createdAt), "dd MMM yyyy, HH:mm")}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {selected.content}
                    </p>

                    {/* Attachments */}
                    {selected.attachments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-50">
                        <p className="text-xs font-medium text-gray-500 mb-2">
                          Attachments ({selected.attachments.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selected.attachments.map((att, i) => (
                            <a
                              key={i}
                              href={att}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              <Paperclip className="w-3 h-3" />
                              {att.split("/").pop() ?? `Attachment ${i + 1}`}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick reply prompt */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 flex-shrink-0" />
                  <button
                    onClick={() => handleReply(selected)}
                    className="flex-1 text-left px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                  >
                    Click to reply to {selected.sender.name}...
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <MailOpen className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-base font-medium text-gray-500 mb-1">
              Select a message to read
            </p>
            <p className="text-sm text-gray-400 text-center">
              {unreadCount > 0
                ? `You have ${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}`
                : "Your inbox is up to date"}
            </p>
            <button
              onClick={() => setShowCompose(true)}
              className="mt-5 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Compose New Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
}