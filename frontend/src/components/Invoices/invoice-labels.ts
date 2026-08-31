import type { InvoiceStatusValue } from '../../api/invoices';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatusValue, string> = {
  draft: 'invoices:statusDraft',
  issued: 'invoices:statusIssued',
  partially_paid: 'invoices:statusPartiallyPaid',
  paid: 'invoices:statusPaid',
  overdue: 'invoices:statusOverdue',
};

export const INVOICE_STATUS_STYLES: Record<InvoiceStatusValue, string> = {
  draft: 'bg-surface-2 text-text-secondary border border-border',
  issued: 'bg-primary-50 text-primary-700 border border-primary-100',
  partially_paid: 'bg-warning-50 text-warning-700 border border-warning-100',
  paid: 'bg-success-50 text-success-700 border border-success-100',
  overdue: 'bg-danger-50 text-danger-700 border border-danger-100',
};

export function invoiceDocumentTitle(invoice: {
  status: InvoiceStatusValue;
  invoiceNumber: string | null;
}): string {
  if (invoice.status === 'draft') return 'مسودة فاتورة';
  return invoice.invoiceNumber ?? '—';
}

export function formatAmount(value: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return `${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} دج`;
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ar-DZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}