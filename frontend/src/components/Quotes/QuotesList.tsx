import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { QuoteSummary } from '../../api/quotes';
import { QuoteStatusBadge } from './QuoteBadges';
import { EmptyState } from '../ui/EmptyState';
import { formatDate } from '../Invoices/invoice-labels';

function QuoteRelation({ quote }: { quote: QuoteSummary }) {
  const { t } = useTranslation();
  const revisedFrom = quote.supersedesQuote;
  const revisions = quote.revisions ?? [];
  if (!revisedFrom && revisions.length === 0) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {revisedFrom && (
        <span className="text-gray-600">
          {t('quotes:revisedFrom')}{' '}
          <Link
            to={`/quotes/${revisedFrom.id}`}
            className="text-primary-600 hover:text-primary-800 underline"
          >
            {t('quotes:quoteRef', { number: revisedFrom.quoteNumber })}
          </Link>
        </span>
      )}
      {revisions.map((revision) => (
        <span key={revision.id} className="text-gray-600">
          {t('quotes:replacedBy')}{' '}
          <Link
            to={`/quotes/${revision.id}`}
            className="text-primary-600 hover:text-primary-800 underline"
          >
            {t('quotes:quoteRef', { number: revision.quoteNumber })}
          </Link>
        </span>
      ))}
    </div>
  );
}

export function QuotesList({ quotes }: { quotes: QuoteSummary[] }) {
  const { t } = useTranslation();
  if (quotes.length === 0) {
    return <EmptyState title={t('quotes:emptyCustomer')} />;
  }

  return (
    <div className="overflow-hidden border border-border rounded-lg">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-surface-2">
          <tr>
            <th className="px-4 py-2.5 text-end font-medium text-text-secondary">
              {t('quotes:number')}
            </th>
            <th className="px-4 py-2.5 text-end font-medium text-text-secondary">
              {t('quotes:createdAt')}
            </th>
            <th className="px-4 py-2.5 text-end font-medium text-text-secondary">
              {t('quotes:status')}
            </th>
            <th className="px-4 py-2.5 text-end font-medium text-text-secondary">
              {t('quotes:relation')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {quotes.map((q) => (
            <tr key={q.id} className="hover:bg-surface-2/60">
              <td className="px-4 py-3">
                <Link
                  to={`/quotes/${q.id}`}
                  className="font-medium text-primary-600 hover:text-primary-800"
                >
                  {t('quotes:quoteRef', { number: q.quoteNumber })}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                {formatDate(q.createdAt)}
              </td>
              <td className="px-4 py-3">
                <QuoteStatusBadge status={q.status} />
              </td>
              <td className="px-4 py-3">
                <QuoteRelation quote={q} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}