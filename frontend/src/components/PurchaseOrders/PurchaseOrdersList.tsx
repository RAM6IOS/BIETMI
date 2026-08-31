import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { PurchaseOrder } from '../../api/purchaseOrders';
import { PurchaseOrderStatusBadge } from './PurchaseOrderBadges';
import { EmptyState } from '../ui/EmptyState';
import { formatAmount, formatDate } from '../Invoices/invoice-labels';

export function PurchaseOrdersList({ orders }: { orders: PurchaseOrder[] }) {
  const { t } = useTranslation();
  if (orders.length === 0) {
    return <EmptyState title={t('purchaseOrders:emptySupplier')} />;
  }

  return (
    <div className="overflow-hidden border border-border rounded-lg">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-surface-2">
          <tr>
            <th className="px-4 py-2.5 text-end font-medium text-text-secondary">
              {t('purchaseOrders:orderNumber')}
            </th>
            <th className="px-4 py-2.5 text-end font-medium text-text-secondary">
              {t('purchaseOrders:orderDate')}
            </th>
            <th className="px-4 py-2.5 text-end font-medium text-text-secondary">
              {t('purchaseOrders:status')}
            </th>
            <th className="px-4 py-2.5 text-end font-medium text-text-secondary">
              {t('purchaseOrders:total')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-surface-2/60">
              <td className="px-4 py-3">
                <Link
                  to={`/purchase-orders/${o.id}`}
                  className="font-medium text-primary-600 hover:text-primary-800"
                >
                  {t('purchaseOrders:orderRef', { number: o.orderNumber })}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                {formatDate(o.orderDate)}
              </td>
              <td className="px-4 py-3">
                <PurchaseOrderStatusBadge status={o.status} />
              </td>
              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                {formatAmount(o.totalAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}