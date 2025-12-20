import { UserRole } from '@prisma/client'; // Changed from '@/lib/constants/roles'

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  badgeNumber?: string;
  stationId?: string;
  stationName?: string;
  phoneNumber?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  badgeNumber?: string;
  stationId?: string;
  phoneNumber?: string;
}

export interface LoginData {
  email: string;
  password: string;
}