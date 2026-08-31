import type { Invoice } from '../../api/invoices';
import type { Company } from '../../api/company';
import { PrintableDocument } from '../documents/PrintableDocument';

export function InvoiceDocument({
  invoice,
  company,
}: {
  invoice: Invoice;
  company: Company | null;
}) {
  return (
    <PrintableDocument
      mode="facture"
      number={invoice.invoiceNumber}
      issuedAt={invoice.issueDate}
      partner={invoice.partner ?? { name: '' }}
      createdByFullName={invoice.createdBy?.fullName}
      objet={invoice.objet}
      subtotal={invoice.subtotal}
      tvaAmount={invoice.tvaAmount}
      totalAmount={invoice.totalAmount}
      lines={invoice.lines ?? []}
      company={company}
    />
  );
}