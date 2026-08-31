import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPurchaseOrder } from '../../api/purchaseOrders';
import type { PurchaseOrderInput } from '../../api/purchaseOrders';
import { listSuppliers } from '../../api/suppliers';
import type { Supplier } from '../../api/suppliers';
import { translateApiError } from '../../api/errors';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { formatAmountFR, pad2 } from '../../utils/numberFormat';
import { amountToFrenchWords } from '../../utils/amountToFrenchWords';
import { useCompany } from '../../hooks/useCompany';
import { CompanyHeader } from './CompanyHeader';

interface LineDraft {
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
}

type SupplierOption = { id: string; name: string };

const EMPTY_LINE: LineDraft = {
  description: '',
  unit: '',
  quantity: '1',
  unitPrice: '',
};

function fixed2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function computeTotals(lines: LineDraft[]) {
  const lineTotals = lines.map((l) => {
    const qty = Number(l.quantity);
    const price = Number(l.unitPrice);
    const raw = Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;
    return fixed2(raw);
  });
  const subtotal = fixed2(lineTotals.reduce((a, b) => a + b, 0));
  const tvaAmount = fixed2(subtotal * 0.19);
  return { subtotal, tvaAmount, totalAmount: fixed2(subtotal + tvaAmount) };
}

function lineAmount(line: LineDraft): string {
  const qty = Number(line.quantity);
  const price = Number(line.unitPrice);
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return '—';
  return formatAmountFR(String(fixed2(qty * price)));
}

