import { useTranslation } from 'react-i18next';
import type { InvoiceStatusValue } from '../../api/invoices';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_STYLES } from './invoice-labels';

export function InvoiceStatusBadge({ status }: { status: InvoiceStatusValue }) {
  const { t } = useTranslation();
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        INVOICE_STATUS_STYLES[status],
      ].join(' ')}
    >
      {t(INVOICE_STATUS_LABELS[status])}
    </span>
  );
}