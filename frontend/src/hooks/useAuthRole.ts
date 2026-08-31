import { useAuth } from '../contexts/useAuth';
import { getTokenRole } from '../utils/jwt';
import type { Role } from '../api/invoices';

export function useAuthRole(): Role | null {
  const { token } = useAuth();
  return getTokenRole(token);
}