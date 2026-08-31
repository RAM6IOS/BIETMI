import type { Role } from '../api/invoices';

interface JwtPayload {
  userId?: string;
  role?: string;
  exp?: number;
}

function decodeBase64Url(part: string): string {
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  );
  try {
    return decodeURIComponent(
      Array.from(atob(padded))
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
  } catch {
    return atob(padded);
  }
}

export function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    return JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 <= Date.now();
}

export function getTokenRole(token: string | null): Role | null {
  if (!token) return null;
  const payload = parseJwt(token);
  if (!payload || typeof payload.role !== 'string') return null;
  const role = payload.role as Role;
  const allowed: Role[] = ['admin', 'commercial', 'purchasing', 'accountant'];
  return allowed.includes(role) ? role : null;
}