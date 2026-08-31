import { useTranslation } from 'react-i18next';
import type { QuoteStatusValue } from '../../api/quotes';
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_STYLES } from './quote-labels';

export function QuoteStatusBadge({ status }: { status: QuoteStatusValue }) {
  const { t } = useTranslation();
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        QUOTE_STATUS_STYLES[status],
      ].join(' ')}
    >
      {t(QUOTE_STATUS_LABELS[status])}
    </span>
  );
}