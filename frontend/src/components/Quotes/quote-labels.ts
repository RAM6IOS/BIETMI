import type { QuoteStatusValue } from '../../api/quotes';

export const QUOTE_STATUS_LABELS: Record<QuoteStatusValue, string> = {
  draft: 'quotes:statusDraft',
  sent: 'quotes:statusSent',
  accepted: 'quotes:statusAccepted',
  rejected: 'quotes:statusRejected',
  revision_requested: 'quotes:statusRevisionRequested',
};

export const QUOTE_STATUS_STYLES: Record<QuoteStatusValue, string> = {
  draft: 'bg-surface-2 text-text-secondary border border-border',
  sent: 'bg-primary-50 text-primary-700 border border-primary-100',
  accepted: 'bg-success-50 text-success-700 border border-success-100',
  rejected: 'bg-danger-50 text-danger-700 border border-danger-100',
  revision_requested:
    'bg-warning-50 text-warning-700 border border-warning-100',
};

export function quoteDocumentTitle(quote: {
  status: QuoteStatusValue;
  quoteNumber: string;
}): string {
  if (quote.status === 'draft') return 'مسودة عرض أسعار';
  return `عرض أسعار N° ${quote.quoteNumber}`;
}