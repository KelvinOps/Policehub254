// types/communications.ts

export type MessagePriority = "HIGH" | "MEDIUM" | "LOW" | "URGENT";
export type MessageStatus = "SENT" | "DELIVERED" | "READ" | "ARCHIVED";
export type AlertType = "CRITICAL" | "WARNING" | "INFO" | "SUCCESS" | "APB";
export type AlertPriority = "HIGH" | "MEDIUM" | "LOW" | "URGENT";
export type AlertScope = "STATION" | "COUNTY" | "NATIONAL";
export type MessageTab = "inbox" | "sent" | "archived";

export interface MessageUser {
  id: string;
  name: string;
  role: string;
  badgeNumber?: string | null;
  rank?: string | null;
  department?: string | null;
  avatar?: string | null;
  stationId?: string | null;
}

export interface InternalMessage {
  id: string;
  senderId: string;
  sender: MessageUser;
  receiverId: string;
  receiver: MessageUser;
  subject: string;
  content: string;
  status: MessageStatus;
  priority: MessagePriority;
  isRead: boolean;
  readAt?: string | null;
  isArchived: boolean;
  archivedAt?: string | null;
  threadId?: string | null;
  replyToId?: string | null;
  attachments: string[];
  stationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComposeData {
  receiverId: string;
  subject: string;
  content: string;
  priority: MessagePriority;
  replyToId?: string;
  threadId?: string;
}

export interface MessagesApiResponse {
  messages: InternalMessage[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export interface AlertAcknowledgment {
  id: string;
  alertId: string;
  userId: string;
  user: { id: string; name: string; role: string; badgeNumber?: string | null };
  acknowledgedAt: string;
  notes?: string | null;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  priority: AlertPriority;
  scope: AlertScope;
  targetRoles: string[];
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    role: string;
    badgeNumber?: string | null;
  };
  stationId?: string | null;
  station?: { id: string; name: string; code: string } | null;
  isActive: boolean;
  expiresAt?: string | null;
  acknowledgments: AlertAcknowledgment[];
  acknowledgedByMe?: boolean;
  metadata?: Record<string, unknown> | null;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertData {
  title: string;
  message: string;
  type: AlertType;
  priority: AlertPriority;
  scope: AlertScope;
  targetRoles: string[];
  stationId?: string;
  expiresAt?: string;
}

export interface AlertStats {
  total: number;
  active: number;
  critical: number;
  unacknowledged: number;
}

export interface AlertsApiResponse {
  alerts: Alert[];
  stats: AlertStats;
  total: number;
}