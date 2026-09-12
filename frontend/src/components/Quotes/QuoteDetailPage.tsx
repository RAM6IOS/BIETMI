import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getQuote,
  deleteQuote,
  sendQuote,
  updateQuoteStatus,
  convertQuoteToInvoice,
  createQuoteRevision,
} from '../../api/quotes';
import type { Quote, QuoteStatusValue } from '../../api/quotes';
import type { Invoice } from '../../api/invoices';
import { translateApiError } from '../../api/errors';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { QuoteStatusBadge } from './QuoteBadges';
import { quoteDocumentTitle, QUOTE_STATUS_LABELS } from './quote-labels';
import { QuoteDocument } from '../documents/QuoteDocument';
import { useAuthRole } from '../../hooks/useAuthRole';
import { useCompany } from '../../hooks/useCompany';
import { canWriteQuotes } from './quote-permissions';
import { ConfirmDialog } from '../Invoices/ConfirmDialog';

type PendingAction =
  | { kind: 'send' }
  | { kind: 'status'; status: QuoteStatusValue }
  | { kind: 'convert' }
  | { kind: 'revision' }
  | { kind: 'delete' }
  | null;

export function QuoteDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthRole();
  const canWrite = canWriteQuotes(role);
  const { company } = useCompany();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<PendingAction>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setQuote(await getQuote(id));
    } catch (err) {
      setError(translateApiError(err) || t('quotes:loadFailedOne'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSend = async () => {
    if (!id || !quote) return;
    setIsWorking(true);
    try {
      setQuote(await sendQuote(id));
      setPending(null);
    } catch (err) {
      setActionError(translateApiError(err) || t('quotes:sendFailed'));
      setPending(null);
    } finally {
      setIsWorking(false);
    }
  };

  const handleStatusChange = async () => {
    if (!id || !quote || pending?.kind !== 'status') return;
    setIsWorking(true);
    try {
      setQuote(await updateQuoteStatus(id, pending.status));
      setPending(null);
    } catch (err) {
      setActionError(translateApiError(err) || t('quotes:updateStatusFailed'));
      setPending(null);
    } finally {
      setIsWorking(false);
    }
  };

  const handleConvert = async () => {
    if (!id) return;
    setIsWorking(true);
    try {
      const invoice: Invoice = await convertQuoteToInvoice(id);
      setPending(null);
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      setActionError(translateApiError(err) || t('quotes:convertFailed'));
      setPending(null);
    } finally {
      setIsWorking(false);
    }
  };

  const handleCreateRevision = async () => {
    if (!id) return;
    setIsWorking(true);
    try {
      const revision = await createQuoteRevision(id);
      setPending(null);
      navigate(`/quotes/${revision.id}`);
    } catch (err) {
      setActionError(translateApiError(err) || t('quotes:createRevisionFailed'));
      setPending(null);
    } finally {
      setIsWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsWorking(true);
    try {
      await deleteQuote(id);
      navigate('/quotes');
    } catch (err) {
      setActionError(translateApiError(err) || t('quotes:deleteFailed'));
      setPending(null);
    } finally {
      setIsWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500" aria-busy="true">
        <Spinner />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <EmptyState
        title={t('quotes:loadErrorTitle')}
        description={error || t('quotes:notFound')}
      >
        <Link to="/quotes">
          <Button>{t('quotes:backToQuotes')}</Button>
        </Link>
      </EmptyState>
    );
  }

  const isEditable = quote.status === 'draft';
  const converted = quote.convertedToInvoiceId;

  let confirmTitle = '';
  let confirmDescription = '';
  let confirmLabel = '';
  if (pending?.kind === 'send') {
    confirmTitle = t('quotes:sendTitle');
    confirmDescription = t('quotes:sendConfirm', {
      name: quote.partner?.name ?? '',
    });
    confirmLabel = t('common:send');
  } else if (pending?.kind === 'status') {
    const statusLabel = t(QUOTE_STATUS_LABELS[pending.status]);
    confirmTitle = t('quotes:statusUpdateTitle');
    confirmDescription = t('quotes:statusUpdateConfirm', {
      status: statusLabel,
    });
    confirmLabel = statusLabel;
  } else if (pending?.kind === 'convert') {
    confirmTitle = t('quotes:convertTitle');
    confirmDescription = t('quotes:convertDetailConfirm');
    confirmLabel = t('quotes:convertToInvoice');
  } else if (pending?.kind === 'revision') {
    confirmTitle = t('quotes:createRevisionTitle');
    confirmDescription = t('quotes:createRevisionConfirm');
    confirmLabel = t('quotes:createRevision');
  } else if (pending?.kind === 'delete') {
    confirmTitle = t('quotes:deleteTitle');
    confirmDescription = t('quotes:deleteConfirm');
    confirmLabel = t('common:delete');
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="no-print mb-4">
        <Link
          to="/quotes"
          className="text-sm text-primary-600 hover:text-primary-800"
        >
          → {t('quotes:backToQuotes')}
        </Link>
      </div>

      <div className="no-print flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-semibold text-gray-900">
              {quoteDocumentTitle(quote)}
            </h2>
            <QuoteStatusBadge status={quote.status} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isEditable && canWrite && (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate(`/quotes/${quote.id}/edit`)}
              >
                {t('common:edit')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPending({ kind: 'send' })}
              >
                {t('quotes:sendToCustomer')}
              </Button>
              {quote.status === 'draft' && (
                <Button variant="danger" onClick={() => setPending({ kind: 'delete' })}>
                  {t('common:delete')}
                </Button>
              )}
            </>
          )}
          {quote.status === 'sent' && canWrite && (
            <>
              <Button
                variant="secondary"
                onClick={() => setPending({ kind: 'status', status: 'revision_requested' })}
              >
                {t('quotes:requestRevision')}
              </Button>
              <Button
                variant="danger"
                onClick={() => setPending({ kind: 'status', status: 'rejected' })}
              >
                {t('quotes:statusRejected')}
              </Button>
              <Button onClick={() => setPending({ kind: 'status', status: 'accepted' })}>
                {t('quotes:accept')}
              </Button>
            </>
          )}
          {quote.status === 'revision_requested' && canWrite && (
            <Button onClick={() => setPending({ kind: 'revision' })}>
              {t('quotes:createRevision')}
            </Button>
          )}
          {quote.status === 'accepted' && canWrite && !converted && (
            <Button onClick={() => setPending({ kind: 'convert' })}>
              {t('quotes:convertToInvoice')}
            </Button>
          )}
          {quote.status === 'accepted' && canWrite && converted && (
            <Link to={`/invoices/${converted}`}>
              <Button>{t('quotes:viewInvoice')}</Button>
            </Link>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            {t('common:printSavePdf')}
          </Button>
        </div>
      </div>

      {actionError && (
        <div
          className="no-print mt-4 text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
          role="alert"
        >
          {actionError}
        </div>
      )}

      {(quote.supersedesQuote || (quote.revisions?.length ?? 0) > 0) && (
        <div className="no-print mb-4 flex flex-col gap-2 text-sm">
          {quote.supersedesQuote && (
            <p className="text-gray-600">
              {t('quotes:revisedFrom')}{' '}
              <Link
                to={`/quotes/${quote.supersedesQuote.id}`}
                className="text-primary-600 hover:text-primary-800 underline"
              >
                {quote.supersedesQuote.quoteNumber}
              </Link>
            </p>
          )}
          {(quote.revisions ?? []).map((revision) => (
            <p key={revision.id} className="text-gray-600">
              {t('quotes:replacedBy')}{' '}
              <Link
                to={`/quotes/${revision.id}`}
                className="text-primary-600 hover:text-primary-800 underline"
              >
                {revision.quoteNumber}
              </Link>
            </p>
          ))}
        </div>
      )}

      <Card className="p-4 sm:p-8 print-area">
        <QuoteDocument quote={quote} company={company} />
      </Card>

      {pending && (
        <ConfirmDialog
          title={confirmTitle}
          description={confirmDescription}
          confirmLabel={isWorking ? t('quotes:working') : confirmLabel}
          variant={pending.kind === 'delete' ? 'danger' : 'primary'}
          isWorking={isWorking}
          onConfirm={
            pending.kind === 'send'
              ? handleSend
              : pending.kind === 'status'
                ? handleStatusChange
                : pending.kind === 'convert'
                  ? handleConvert
                  : pending.kind === 'revision'
                    ? handleCreateRevision
                    : handleDelete
          }
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}