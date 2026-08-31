import type { PurchaseOrderStatusValue } from '../../api/purchaseOrders';

export const PURCHASE_ORDER_STATUS_LABELS: Record<
  PurchaseOrderStatusValue,
  string
> = {
  draft: 'purchaseOrders:statusDraft',
  sent: 'purchaseOrders:statusSent',
};

export const PURCHASE_ORDER_STATUS_STYLES: Record<
  PurchaseOrderStatusValue,
  string
> = {
  draft: 'bg-surface-2 text-text-secondary border border-border',
  sent: 'bg-primary-50 text-primary-700 border border-primary-100',
};