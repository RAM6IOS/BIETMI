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

export type PartnerCurrency = 'DZD' | 'FOREIGN';

export interface Supplier {
  id: string;
  name: string;
  commercialRegister: string | null;
  nif: string | null;
  address: string | null;
  paymentTerms: string | null;
  currency: PartnerCurrency;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  contacts?: Contact[];
}

export interface SupplierInput {
  name: string;
  commercialRegister?: string | null;
  nif?: string | null;
  address?: string | null;
  paymentTerms?: string | null;
  currency?: PartnerCurrency;
  contacts?: Contact[];
}

export interface ListSuppliersParams {
  search?: string;
  sortBy?: 'name' | 'nif' | 'commercialRegister' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export type SupplierDetail = Supplier & {
  invoices: InvoiceSummary[];
  purchaseOrders: PurchaseOrder[];
};

export interface PaginatedSuppliers {
  data: Supplier[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function listSuppliers(params: ListSuppliersParams = {}) {
  return request<PaginatedSuppliers>('/suppliers', {
    params: {
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      page: params.page ? String(params.page) : undefined,
      limit: params.limit ? String(params.limit) : undefined,
    },
  });
}

export function getSupplier(id: string) {
  return request<SupplierDetail>(`/suppliers/${id}`);
}

export function createSupplier(input: SupplierInput) {
  return request<Supplier>('/suppliers', { method: 'POST', body: input });
}

export function updateSupplier(id: string, input: Partial<SupplierInput>) {
  return request<Supplier>(`/suppliers/${id}`, { method: 'PATCH', body: input });
}

export function deleteSupplier(id: string) {
  return request<void>(`/suppliers/${id}`, { method: 'DELETE' });
}
