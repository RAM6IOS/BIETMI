import type { PurchaseOrder } from './purchaseOrders';
import type { InvoiceSummary } from './invoices';
import { ApiError, request } from './http';

export { ApiError };

export interface Contact {
  id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  position?: string | null;
  isPrimary?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  commercialRegister: string | null;
  nif: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  contacts?: Contact[];
  invoices: InvoiceSummary[];
}

export interface CustomerInput {
  name: string;
  commercialRegister?: string | null;
  nif?: string | null;
  address?: string | null;
  contacts?: Contact[];
}

export interface ListCustomersParams {
  search?: string;
  sortBy?: 'name' | 'nif' | 'commercialRegister' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export type CustomerDetail = Customer & {
  purchaseOrders: PurchaseOrder[];
};

export interface PaginatedCustomers {
  data: Customer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function listCustomers(params: ListCustomersParams = {}) {
  return request<PaginatedCustomers>('/customers', {
    params: {
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      page: params.page ? String(params.page) : undefined,
      limit: params.limit ? String(params.limit) : undefined,
    },
  });
}

export function getCustomer(id: string) {
  return request<CustomerDetail>(`/customers/${id}`);
}

export function createCustomer(input: CustomerInput) {
  return request<Customer>('/customers', { method: 'POST', body: input });
}

export function updateCustomer(id: string, input: Partial<CustomerInput>) {
  return request<Customer>(`/customers/${id}`, { method: 'PATCH', body: input });
}

export function deleteCustomer(id: string) {
  return request<void>(`/customers/${id}`, { method: 'DELETE' });
}
