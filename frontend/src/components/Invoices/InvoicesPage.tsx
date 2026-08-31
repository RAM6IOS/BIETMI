import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listInvoices, deleteInvoice, issueInvoice } from '../../api/invoices';
import { translateApiError } from '../../api/errors';
import type { Invoice, InvoiceStatusValue, Role } from '../../api/invoices';
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
import { InvoiceStatusBadge } from './InvoiceBadges';
import {
  INVOICE_STATUS_LABELS,
  formatAmount,
  formatDate,
  invoiceDocumentTitle,
} from './invoice-labels';
import { ConfirmDialog } from './ConfirmDialog';
import { useAuthRole } from '../../hooks/useAuthRole';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: InvoiceStatusValue | ''; label: string }[] = [
  { value: '', label: 'invoices:allStatuses' },
  { value: 'draft', label: INVOICE_STATUS_LABELS.draft },
  { value: 'issued', label: INVOICE_STATUS_LABELS.issued },
  { value: 'partially_paid', label: INVOICE_STATUS_LABELS.partially_paid },
  { value: 'paid', label: INVOICE_STATUS_LABELS.paid },
  { value: 'overdue', label: INVOICE_STATUS_LABELS.overdue },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'createdAt-desc', label: 'invoices:sortNewest' },
  { value: 'issueDate-desc', label: 'invoices:sortIssueDateDesc' },
  { value: 'issueDate-asc', label: 'invoices:sortIssueDateAsc' },
  { value: 'totalAmount-desc', label: 'invoices:sortTotalDesc' },
  { value: 'invoiceNumber-asc', label: 'invoices:sortNumberAsc' },
];

const ROLE_WRITE: Partial<Record<Role, boolean>> = {
  admin: true,
  commercial: true,
  accountant: false,
};

function applySuccess(
  timeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  setSuccess: (m: string | null) => void,
  message: string,
) {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  setSuccess(message);
  timeoutRef.current = setTimeout(() => setSuccess(null), 3000);
}

