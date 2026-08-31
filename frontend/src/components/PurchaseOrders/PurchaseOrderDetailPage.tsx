import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPurchaseOrder } from '../../api/purchaseOrders';
import type { PurchaseOrder } from '../../api/purchaseOrders';
import { translateApiError } from '../../api/errors';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { PurchaseOrderStatusBadge } from './PurchaseOrderBadges';
import { PurchaseOrderDocument } from './PurchaseOrderDocument';
import { useAuthRole } from '../../hooks/useAuthRole';
import { useCompany } from '../../hooks/useCompany';

export function PurchaseOrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const role = useAuthRole();
  const canView = role === 'admin' || role === 'purchasing';
  const { company } = useCompany();

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true);
    setError('');
    getPurchaseOrder(id)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(translateApiError(err) || t('purchaseOrders:loadFailedOne'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500" aria-busy="true">
        <Spinner />
      </div>
    );
  }

  if (error || !order) {
    return (
      <EmptyState
        title={t('purchaseOrders:loadErrorTitle')}
        description={error || t('purchaseOrders:notFound')}
      >
        <Link to="/purchase-orders">
          <Button>{t('purchaseOrders:backToOrders')}</Button>
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="no-print mb-4">
        <Link
          to="/purchase-orders"
          className="text-sm text-primary-600 hover:text-primary-800"
        >
          → {t('purchaseOrders:backToOrders')}
        </Link>
      </div>

      <div className="no-print flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-gray-900">
            {order.orderNumber}
          </h1>
          <PurchaseOrderStatusBadge status={order.status} />
        </div>
        <div className="flex gap-2">
          {canView && (
            <Button onClick={() => window.print()}>
              {t('purchaseOrders:printSavePdf')}
            </Button>
          )}
        </div>
      </div>

      <Card className="p-4 sm:p-8 print-area">
        <PurchaseOrderDocument order={order} company={company} />
      </Card>
    </div>
  );
}