import type { Role } from '../../api/invoices';

const CAN_WRITE: Partial<Record<Role, boolean>> = {
  admin: true,
  commercial: true,
  accountant: false,
};

export function canWriteInvoices(role: Role | null): boolean {
  return role ? CAN_WRITE[role] === true : false;
}