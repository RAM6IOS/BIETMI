import { ApiError, request } from './http';

export { ApiError };

export type PurchaseOrderStatusValue = 'draft' | 'sent';

export interface PurchaseOrderSupplier {
  id: string;
  name: string;
  type: string;
  nif: string | null;
}

export interface PurchaseOrderCreator {
  id: string;
  username: string;
  fullName: string;
}

export interface PurchaseOrderLine {
  id: string;
  purchaseOrderId: string;
  description: string;
  unit: string | null;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  createdByUserId: string;
  orderDate: string;
  status: PurchaseOrderStatusValue;
  subtotal: string;
  tvaAmount: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  supplier?: PurchaseOrderSupplier;
  createdBy?: PurchaseOrderCreator;
  lines?: PurchaseOrderLine[];
}

export interface PurchaseOrderLineInput {
  description: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrderInput {
  supplierId: string;
  orderDate?: string;
  lines: PurchaseOrderLineInput[];
}

export interface PaginatedPurchaseOrders {
  data: PurchaseOrder[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListPurchaseOrdersParams {
  status?: PurchaseOrderStatusValue;
  search?: string;
  sortBy?: 'orderNumber' | 'orderDate' | 'totalAmount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export function listPurchaseOrders(params: ListPurchaseOrdersParams = {}) {
  return request<PaginatedPurchaseOrders>('/purchase-orders', {
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

export function getPurchaseOrder(id: string) {
  return request<PurchaseOrder>(`/purchase-orders/${id}`);
}

export function createPurchaseOrder(input: PurchaseOrderInput) {
  return request<PurchaseOrder>('/purchase-orders', {
    method: 'POST',
    body: input,
  });
}

export function sendPurchaseOrder(id: string) {
  return request<PurchaseOrder>(`/purchase-orders/${id}/send`, {
    method: 'POST',
  });
}