export function InvoicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useAuthRole();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<InvoiceStatusValue | ''>('');
  const [search, setSearch] = useState('');
  const [sortValue, setSortValue] = useState('createdAt-desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [issueTarget, setIssueTarget] = useState<Invoice | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const parseSort = (v: string) => {
    const [by, order] = v.split('-') as [
      'createdAt' | 'issueDate' | 'totalAmount' | 'invoiceNumber',
      'asc' | 'desc',
    ];
    return { by, order };
  };

  const fetchPage = async (opts: {
    pageValue?: number;
    statusValue?: InvoiceStatusValue | '';
    searchValue?: string;
    sortValue?: string;
  } = {}) => {
    const pv = opts.pageValue ?? page;
    const sv = opts.sortValue ?? sortValue;
    const { by, order } = parseSort(sv);
    setIsLoading(true);
    setError('');
    try {
      const result = await listInvoices({
        status: (opts.statusValue ?? status) || undefined,
        search: (opts.searchValue ?? search).trim() || undefined,
        sortBy: by,
        sortOrder: order,
        page: pv,
        limit: PAGE_SIZE,
      });
      setInvoices(result.data);
      setTotal(result.meta.total);
    } catch (err) {
      setError(translateApiError(err) || t('invoices:loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const { by, order } = parseSort(sortValue);
    listInvoices({
      status: status || undefined,
      search: search.trim() || undefined,
      sortBy: by,
      sortOrder: order,
      page,
      limit: PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) return;
        setInvoices(result.data);
        setTotal(result.meta.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(translateApiError(err) || t('invoices:loadFailed'));
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

  const handleIssue = async () => {
    if (!issueTarget) return;
    setIsIssuing(true);
    try {
      const issued = await issueInvoice(issueTarget.id);
      setIssueTarget(null);
      await fetchPage();
      applySuccess(
        successTimer,
        setSuccess,
        t('invoices:issuedSuccess', { number: issued.invoiceNumber }),
      );
    } catch (err) {
      setError(translateApiError(err) || t('invoices:issueFailed'));
      setIssueTarget(null);
    } finally {
      setIsIssuing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteInvoice(deleteTarget.id);
      setDeleteTarget(null);
      await fetchPage();
      applySuccess(successTimer, setSuccess, t('invoices:deletedSuccess'));
    } catch (err) {
      setError(translateApiError(err) || t('invoices:deleteFailed'));
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const canWrite = role ? ROLE_WRITE[role] === true : false;

  const columns: TableColumn<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: t('invoices:number'),
      render: (i) => (
        <span className="font-medium text-gray-900">
          {invoiceDocumentTitle(i)}
        </span>
      ),
    },
    {
      key: 'partner',
      header: t('invoices:partner'),
      render: (i) => (
        <span className="text-gray-900">{i.partner?.name ?? '—'}</span>
      ),
    },
    {
      key: 'issueDate',
      header: t('invoices:issueDate'),
      render: (i) => (
        <span className="text-gray-500">{formatDate(i.issueDate)}</span>
      ),
    },
    {
      key: 'dueDate',
      header: t('invoices:dueDate'),
      render: (i) => (
        <span className="text-gray-500">{formatDate(i.dueDate ?? '')}</span>
      ),
    },
    {
      key: 'status',
      header: t('invoices:status'),
      render: (i) => <InvoiceStatusBadge status={i.status} />,
    },
    {
      key: 'totalAmount',
      header: t('invoices:total'),
      className: 'text-end whitespace-nowrap',
      render: (i) => (
        <span className="font-medium text-gray-900">
          {formatAmount(i.totalAmount)}
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
          title={t('invoices:title')}
          subtitle={t('invoices:subtitle')}
          actionLabel={canWrite ? t('invoices:new') : undefined}
          onAction={() => navigate('/invoices/new')}
        />

        <div className="mt-4">
          <Link
            to="/invoices/reports/outstanding"
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            {t('invoices:outstandingReport')}
          </Link>
        </div>

        {success && (
          <div className="mt-4">
            <Toast>{success}</Toast>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <label htmlFor="invoice-search" className="sr-only">
            {t('invoices:searchLabel')}
          </label>
          <Input
            id="invoice-search"
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('invoices:searchPlaceholder')}
            className="sm:flex-1"
          />
          <label htmlFor="invoices-status" className="sr-only">
            {t('invoices:statusFilter')}
          </label>
          <Select
            id="invoices-status"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as InvoiceStatusValue | '');
            }}
            className="sm:w-44"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {t(o.label)}
              </option>
            ))}
          </Select>
          <label htmlFor="invoices-sort" className="sr-only">
            {t('invoices:sortLabel')}
          </label>
          <Select
            id="invoices-sort"
            value={sortValue}
            onChange={(e) => handleSortChange(e.target.value)}
            className="sm:w-52"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.label)}
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

        <div className="mt-4 overflow-hidden border border-border rounded-lg">
          {isLoading ? (
            <div className="text-center py-14">
              <Spinner />
            </div>
          ) : (
            <Table
              columns={columns}
              rows={invoices}
              rowKey={(i) => i.id}
              emptyState={
                <EmptyState
                  title={t('invoices:empty')}
                  description={
                    canWrite
                      ? t('invoices:emptyCanWrite')
                      : t('invoices:emptyNoWrite')
                  }
                />
              }
              actionsLabel={t('common:actions')}
              actions={(i) => (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/invoices/${i.id}`)}
                    className="min-h-11"
                  >
                    {t('common:view')}
                  </Button>
                  {canWrite && i.status === 'draft' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/invoices/${i.id}/edit`)}
                        className="text-primary-600 min-h-11"
                      >
                        {t('common:edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIssueTarget(i)}
                        className="text-success-600 min-h-11"
                      >
                        {t('invoices:issueButton')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(i)}
                        className="text-danger-600 min-h-11"
                      >
                        {t('common:delete')}
                      </Button>
                    </>
                  )}
                </>
              )}
            />
          )}
        </div>

        {!isLoading && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-text-secondary">
              {t('common:pagination.showing', { from, to, total })}
            </p>
            <div className="flex gap-2 items-center flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                {t('common:previous')}
              </Button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
                (n) => (
                  <Button
                    key={n}
                    variant={n === page ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setPage(n)}
                    aria-current={n === page ? 'page' : undefined}
                  >
                    {n}
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

      {issueTarget && (
        <ConfirmDialog
          title={t('invoices:issueTitle')}
          description={t('invoices:issueConfirm', {
            name: issueTarget.partner?.name ?? '',
          })}
          confirmLabel={isIssuing ? t('invoices:issuing') : t('invoices:issueButton')}
          isWorking={isIssuing}
          onConfirm={handleIssue}
          onCancel={() => setIssueTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t('invoices:deleteTitle')}
          description={t('invoices:deleteConfirmDraft')}
          confirmLabel={isDeleting ? t('common:deleting') : t('common:delete')}
          variant="danger"
          isWorking={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}