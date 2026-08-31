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
      tvaAmount={quote.tvaAmount}
      totalAmount={quote.totalAmount}
      lines={quote.lines ?? []}
      company={company}
    />
  );
}