import { Navigate } from 'react-router-dom';
import { useAuthRole } from '../../hooks/useAuthRole';
import type { Role } from '../../api/invoices';

export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const role = useAuthRole();
  if (!role || !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
