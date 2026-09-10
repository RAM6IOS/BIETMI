import { ApiError, request } from './http';

export { ApiError };

export type InvoiceStatusValue =
  | 'draft'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'overdue';
export type Role = 'admin' | 'commercial' | 'purchasing' | 'accountant';

export interface InvoiceContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export interface InvoicePartner {
  id: string;
  name: string;
  type: string;
  nif: string | null;
  address?: string | null;
  contacts?: InvoiceContact[];
}

export interface InvoiceCreator {
  id: string;
  username: string;
  fullName: string;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  description: string;
  unit: string | null;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export type PaymentMethod = {
  label: string;
  percentage: number;
};

export interface Invoice {
  id: string;
  invoiceNumber: string | null;
  partnerId: string;
  createdByUserId: string;
  issueDate: string;
  dueDate: string | null;
  status: InvoiceStatusValue;
  subtotal: string;
  discountPercent: string;
  discountAmount: string;
  tvaAmount: string;
  totalAmount: string;
  paymentMethods: PaymentMethod[] | null;
  internalReference: string | null;
  objet: string | null;
  createdAt: string;
  updatedAt: string;
  partner?: InvoicePartner;
  lines?: InvoiceLine[];
  createdBy?: InvoiceCreator;
}

export interface InvoiceLineInput {
  description: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceInput {
  partnerId: string;
  issueDate?: string;
  dueDate?: string;
  internalReference?: string;
  objet?: string;
  discountPercent?: number;
  paymentMethods?: PaymentMethod[];
  lines: InvoiceLineInput[];
}

export type OutstandingRow = Invoice & { isOverdue: boolean };

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string | null;
  issueDate: string;
  dueDate: string | null;
  status: InvoiceStatusValue;
  subtotal: string;
  discountPercent: string;
  discountAmount: string;
  tvaAmount: string;
  totalAmount: string;
  paymentMethods: PaymentMethod[] | null;
  createdAt: string;
}

export interface PaginatedInvoices {
  data: Invoice[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListInvoicesParams {
  status?: InvoiceStatusValue;
  search?: string;
  sortBy?: 'invoiceNumber' | 'issueDate' | 'totalAmount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export function listInvoices(params: ListInvoicesParams = {}) {
  return request<PaginatedInvoices>('/invoices', {
    params: {
      status: params.status,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      page: params.page ? String(params.page) : undefined,
      limit: params.limit ? String(params.limit) : undefined,
    },
  });
}

export function getInvoice(id: string) {
  return request<Invoice>(`/invoices/${id}`);
}

export function createInvoice(input: InvoiceInput) {
  return request<Invoice>('/invoices', { method: 'POST', body: input });
}

export function updateInvoice(id: string, input: Partial<InvoiceInput>) {
  return request<Invoice>(`/invoices/${id}`, { method: 'PATCH', body: input });
}

export function deleteInvoice(id: string) {
  return request<void>(`/invoices/${id}`, { method: 'DELETE' });
}

export function issueInvoice(id: string) {
  return request<Invoice>(`/invoices/${id}/issue`, { method: 'POST' });
}

export function listOutstanding(overdue = false) {
  return request<OutstandingRow[]>('/invoices/reports/outstanding', {
    params: {
      overdue: overdue ? 'true' : undefined,
    },
  });
}