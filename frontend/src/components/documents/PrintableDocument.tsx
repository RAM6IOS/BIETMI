import type { Company } from '../../api/company';
import {
  formatAmountFR,
  formatDateFR,
  formatNumberFR,
  formatPercentageFR,
  pad2,
} from '../../utils/numberFormat';
import { amountToFrenchWords } from '../../utils/amountToFrenchWords';
import { CompanyHeader } from '../PurchaseOrders/CompanyHeader';

export type DocumentMode = 'facture' | 'devis';

export interface PrintableDocumentLine {
  id: string;
  description: string;
  unit: string | null;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface PrintableContact {
  email?: string | null;
  phone?: string | null;
  isPrimary?: boolean;
}

export interface PrintablePaymentMethod {
  label: string;
  percentage: number;
}

export interface PrintableDocumentProps {
  mode: DocumentMode;
  number: string | null;
  issuedAt: string;
  partner: {
    name: string;
    address?: string | null;
    contacts?: PrintableContact[];
  };
  createdByFullName?: string;
  objet?: string | null;
  subtotal: string;
  discountPercent: string;
  discountAmount: string;
  tvaAmount: string;
  totalAmount: string;
  paymentMethods: PrintablePaymentMethod[];
  lines: PrintableDocumentLine[];
  company: Company | null;
}

function primaryContact(
  partner: PrintableDocumentProps['partner'],
): PrintableContact | undefined {
  const contacts = partner.contacts ?? [];
  return contacts.find((c) => c.isPrimary) ?? contacts[0];
}

export function PrintableDocument({
  mode,
  number,
  issuedAt,
  partner,
  createdByFullName,
  objet,
  subtotal,
  discountPercent,
  discountAmount,
  tvaAmount,
  totalAmount,
  paymentMethods,
  lines,
  company,
}: PrintableDocumentProps) {
  const contact = primaryContact(partner);
  const partnerLabel = 'CLIENT';

  const closing =
    mode === 'devis'
      ? 'Arrêté le présent devis à la somme de :'
      : 'Arrêtée la présente facture à la somme de :';

  const title =
    mode === 'devis'
      ? `DEVIS N° ${number ?? ''}`
      : `FACTURE N° ${number ?? ''}`;

  const hasDiscount = Number(discountAmount) > 0;
  const amountAfterDiscount = Math.max(
    0,
    Number(subtotal) - Number(discountAmount),
  );

  return (
    <div dir="ltr" className="bg-white text-gray-900 font-serif flex min-h-[660px] flex-col">
      <CompanyHeader company={company} />

      <div className="mt-3 h-2 bg-success-600" />

      <div className="mt-4 border-2 border-black p-3 text-sm">
        <p className="font-bold">
          {partnerLabel} :{' '}
          <span className="font-normal">{partner.name ?? '—'}</span>
        </p>
        <p className="mt-1">Adresse : {partner.address ?? ''}</p>
        <p className="mt-1">Mail : {contact?.email ?? ''}</p>
        <p className="mt-1">Tel : {contact?.phone ?? ''}</p>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <p>
          Etabli par :{' '}
          <span className="font-semibold">{createdByFullName || '—'}</span>
        </p>
        <p className="font-semibold">
          {company?.ville ? `${company.ville} le ` : 'Le '}
          {formatDateFR(issuedAt)}
        </p>
      </div>

      <div className="mt-5 text-center">
        <h2 className="text-2xl font-bold uppercase underline">{title}</h2>
        <p className="mt-4 font-semibold">
          Objet : <span className="font-semibold">{objet ?? ''}</span>
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-xs font-bold">
              <th className="border border-black px-2 py-2 w-10">N°</th>
              <th className="border border-black px-2 py-2">Désignation</th>
              <th className="border border-black px-2 py-2 w-20">
                Unité
              </th>
              <th className="border border-black px-2 py-2 w-24 text-right">
                Qté
              </th>
              <th className="border border-black px-2 py-2 w-28 text-right">
                P.U
              </th>
              <th className="border border-black px-2 py-2 w-32 text-right">
                Montant
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="border border-black px-2 py-4 text-center text-sm"
                >
                  —
                </td>
              </tr>
            )}
            {lines.map((line, index) => (
              <tr key={line.id}>
                <td className="border border-black px-2 py-2 text-sm text-gray-600">
                  {pad2(index + 1)}
                </td>
                <td className="border border-black px-2 py-2 text-sm">
                  {line.description}
                </td>
                <td className="border border-black px-2 py-2 text-sm">
                  {line.unit ?? ''}
                </td>
                <td className="border border-black px-2 py-2 text-sm text-right tabular-nums">
                  {formatNumberFR(line.quantity)}
                </td>
                <td className="border border-black px-2 py-2 text-sm text-right tabular-nums">
                  {formatNumberFR(line.unitPrice)}
                </td>
                <td className="border border-black px-2 py-2 text-sm text-right font-semibold tabular-nums">
                  {formatAmountFR(line.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end -mt-px">
        <div className="w-full print:w-72 lg:w-80 border border-black text-sm">
          <div className="flex justify-between gap-8 border-b border-black px-3 py-2">
            <span className="font-bold">MONTANT TOTAL</span>
            <span className="tabular-nums">{formatAmountFR(subtotal)}</span>
          </div>
          {hasDiscount && (
            <>
              <div className="flex justify-between gap-8 border-b border-black px-3 py-2">
                <span className="font-bold">
                  REMISE ({formatPercentageFR(discountPercent)}%)
                </span>
                <span className="tabular-nums">
                  {formatAmountFR(discountAmount)}
                </span>
              </div>
              <div className="flex justify-between gap-8 border-b border-black px-3 py-2">
                <span className="font-bold">MONTANT APRÈS REMISE</span>
                <span className="tabular-nums">
                  {formatAmountFR(String(amountAfterDiscount))}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between gap-8 border-b border-black px-3 py-2">
            <span className="font-bold">TVA 19%</span>
            <span className="tabular-nums">{formatAmountFR(tvaAmount)}</span>
          </div>
          <div className="flex justify-between gap-8 px-3 py-2 text-base font-bold">
            <span>MONTANT EN TTC</span>
            <span className="tabular-nums">{formatAmountFR(totalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 w-full lg:max-w-xl print:max-w-xl">
        <p className="text-sm italic underline">{closing}</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed">
          {Number(totalAmount) > 0 ? amountToFrenchWords(Number(totalAmount)) : '—'}
        </p>
        {paymentMethods.length > 0 && (
          <>
            <p className="mt-3 text-sm font-semibold">Modalités de paiement :</p>
            <ul className="mt-1 space-y-0.5">
              {paymentMethods.map((method, index) => (
                <li key={index}>
                  {formatPercentageFR(method.percentage)}% — {method.label}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-auto pt-12">
        <div className="flex flex-col gap-6 print:flex-row print:justify-between lg:flex-row lg:justify-between">
          {mode === 'devis' && (
            <div className="w-full lg:w-80">
              <p className="text-sm italic underline">
                Délais de réalisation : <span className="font-normal"> </span>
              </p>
              <p className="mt-3 text-sm italic underline">
                Validité de l'offre : <span className="font-normal"> </span>
              </p>
            </div>
          )}
          <div className="text-sm font-bold underline">
            Cachet et signature:
          </div>
        </div>
      </div>
    </div>
  );
}