function todayInputValue(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function isValidLine(line: LineDraft): boolean {
  return (
    line.description.trim() !== '' &&
    Number(line.quantity) > 0 &&
    Number(line.unitPrice) >= 0 &&
    line.description.trim().length <= 255
  );
}

export function PurchaseOrderFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(() => todayInputValue());
  const [lines, setLines] = useState<LineDraft[]>([{ ...EMPTY_LINE }]);

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const { company } = useCompany();

  useEffect(() => {
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    setSuppliersLoading(true);
    listSuppliers({ limit: 500 })
      .then((result) => {
        if (cancelled) return;
        setSuppliers(result.data.map((s: Supplier) => ({ id: s.id, name: s.name })));
      })
      .catch((err) => {
        if (cancelled) return;
        setFormError(
          translateApiError(err) || t('purchaseOrders:loadSuppliersFailed'),
        );
      })
      .finally(() => {
        if (!cancelled) setSuppliersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );
  };

  const addLine = () => {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  };

  const removeLine = (index: number) => {
    setLines((prev) =>
      prev.length === 1 ? [{ ...EMPTY_LINE }] : prev.filter((_, i) => i !== index),
    );
  };

  const totals = computeTotals(lines);

  const buildInput = (): PurchaseOrderInput => ({
    supplierId,
    orderDate,
    lines: lines
      .filter(isValidLine)
      .map((l) => ({
        description: l.description.trim(),
        unit: l.unit.trim() || undefined,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      })),
  });

  const validate = (): string => {
    if (!supplierId) return t('purchaseOrders:supplierRequired');
    const validLines = lines.filter(isValidLine);
    if (validLines.length === 0) {
      return t('purchaseOrders:emptyLines');
    }
    if (lines.some((l) => l.description.trim() !== '' && !isValidLine(l))) {
      return t('purchaseOrders:lineErrors');
    }
    return '';
  };

  const handleCreate = async () => {
    const errorMessage = validate();
    if (errorMessage) {
      setFormError(errorMessage);
      return;
    }
    setFormError('');
    setIsCreating(true);
    try {
      await createPurchaseOrder(buildInput());
      navigate('/purchase-orders');
    } catch (err) {
      setFormError(translateApiError(err) || t('purchaseOrders:saveFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="p-4 sm:p-6">
        <div dir="ltr">
          <CompanyHeader company={company} />

          <h2 className="mt-6 text-center text-2xl font-bold uppercase tracking-[0.3em] text-gray-900">
            Bon de commande
          </h2>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 border border-border">
            <div className="sm:border-r border-border px-3 py-2">
              <label
                htmlFor="po-number"
                className="block text-xs text-text-secondary"
              >
                N° :
              </label>
              <Input
                id="po-number"
                type="text"
                value="—"
                disabled
                className="mt-0.5 border-0 px-0 font-semibold shadow-none focus:ring-0"
              />
              <p className="mt-0.5 text-[11px] text-text-secondary">
                {t('purchaseOrders:serialAssigned')}
              </p>
            </div>
            <div className="sm:border-r border-border border-t border-t-border sm:border-t-0 px-3 py-2">
              <label
                htmlFor="po-order-date"
                className="block text-xs text-text-secondary"
              >
                Date :
              </label>
              <Input
                id="po-order-date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="mt-0.5"
              />
            </div>
            <div className="border-t border-t-border sm:border-t-0 px-3 py-2">
              <label
                htmlFor="po-supplier"
                className="block text-xs text-text-secondary"
              >
                FOURNISSEUR :
              </label>
              <Select
                id="po-supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="mt-0.5"
                disabled={suppliersLoading}
              >
                <option value="">
                  {suppliersLoading
                    ? t('purchaseOrders:loadingSuppliers')
                    : t('purchaseOrders:chooseSupplier')}
                </option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-2 text-left text-xs font-semibold text-text-secondary">
                  <th className="border border-border px-2 py-2 w-10">N°</th>
                  <th className="border border-border px-2 py-2">
                    Désignations
                  </th>
                  <th className="border border-border px-2 py-2 w-28">Unité</th>
                  <th className="border border-border px-2 py-2 w-24">QT</th>
                  <th className="border border-border px-2 py-2 w-28">P U</th>
                  <th className="border border-border px-2 py-2 w-32 text-right">
                    Montant
                  </th>
                  <th className="border border-border px-2 py-2 w-12" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="border border-border px-2 py-1.5 text-sm text-gray-500">
                      {pad2(index + 1)}
                    </td>
                    <td className="border border-border px-2 py-1.5">
                      <label htmlFor={`po-line-desc-${index}`} className="sr-only">
                        Description {index + 1}
                      </label>
                      <Input
                        id={`po-line-desc-${index}`}
                        type="text"
                        value={line.description}
                        onChange={(e) =>
                          updateLine(index, { description: e.target.value })
                        }
                        dir="rtl"
                        className="border-0 shadow-none px-0 focus:ring-0"
                      />
                    </td>
                    <td className="border border-border px-2 py-1.5">
                      <label htmlFor={`po-line-unit-${index}`} className="sr-only">
                        Unité {index + 1}
                      </label>
                      <Input
                        id={`po-line-unit-${index}`}
                        type="text"
                        value={line.unit}
                        onChange={(e) =>
                          updateLine(index, { unit: e.target.value })
                        }
                        placeholder="—"
                        className="border-0 shadow-none px-0 focus:ring-0"
                      />
                    </td>
                    <td className="border border-border px-2 py-1.5">
                      <label htmlFor={`po-line-qty-${index}`} className="sr-only">
                        Quantité {index + 1}
                      </label>
                      <Input
                        id={`po-line-qty-${index}`}
                        type="number"
                        min="0"
                        step="0.001"
                        inputMode="decimal"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(index, { quantity: e.target.value })
                        }
                        className="border-0 shadow-none px-0 focus:ring-0"
                      />
                    </td>
                    <td className="border border-border px-2 py-1.5">
                      <label htmlFor={`po-line-price-${index}`} className="sr-only">
                        Prix unitaire {index + 1}
                      </label>
                      <Input
                        id={`po-line-price-${index}`}
                        type="number"
                        min="0"
                        step="0.001"
                        inputMode="decimal"
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLine(index, { unitPrice: e.target.value })
                        }
                        className="border-0 shadow-none px-0 focus:ring-0"
                      />
                    </td>
                    <td className="border border-border px-2 py-1.5 text-right text-sm text-gray-900 whitespace-nowrap">
                      {lineAmount(line)}
                    </td>
                    <td className="border border-border px-2 py-1.5 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        className="text-danger-600"
                        aria-label={t('purchaseOrders:deleteLine', { n: index + 1 })}
                      >
                        {t('common:delete')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2">
            <Button variant="ghost" size="sm" onClick={addLine}>
              {t('purchaseOrders:addLine')}
            </Button>
          </div>

          <div className="mt-6 flex flex-col lg:flex-row lg:justify-between gap-6">
            <div className="flex-1 max-w-2xl">
              <p className="text-xs text-text-secondary">Arrêté le présent bon de commande à la somme de :</p>
              <p className="mt-1 text-sm font-medium text-gray-900 leading-relaxed">
                {totals.totalAmount > 0
                  ? amountToFrenchWords(totals.totalAmount)
                  : '—'}
              </p>
            </div>
            <div className="w-full lg:w-72">
              <div className="flex justify-between gap-8 py-2 text-sm border-b border-border">
                <span className="text-text-secondary">Total en HT</span>
                <span className="text-gray-900 tabular-nums">
                  {formatAmountFR(String(totals.subtotal))}
                </span>
              </div>
              <div className="flex justify-between gap-8 py-2 text-sm border-b border-border">
                <span className="text-text-secondary">TVA 19%</span>
                <span className="text-gray-900 tabular-nums">
                  {formatAmountFR(String(totals.tvaAmount))}
                </span>
              </div>
              <div className="flex justify-between gap-8 py-2 text-base font-bold">
                <span className="text-gray-900">Total TTC</span>
                <span className="text-gray-900 tabular-nums">
                  {formatAmountFR(String(totals.totalAmount))}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-10 flex justify-end">
            <div className="w-64 py-14 text-center text-sm text-text-secondary">
              Cachet et signature
            </div>
          </div>
        </div>

        {formError && (
          <div
            className="mt-4 text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
            role="alert"
          >
            {formError}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/purchase-orders')}
          >
            {t('common:cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? t('purchaseOrders:creating') : t('purchaseOrders:createTitle')}
          </Button>
        </div>
      </Card>
    </div>
  );
}