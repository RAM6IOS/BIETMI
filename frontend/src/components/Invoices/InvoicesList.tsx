import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { InvoiceSummary } from '../../api/invoices';
import { InvoiceStatusBadge } from './InvoiceBadges';
import { EmptyState } from '../ui/EmptyState';
import { formatAmount, formatDate } from './invoice-labels';

export function InvoicesList({ invoices }: { invoices: InvoiceSummary[] }) {
  const { t } = useTranslation();
  if (invoices.length === 0) {
    return <EmptyState title={t('invoices:listEmpty')} />;
  }

  return (
    <div className="overflow-hidden border border-border rounded-lg">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-surface-2">
          <tr>
            <th className="px-4 py-2.5 text-end font-medium text-text-secondary">
              {t('invoices:invoiceNumber')}
            </th>
            <th className="px-4 py-2.5 text-end font-medium text-text-secondary">
              {t('invoices:issueDate')}
            </th>
            <th className="px-4 py-2.5 text-end font-medium text-text-secondary">
              {t('invoices:status')}
            </th>
            <th className="px-4 py-2.5 text-end font-medium text-text-secondary">
              {t('invoices:total')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-surface-2/60">
              <td className="px-4 py-3">
                <Link
                  to={`/invoices/${inv.id}`}
                  className="font-medium text-primary-600 hover:text-primary-800"
                >
                  {inv.invoiceNumber ?? '—'}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                {formatDate(inv.issueDate)}
              </td>
              <td className="px-4 py-3">
                <InvoiceStatusBadge status={inv.status} />
              </td>
              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                {formatAmount(inv.totalAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}