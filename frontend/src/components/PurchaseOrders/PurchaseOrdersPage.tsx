import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listPurchaseOrders, sendPurchaseOrder } from '../../api/purchaseOrders';
import type {
  PurchaseOrder,
  PurchaseOrderStatusValue,
} from '../../api/purchaseOrders';
import { translateApiError } from '../../api/errors';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { Toast } from '../ui/Toast';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { Table } from '../ui/Table';
import type { TableColumn } from '../ui/Table';
import { PurchaseOrderStatusBadge } from './PurchaseOrderBadges';
import { PURCHASE_ORDER_STATUS_LABELS } from './purchase-order-labels';
import { formatAmount, formatDate } from '../Invoices/invoice-labels';
import { ConfirmDialog } from '../Invoices/ConfirmDialog';

const PAGE_SIZE = 20;

function applySuccess(
  timeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  setSuccess: (m: string | null) => void,
  message: string,
) {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  setSuccess(message);
  timeoutRef.current = setTimeout(() => setSuccess(null), 3000);
}

export function PurchaseOrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const STATUS_OPTIONS: {
    value: PurchaseOrderStatusValue | '';
    label: string;
  }[] = [
    { value: '', label: t('purchaseOrders:allStatuses') },
    { value: 'draft', label: t(PURCHASE_ORDER_STATUS_LABELS.draft) },
    { value: 'sent', label: t(PURCHASE_ORDER_STATUS_LABELS.sent) },
  ];

  const SORT_OPTIONS: { value: string; label: string }[] = [
    { value: 'createdAt-desc', label: t('purchaseOrders:sortNewest') },
    { value: 'orderDate-desc', label: t('purchaseOrders:sortOrderDateDesc') },
    { value: 'orderDate-asc', label: t('purchaseOrders:sortOrderDateAsc') },
    { value: 'totalAmount-desc', label: t('purchaseOrders:sortTotalDesc') },
    { value: 'orderNumber-asc', label: t('purchaseOrders:sortNumberAsc') },
  ];

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PurchaseOrderStatusValue | ''>('');
  const [search, setSearch] = useState('');
  const [sortValue, setSortValue] = useState('createdAt-desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sendTarget, setSendTarget] = useState<PurchaseOrder | null>(null);
  const [isSending, setIsSending] = useState(false);

  const parseSort = (v: string) => {
    const [by, order] = v.split('-') as [
      'createdAt' | 'orderDate' | 'totalAmount' | 'orderNumber',
      'asc' | 'desc',
    ];
    return { by, order };
  };

  useEffect(() => {
    let cancelled = false;
    const { by, order } = parseSort(sortValue);
    listPurchaseOrders({
      status: status || undefined,
      search: search.trim() || undefined,
      sortBy: by,
      sortOrder: order,
      page,
      limit: PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) return;
        setOrders(result.data);
        setTotal(result.meta.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(translateApiError(err) || t('purchaseOrders:loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, search, sortValue]);

  useEffect(() => {
    const timer = successTimer.current;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const handleSortChange = (value: string) => {
    setPage(1);
    setSortValue(value);
  };

  const handleSend = async () => {
    if (!sendTarget) return;
    setIsSending(true);
    try {
      await sendPurchaseOrder(sendTarget.id);
      setSendTarget(null);
      setPage(1);
      await new Promise<void>((resolve) => {
        const { by, order } = parseSort(sortValue);
        listPurchaseOrders({
          status: status || undefined,
          search: search.trim() || undefined,
          sortBy: by,
          sortOrder: order,
          page: 1,
          limit: PAGE_SIZE,
        })
          .then((result) => {
            setOrders(result.data);
            setTotal(result.meta.total);
          })
          .catch((err) => {
            setError(translateApiError(err) || t('purchaseOrders:loadFailed'));
          })
          .finally(() => resolve());
      });
      applySuccess(
        successTimer,
        setSuccess,
        t('purchaseOrders:sentSuccess', { number: sendTarget.orderNumber }),
      );
    } catch (err) {
      setError(translateApiError(err) || t('purchaseOrders:sendFailed'));
      setSendTarget(null);
    } finally {
      setIsSending(false);
    }
  };

  const columns: TableColumn<PurchaseOrder>[] = [
    {
      key: 'orderNumber',
      header: 'N°',
      render: (o) => (
        <span className="font-medium text-gray-900">{o.orderNumber}</span>
      ),
    },
    {
      key: 'supplier',
      header: 'Fournisseur',
      render: (o) => (
        <span className="text-gray-900">{o.supplier?.name ?? '—'}</span>
      ),
    },
    {
      key: 'orderDate',
      header: 'Date',
      render: (o) => (
        <span className="text-gray-500">{formatDate(o.orderDate)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (o) => <PurchaseOrderStatusBadge status={o.status} />,
    },
    {
      key: 'totalAmount',
      header: 'Montant TTC',
      className: 'text-end whitespace-nowrap',
      render: (o) => (
        <span className="font-medium text-gray-900">
          {formatAmount(o.totalAmount)}
        </span>
      ),
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="p-4 sm:p-6">
        <PageHeader
          title={t('purchaseOrders:title')}
          subtitle={t('purchaseOrders:subtitle')}
          actionLabel={t('purchaseOrders:new')}
          onAction={() => navigate('/purchase-orders/new')}
        />

        {success && (
          <div className="mt-4">
            <Toast>{success}</Toast>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <label htmlFor="po-search" className="sr-only">
            {t('purchaseOrders:searchLabel')}
          </label>
          <Input
            id="po-search"
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('purchaseOrders:searchPlaceholder')}
          />
          <label htmlFor="po-status" className="sr-only">
            {t('purchaseOrders:statusFilter')}
          </label>
          <Select
            id="po-status"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as PurchaseOrderStatusValue | '');
            }}
            className="sm:w-44"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <label htmlFor="po-sort" className="sr-only">
            {t('purchaseOrders:sortLabel')}
          </label>
          <Select
            id="po-sort"
            value={sortValue}
            onChange={(e) => handleSortChange(e.target.value)}
            className="sm:w-52"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        {error && (
          <div
            className="mt-4 text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="mt-4 border border-border rounded-lg">
          <div className="flex items-center justify-between border-b-2 border-border bg-surface-2 px-4 py-2">
            <span
              lang="fr"
              className="text-xs font-semibold tracking-wide text-text-secondary"
            >
              BON DE COMMANDE
            </span>
            <span className="text-xs text-text-secondary">
              {total > 0 ? t('purchaseOrders:ordersCount', { count: total }) : ''}
            </span>
          </div>
          {isLoading ? (
            <div className="text-center py-14">
              <Spinner />
            </div>
          ) : (
            <Table
              columns={columns}
              rows={orders}
              rowKey={(o) => o.id}
              emptyState={
                <EmptyState
                  title={t('purchaseOrders:empty')}
                  description={t('purchaseOrders:emptyDescription')}
                />
              }
              actions={(o) => (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/purchase-orders/${o.id}`)}
                  >
                    {t('common:view')}
                  </Button>
                  {o.status === 'draft' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSendTarget(o)}
                      className="text-success-600"
                    >
                      {t('common:send')}
                    </Button>
                  )}
                </>
              )}
            />
          )}
        </div>

        {!isLoading && (
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-sm text-text-secondary">
              {t('common:pagination.showing', { from, to, total })}
            </p>
            <div className="flex gap-1.5 items-center flex-wrap justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                {t('common:previous')}
              </Button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                .filter((n) => {
                  if (totalPages <= 7) return true;
                  if (n === 1 || n === totalPages) return true;
                  if (Math.abs(n - page) <= 1) return true;
                  return false;
                })
                .reduce<(number | 'ellipsis')[]>((acc, n, i, arr) => {
                  if (i > 0 && n - (arr[i - 1] as number) > 1)
                    acc.push('ellipsis');
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span
                      key={`e-${idx}`}
                      className="px-1 text-text-secondary"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={item}
                      variant={item === page ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPage(item)}
                      aria-current={item === page ? 'page' : undefined}
                    >
                      {item}
                    </Button>
                  ),
                )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                {t('common:next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {sendTarget && (
        <ConfirmDialog
          title={t('purchaseOrders:sendTitle')}
          description={t('purchaseOrders:sendConfirm', {
            number: sendTarget.orderNumber,
            supplier: sendTarget.supplier?.name ?? '',
          })}
          confirmLabel={isSending ? t('common:sending') : t('common:send')}
          isWorking={isSending}
          onConfirm={handleSend}
          onCancel={() => setSendTarget(null)}
        />
      )}
    </div>
  );
}