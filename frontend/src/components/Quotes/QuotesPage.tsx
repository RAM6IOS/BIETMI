import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  listQuotes,
  deleteQuote,
  sendQuote,
  convertQuoteToInvoice,
} from '../../api/quotes';
import type { Quote, QuoteStatusValue } from '../../api/quotes';
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
import { QuoteStatusBadge } from './QuoteBadges';
import { useAuthRole } from '../../hooks/useAuthRole';
import { canWriteQuotes, canReadQuotes } from './quote-permissions';
import { ConfirmDialog } from '../Invoices/ConfirmDialog';
import { formatAmount, formatDate } from '../Invoices/invoice-labels';
import { QUOTE_STATUS_LABELS } from './quote-labels';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: QuoteStatusValue | ''; label: string }[] = [
  { value: '', label: 'quotes:allStatuses' },
  { value: 'draft', label: QUOTE_STATUS_LABELS.draft },
  { value: 'sent', label: QUOTE_STATUS_LABELS.sent },
  { value: 'accepted', label: QUOTE_STATUS_LABELS.accepted },
  { value: 'rejected', label: QUOTE_STATUS_LABELS.rejected },
  { value: 'revision_requested', label: QUOTE_STATUS_LABELS.revision_requested },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'createdAt-desc', label: 'quotes:sortNewest' },
  { value: 'createdAt-asc', label: 'quotes:sortOldest' },
  { value: 'totalAmount-desc', label: 'quotes:sortTotalDesc' },
  { value: 'quoteNumber-asc', label: 'quotes:sortNumberAsc' },
];

function applySuccess(
  timeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  setSuccess: (m: string | null) => void,
  message: string,
) {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  setSuccess(message);
  timeoutRef.current = setTimeout(() => setSuccess(null), 3000);
}

