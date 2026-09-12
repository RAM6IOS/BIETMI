import type { Invoice, PaymentMethod } from './invoices';
import { ApiError, request } from './http';

export { ApiError };

export type QuoteStatusValue =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'revision_requested';

export interface QuotePartner {
  id: string;
  name: string;
  type: string;
  nif: string | null;
  address?: string | null;
  contacts?: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    isPrimary: boolean;
  }>;
}

export interface QuoteCreator {
  id: string;
  username: string;
  fullName: string;
}

export interface QuoteRevisionSummary {
  id: string;
  quoteNumber: string;
  status: QuoteStatusValue;
}

export interface QuoteSummary {
  id: string;
  quoteNumber: string;
  status: QuoteStatusValue;
  createdAt: string;
  supersedesQuoteId: string | null;
  supersedesQuote?: Pick<QuoteRevisionSummary, 'id' | 'quoteNumber'> | null;
  revisions?: Pick<QuoteRevisionSummary, 'id' | 'quoteNumber'>[];
}

export interface QuoteLine {
  id: string;
  quoteId: string;
  description: string;
  unit: string | null;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  partnerId: string;
  createdByUserId: string;
  status: QuoteStatusValue;
  objet: string | null;
  subtotal: string;
  discountPercent: string;
  discountAmount: string;
  tvaAmount: string;
  totalAmount: string;
  paymentMethods: PaymentMethod[] | null;
  convertedToInvoiceId: string | null;
  supersedesQuoteId: string | null;
  supersedesQuote?: QuoteRevisionSummary | null;
  revisions?: QuoteRevisionSummary[];
  createdAt: string;
  updatedAt: string;
  partner?: QuotePartner;
  lines?: QuoteLine[];
  createdBy?: QuoteCreator;
}

export interface QuoteLineInput {
  description: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
}

export interface QuoteInput {
  partnerId: string;
  objet?: string;
  discountPercent?: number;
  paymentMethods?: PaymentMethod[];
  lines: QuoteLineInput[];
}

export interface PaginatedQuotes {
  data: Quote[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListQuotesParams {
  status?: QuoteStatusValue;
  search?: string;
  sortBy?: 'quoteNumber' | 'totalAmount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export function listQuotes(params: ListQuotesParams = {}) {
  return request<PaginatedQuotes>('/quotes', {
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

export function getQuote(id: string) {
  return request<Quote>(`/quotes/${id}`);
}

export function createQuote(input: QuoteInput) {
  return request<Quote>('/quotes', { method: 'POST', body: input });
}

export function updateQuote(id: string, input: Partial<QuoteInput>) {
  return request<Quote>(`/quotes/${id}`, { method: 'PATCH', body: input });
}

export function deleteQuote(id: string) {
  return request<void>(`/quotes/${id}`, { method: 'DELETE' });
}

export function sendQuote(id: string) {
  return request<Quote>(`/quotes/${id}/send`, { method: 'POST' });
}

export function updateQuoteStatus(id: string, status: QuoteStatusValue) {
  return request<Quote>(`/quotes/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export function convertQuoteToInvoice(id: string) {
  return request<Invoice>(`/quotes/${id}/convert-to-invoice`, {
    method: 'POST',
  });
}

export function createQuoteRevision(id: string) {
  return request<Quote>(`/quotes/${id}/create-revision`, { method: 'POST' });
}