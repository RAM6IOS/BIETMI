import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listOutstanding } from '../../api/invoices';
import type { OutstandingRow } from '../../api/invoices';
import { translateApiError } from '../../api/errors';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { Table } from '../ui/Table';
import type { TableColumn } from '../ui/Table';
import { InvoiceStatusBadge } from './InvoiceBadges';
import { formatAmount, formatDate } from './invoice-labels';

export function OverdueReportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [rows, setRows] = useState<OutstandingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    listOutstanding(overdueOnly)
      .then((result) => {
        if (cancelled) return;
        setRows(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(translateApiError(err) || t('invoices:loadReportFailed'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [overdueOnly]);

  const normalRows = rows.filter((r) => {
    if (search.trim() === '') return true;
    const q = search.trim().toLowerCase();
    return (
      (r.invoiceNumber ?? '').toLowerCase().includes(q) ||
      (r.partner?.name ?? '').toLowerCase().includes(q) ||
      (r.internalReference ?? '').toLowerCase().includes(q)
    );
  });

  const columns: TableColumn<OutstandingRow>[] = [
    {
      key: 'invoiceNumber',
      header: t('invoices:number'),
      render: (r) => (
        <span className="font-medium text-gray-900">
          {r.invoiceNumber ?? '—'}
        </span>
      ),
    },
    {
      key: 'partner',
      header: t('invoices:partner'),
      render: (r) => (
        <span className="text-gray-900">{r.partner?.name ?? '—'}</span>
      ),
    },
    {
      key: 'dueDate',
      header: t('invoices:dueDate'),
      render: (r) => (
        <span className="text-gray-500">{formatDate(r.dueDate ?? '')}</span>
      ),
    },
    {
      key: 'totalAmount',
      header: t('invoices:total'),
      className: 'text-end whitespace-nowrap',
      render: (r) => (
        <span className="font-medium text-gray-900">
          {formatAmount(r.totalAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('invoices:status'),
      render: (r) => <InvoiceStatusBadge status={r.status} />,
    },
    {
      key: 'overdue',
      header: t('invoices:overdue'),
      render: (r) =>
        r.isOverdue ? (
          <span className="inline-flex items-center rounded-full bg-danger-50 px-2.5 py-0.5 text-xs font-medium text-danger-700 border border-danger-100">
            {t('invoices:overdue')}
          </span>
        ) : (
          <span className="text-text-secondary text-sm">—</span>
        ),
    },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="p-4 sm:p-6">
        <PageHeader
          title={t('invoices:outstandingTitle')}
          subtitle={
            overdueOnly
              ? t('invoices:outstandingOverdueOnly')
              : t('invoices:outstandingAll')
          }
          actionLabel={t('invoices:invoicesAction')}
          onAction={() => navigate('/invoices')}
        />

        <div className="mt-6 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <label htmlFor="outstanding-search" className="sr-only">
            {t('invoices:outstandingSearch')}
          </label>
          <Input
            id="outstanding-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('invoices:outstandingPlaceholder')}
            className="sm:flex-1"
          />
          <Button
            variant="secondary"
            onClick={() => setOverdueOnly((v) => !v)}
            aria-pressed={overdueOnly}
          >
            {overdueOnly ? t('invoices:showAll') : t('invoices:overdueOnly')}
          </Button>
        </div>

        {error && (
          <div
            className="mt-4 text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="mt-4 overflow-hidden border border-border rounded-lg">
          {isLoading ? (
            <div className="text-center py-14">
              <Spinner />
            </div>
          ) : normalRows.length === 0 ? (
            <EmptyState
              title={t('invoices:outstandingEmpty')}
              description={t('invoices:outstandingEmptyDescription')}
            />
          ) : (
            <Table
              columns={columns}
              rows={normalRows}
              rowKey={(r) => r.id}
              actionsLabel={t('common:actions')}
              actions={(r) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/invoices/${r.id}`)}
                  className="min-h-11"
                >
                  {t('common:view')}
                </Button>
              )}
            />
          )}
        </div>
      </Card>
    </div>
  );
}