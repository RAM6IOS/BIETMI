import { useTranslation } from 'react-i18next';
import type { PurchaseOrderStatusValue } from '../../api/purchaseOrders';
import {
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_STYLES,
} from './purchase-order-labels';

export function PurchaseOrderStatusBadge({
  status,
}: {
  status: PurchaseOrderStatusValue;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        PURCHASE_ORDER_STATUS_STYLES[status],
      ].join(' ')}
    >
      {t(PURCHASE_ORDER_STATUS_LABELS[status])}
    </span>
  );
}