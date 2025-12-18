//lib/utils/cn.ts


import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge to handle conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to Kenyan locale
 */
export function formatDate(date: Date | string, format: "short" | "long" | "time" = "long"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Africa/Nairobi",
  };

  switch (format) {
    case "short":
      options.year = "numeric";
      options.month = "short";
      options.day = "numeric";
      break;
    case "long":
      options.year = "numeric";
      options.month = "long";
      options.day = "numeric";
      options.hour = "2-digit";
      options.minute = "2-digit";
      break;
    case "time":
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.second = "2-digit";
      break;
  }

  return new Intl.DateTimeFormat("en-KE", options).format(d);
}

/**
 * Format currency to Kenyan Shillings
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(amount);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate OB Number (Format: OB-XXX/STATION/YYYY)
 */
export function generateOBNumber(sequence: number, stationCode: string): string {
  const year = new Date().getFullYear();
  const paddedSequence = String(sequence).padStart(4, "0");
  return `OB-${paddedSequence}/${stationCode}/${year}`;
}

/**
 * Format phone number to Kenyan format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, "");
  
  // Add +254 if not present
  if (cleaned.startsWith("254")) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith("0")) {
    return `+254${cleaned.slice(1)}`;
  } else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
    return `+254${cleaned}`;
  }
  
  return phone;
}

/**
 * Validate Kenyan ID Number (8 digits)
 */
export function isValidKenyanID(id: string): boolean {
  const cleaned = id.replace(/\D/g, "");
  return cleaned.length === 8;
}

/**
 * Get time ago string
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
}