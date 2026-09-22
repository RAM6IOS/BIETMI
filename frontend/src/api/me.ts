import { request } from './http';
import type { Role } from './invoices';

export interface Me {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  workspace: 'production' | 'sandbox';
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

/** Returns the live profile for the current session (fresh role, active flag). */
export function fetchMe(): Promise<Me> {
  return request<Me>('/auth/me');
}