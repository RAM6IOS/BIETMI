import type { Quote } from '../../api/quotes';
import type { Company } from '../../api/company';
import { PrintableDocument } from './PrintableDocument';

export function QuoteDocument({
  quote,
  company,
}: {
  quote: Quote;
  company: Company | null;
}) {
  return (
    <PrintableDocument
      mode="devis"
      number={quote.quoteNumber}
      issuedAt={quote.createdAt}
      partner={quote.partner ?? { name: '' }}
      createdByFullName={quote.createdBy?.fullName}
      objet={quote.objet}
      subtotal={quote.subtotal}
      discountPercent={quote.discountPercent}
      discountAmount={quote.discountAmount}
      tvaAmount={quote.tvaAmount}
      totalAmount={quote.totalAmount}
      paymentMethods={(quote.paymentMethods ?? []).map((m) => ({
        label: m.label,
        percentage: Number(m.percentage),
      }))}
      lines={quote.lines ?? []}
      company={company}
    />
  );
}