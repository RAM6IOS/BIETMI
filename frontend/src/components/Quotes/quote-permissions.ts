import type { Role } from '../../api/invoices';

export function canReadQuotes(role: Role | null): boolean {
  return role === 'admin' || role === 'commercial';
}

export function canWriteQuotes(role: Role | null): boolean {
  return role === 'admin' || role === 'commercial';
}