export function QuotesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useAuthRole();
  const canWrite = canWriteQuotes(role);
  const canRead = canReadQuotes(role);

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<QuoteStatusValue | ''>('');
  const [search, setSearch] = useState('');
  const [sortValue, setSortValue] = useState('createdAt-desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sendTarget, setSendTarget] = useState<Quote | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [convertTarget, setConvertTarget] = useState<Quote | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Quote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const parseSort = (v: string) => {
    const [by, order] = v.split('-') as [
      'createdAt' | 'totalAmount' | 'quoteNumber',
      'asc' | 'desc',
    ];
    return { by, order };
  };

  useEffect(() => {
    let cancelled = false;
    const { by, order } = parseSort(sortValue);
    listQuotes({
      status: status || undefined,
      search: search.trim() || undefined,
      sortBy: by,
      sortOrder: order,
      page,
      limit: PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) return;
        setQuotes(result.data);
        setTotal(result.meta.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(translateApiError(err) || t('quotes:loadFailed'));
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

  const fetchPage = async () => {
    const { by, order } = parseSort(sortValue);
    setIsLoading(true);
    setError('');
    try {
      const result = await listQuotes({
        status: status || undefined,
        search: search.trim() || undefined,
        sortBy: by,
        sortOrder: order,
        page,
        limit: PAGE_SIZE,
      });
      setQuotes(result.data);
      setTotal(result.meta.total);
    } catch (err) {
      setError(translateApiError(err) || t('quotes:loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!sendTarget) return;
    setIsSending(true);
    try {
      await sendQuote(sendTarget.id);
      setSendTarget(null);
      await fetchPage();
      applySuccess(successTimer, setSuccess, t('quotes:sentSuccess'));
    } catch (err) {
      setError(translateApiError(err) || t('quotes:sendFailed'));
      setSendTarget(null);
    } finally {
      setIsSending(false);
    }
  };

  const handleConvert = async () => {
    if (!convertTarget) return;
    setIsConverting(true);
    try {
      const invoice = await convertQuoteToInvoice(convertTarget.id);
      setConvertTarget(null);
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(translateApiError(err) || t('quotes:convertFailed'));
      setConvertTarget(null);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteQuote(deleteTarget.id);
      setDeleteTarget(null);
      await fetchPage();
      applySuccess(successTimer, setSuccess, t('quotes:deletedSuccess'));
    } catch (err) {
      setError(translateApiError(err) || t('quotes:deleteFailed'));
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canRead) {
    return (
      <EmptyState
        title={t('quotes:permissionTitle')}
        description={t('quotes:permissionReadDescription')}
      >
        <Button onClick={() => navigate('/')}>{t('quotes:backHome')}</Button>
      </EmptyState>
    );
  }

  const columns: TableColumn<Quote>[] = [
    {
      key: 'quoteNumber',
      header: t('quotes:number'),
      render: (q) => (
        <span className="font-medium text-gray-900">
          {q.quoteNumber ? t('quotes:quoteRef', { number: q.quoteNumber }) : '—'}
        </span>
      ),
    },
    {
      key: 'partner',
      header: t('quotes:customer'),
      render: (q) => (
        <span className="text-gray-900">{q.partner?.name ?? '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: t('quotes:createdAt'),
      render: (q) => (
        <span className="text-gray-500">{formatDate(q.createdAt)}</span>
      ),
    },
    {
      key: 'status',
      header: t('quotes:status'),
      render: (q) => <QuoteStatusBadge status={q.status} />,
    },
    {
      key: 'totalAmount',
      header: t('quotes:total'),
      className: 'text-end whitespace-nowrap',
      render: (q) => (
        <span className="font-medium text-gray-900">
          {formatAmount(q.totalAmount)}
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
          title={t('quotes:title')}
          subtitle={t('quotes:subtitle')}
          actionLabel={canWrite ? t('quotes:new') : undefined}
          onAction={() => navigate('/quotes/new')}
        />

        {success && (
          <div className="mt-4">
            <Toast>{success}</Toast>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <label htmlFor="quote-search" className="sr-only">
            {t('quotes:searchLabel')}
          </label>
          <Input
            id="quote-search"
            type="search"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder={t('quotes:searchPlaceholder')}
            className="sm:flex-1"
          />
          <label htmlFor="quotes-status" className="sr-only">
            {t('quotes:statusFilter')}
          </label>
          <Select
            id="quotes-status"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as QuoteStatusValue | '');
            }}
            className="sm:w-44"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {t(o.label)}
              </option>
            ))}
          </Select>
          <label htmlFor="quotes-sort" className="sr-only">
            {t('quotes:sortLabel')}
          </label>
          <Select
            id="quotes-sort"
            value={sortValue}
            onChange={(e) => {
              setPage(1);
              setSortValue(e.target.value);
            }}
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
              rows={quotes}
              rowKey={(q) => q.id}
              emptyState={
                <EmptyState
                  title={t('quotes:empty')}
                  description={
                    canWrite
                      ? t('quotes:emptyCanWrite')
                      : t('quotes:emptyNoWrite')
                  }
                />
              }
              actionsLabel={t('common:actions')}
              actions={(q) => (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    className="min-h-11"
                  >
                    {t('common:view')}
                  </Button>
                  {canWrite && q.status === 'accepted' && !q.convertedToInvoiceId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConvertTarget(q)}
                      className="text-success-600 min-h-11"
                    >
                      {t('quotes:convertToInvoice')}
                    </Button>
                  )}
                  {canWrite && q.status === 'accepted' && q.convertedToInvoiceId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/invoices/${q.convertedToInvoiceId}`)}
                      className="text-success-600 min-h-11"
                    >
                      {t('quotes:viewInvoice')}
                    </Button>
                  )}
                  {canWrite && (q.status === 'draft' || q.status === 'revision_requested') && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/quotes/${q.id}/edit`)}
                        className="text-primary-600 min-h-11"
                      >
                        {t('common:edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSendTarget(q)}
                        className="text-success-600 min-h-11"
                      >
                        {t('common:send')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(q)}
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

      {sendTarget && (
        <ConfirmDialog
          title={t('quotes:sendTitle')}
          description={t('quotes:sendConfirm', {
            name: sendTarget.partner?.name ?? '',
          })}
          confirmLabel={isSending ? t('common:sending') : t('common:send')}
          isWorking={isSending}
          onConfirm={handleSend}
          onCancel={() => setSendTarget(null)}
        />
      )}

      {convertTarget && (
        <ConfirmDialog
          title={t('quotes:convertTitle')}
          description={t('quotes:convertConfirm', {
            number: convertTarget.quoteNumber,
          })}
          confirmLabel={
            isConverting ? t('quotes:converting') : t('quotes:convertToInvoice')
          }
          isWorking={isConverting}
          onConfirm={handleConvert}
          onCancel={() => setConvertTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t('quotes:deleteTitle')}
          description={t('quotes:deleteConfirm')}
          confirmLabel={
            isDeleting ? t('common:deleting') : t('common:delete')
          }
          variant="danger"
          isWorking={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}