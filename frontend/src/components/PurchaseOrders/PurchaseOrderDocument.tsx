import type { PurchaseOrder } from '../../api/purchaseOrders';
import type { Company } from '../../api/company';
import {
  formatAmountFR,
  formatDateFR,
  formatNumberFR,
  formatPercentageFR,
  pad2,
} from '../../utils/numberFormat';
import { amountToFrenchWords } from '../../utils/amountToFrenchWords';
import { CompanyHeader } from './CompanyHeader';

export function PurchaseOrderDocument({
  order,
  company,
}: {
  order: PurchaseOrder;
  company: Company | null;
}) {
  const lines = order.lines ?? [];
  const hasDiscount = Number(order.discountAmount) > 0;
  const amountAfterDiscount = Math.max(
    0,
    Number(order.subtotal) - Number(order.discountAmount),
  );

  return (
    <div dir="ltr" className="bg-white text-gray-900">
      <CompanyHeader company={company} />

      <h2 className="mt-6 text-center text-2xl font-bold uppercase tracking-[0.3em]">
        Bon de commande
      </h2>

      <div className="mt-4 grid grid-cols-3 border border-border">
        <div className="border-r border-border px-3 py-2">
          <p className="text-xs text-text-secondary">N° :</p>
          <p className="font-semibold">{order.orderNumber || '—'}</p>
        </div>
        <div className="border-r border-border px-3 py-2">
          <p className="text-xs text-text-secondary">Date :</p>
          <p className="font-semibold">
            {order.orderDate ? formatDateFR(order.orderDate) : '—'}
          </p>
        </div>
        <div className="px-3 py-2">
          <p className="text-xs text-text-secondary">FOURNISSEUR :</p>
          <p className="font-semibold">{order.supplier?.name ?? '—'}</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-2 text-left text-xs font-semibold text-text-secondary">
              <th className="border border-border px-2 py-2 w-10">N°</th>
              <th className="border border-border px-2 py-2">Désignations</th>
              <th className="border border-border px-2 py-2 w-24">Unité</th>
              <th className="border border-border px-2 py-2 w-24 text-right">QT</th>
              <th className="border border-border px-2 py-2 w-28 text-right">P U</th>
              <th className="border border-border px-2 py-2 w-32 text-right">
                Montant
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="border border-border px-2 py-4 text-center text-sm text-text-secondary"
                >
                  —
                </td>
              </tr>
            )}
            {lines.map((line, index) => (
              <tr key={line.id}>
                <td className="border border-border px-2 py-2 text-sm text-gray-500">
                  {pad2(index + 1)}
                </td>
                <td className="border border-border px-2 py-2 text-sm">
                  {line.description}
                </td>
                <td className="border border-border px-2 py-2 text-sm">
                  {line.unit ?? '—'}
                </td>
                <td className="border border-border px-2 py-2 text-sm text-right tabular-nums">
                  {formatNumberFR(line.quantity)}
                </td>
                <td className="border border-border px-2 py-2 text-sm text-right tabular-nums">
                  {formatNumberFR(line.unitPrice)}
                </td>
                <td className="border border-border px-2 py-2 text-sm text-right font-medium tabular-nums">
                  {formatAmountFR(line.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:justify-between print:flex-row print:justify-between">
        <div className="flex-1 max-w-xl print:max-w-none">
          <p className="text-xs text-text-secondary">
            Arrêté le présent bon de commande à la somme de :
          </p>
          <p className="mt-1 text-sm font-medium leading-relaxed">
            {Number(order.totalAmount) > 0
              ? amountToFrenchWords(Number(order.totalAmount))
              : '—'}
          </p>
        </div>
        <div className="w-full lg:w-72 print:w-64">
          <div className="flex justify-between gap-8 py-2 text-sm border-b border-border">
            <span className="text-text-secondary">Total en HT</span>
            <span className="tabular-nums">
              {formatAmountFR(order.subtotal)}
            </span>
          </div>
          {hasDiscount && (
            <>
              <div className="flex justify-between gap-8 py-2 text-sm border-b border-border">
                <span className="text-text-secondary">
                  Remise ({formatPercentageFR(order.discountPercent)}%)
                </span>
                <span className="tabular-nums">
                  {formatAmountFR(order.discountAmount)}
                </span>
              </div>
              <div className="flex justify-between gap-8 py-2 text-sm border-b border-border">
                <span className="text-text-secondary">
                  Montant après remise
                </span>
                <span className="tabular-nums">
                  {formatAmountFR(String(amountAfterDiscount))}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between gap-8 py-2 text-sm border-b border-border">
            <span className="text-text-secondary">TVA 19%</span>
            <span className="tabular-nums">
              {formatAmountFR(order.tvaAmount)}
            </span>
          </div>
          <div className="flex justify-between gap-8 py-2 text-base font-bold">
            <span>Total TTC</span>
            <span className="tabular-nums">
              {formatAmountFR(order.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {(order.paymentMethods ?? []).length > 0 && (
        <div className="mt-2 flex justify-end">
          <div className="text-sm">
            <span className="font-semibold">Modalités de paiement :</span>
            <ul className="mt-1 space-y-0.5 text-right">
              {(order.paymentMethods ?? []).map((method, index) => (
                <li key={index}>
                  {formatPercentageFR(method.percentage)}% — {method.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-10 flex justify-end">
        <div className="w-64 py-14 text-center text-sm text-text-secondary">
          Cachet et signature
        </div>
      </div>
    </div>
  );
}