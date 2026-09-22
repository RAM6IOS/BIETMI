import { useAuth } from '../contexts/useAuth';
import { getTokenRole } from '../utils/jwt';
import type { Role } from '../api/invoices';

export function useAuthRole(): Role | null {
  const { token, currentUser } = useAuth();

  // Live profile wins; the token claim is only a fallback until /auth/me
  // resolves, so a role change is reflected on the next fetch — no re-login.
  if (currentUser) {
    return currentUser.role;
  }

  return getTokenRole(token);
}