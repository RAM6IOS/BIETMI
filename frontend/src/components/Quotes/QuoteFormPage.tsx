import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getQuote, createQuote, updateQuote } from '../../api/quotes';
import type { Quote, QuoteLine, QuoteInput } from '../../api/quotes';
import type { PaymentMethod } from '../../api/invoices';
import { listCustomers } from '../../api/customers';
import type { Customer } from '../../api/customers';
import { translateApiError } from '../../api/errors';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Combobox } from '../ui/Combobox';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { useAuthRole } from '../../hooks/useAuthRole';
import { canReadQuotes, canWriteQuotes } from './quote-permissions';
import { formatAmount } from '../Invoices/invoice-labels';

interface LineDraft {
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
}

type PartnerOption = { id: string; name: string };

const UNIT_OPTIONS = ['U', 'KG', 'M', 'M²', 'L'];

const EMPTY_LINE: LineDraft = {
  description: '',
  unit: '',
  quantity: '1',
  unitPrice: '',
};

function fixed2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseDiscount(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > 100) return undefined;
  return n;
}

function computeTotals(lines: LineDraft[], discountInput: string) {
  const lineTotals = lines.map((l) => {
    const qty = Number(l.quantity);
    const price = Number(l.unitPrice);
    const raw = Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;
    return fixed2(raw);
  });
  const subtotal = fixed2(lineTotals.reduce((a, b) => a + b, 0));
  const pct = parseDiscount(discountInput) ?? 0;
  const discountAmount = fixed2(subtotal * (pct / 100));
  const amountAfterDiscount = fixed2(subtotal - discountAmount);
  const tvaAmount = fixed2(amountAfterDiscount * 0.19);
  return {
    subtotal,
    discountAmount,
    amountAfterDiscount,
    tvaAmount,
    totalAmount: fixed2(amountAfterDiscount + tvaAmount),
  };
}

function toLineDrafts(lines: QuoteLine[] | undefined): LineDraft[] {
  if (!lines || lines.length === 0) return [{ ...EMPTY_LINE }];
  return lines.map((l) => ({
    description: l.description,
    unit: l.unit ?? '',
    quantity: String(l.quantity),
    unitPrice: String(l.unitPrice),
  }));
}

function isValidLine(line: LineDraft): boolean {
  return (
    line.description.trim() !== '' &&
    Number(line.quantity) > 0 &&
    Number(line.unitPrice) >= 0 &&
    line.description.trim().length <= 255
  );
}
export function QuoteFormPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthRole();
  const isEdit = Boolean(id);
  const canRead = canReadQuotes(role);
  const canWrite = canWriteQuotes(role);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [notEditable, setNotEditable] = useState(false);
  const [partnerId, setPartnerId] = useState('');
  const [objet, setObjet] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [lines, setLines] = useState<LineDraft[]>([{ ...EMPTY_LINE }]);

  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true);
    setLoadError('');
    getQuote(id)
      .then((q: Quote) => {
        if (cancelled) return;
        if (q.status !== 'draft' && q.status !== 'revision_requested') {
          setNotEditable(true);
          return;
        }
        setPartnerId(q.partnerId);
        setObjet(q.objet ?? '');
        setDiscountPercent(
          q.discountPercent && Number(q.discountPercent) > 0
            ? String(Number(q.discountPercent))
            : '',
        );
        setPaymentMethods(q.paymentMethods ?? []);
        setLines(toLineDrafts(q.lines));
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          translateApiError(err) || t('quotes:loadFailedOne'),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  useEffect(() => {
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    setPartnersLoading(true);
    listCustomers({ limit: 500 })
      .then((r) => r.data.map((c: Customer) => ({ id: c.id, name: c.name })))
      .then((opts) => {
        if (cancelled) return;
        setPartners(opts);
      })
      .catch((err) => {
        if (cancelled) return;
        setFormError(
          translateApiError(err) || t('quotes:loadCustomersFailed'),
        );
      })
      .finally(() => {
        if (!cancelled) setPartnersLoading(false);
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
      prev.length === 1
        ? [{ ...EMPTY_LINE }]
        : prev.filter((_, i) => i !== index),
    );
  };

  const updatePaymentMethod = (
    index: number,
    patch: Partial<PaymentMethod>,
  ) => {
    setPaymentMethods((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    );
  };

  const addPaymentMethod = () => {
    setPaymentMethods((prev) => [...prev, { label: '', percentage: 0 }]);
  };

  const removePaymentMethod = (index: number) => {
    setPaymentMethods((prev) => prev.filter((_, i) => i !== index));
  };

  const totals = computeTotals(lines, discountPercent);

  const buildInput = (): QuoteInput => ({
    partnerId,
    objet: objet.trim() || undefined,
    discountPercent: parseDiscount(discountPercent),
    paymentMethods:
      paymentMethods
        .map((m) => ({ label: m.label.trim(), percentage: Number(m.percentage) }))
        .filter((m) => m.label && Number.isFinite(m.percentage)) || undefined,
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
    if (!canWrite) return t('quotes:writeNotAllowed');
    if (!partnerId) return t('quotes:partnerRequired');
    const validLines = lines.filter(isValidLine);
    if (validLines.length === 0) {
      return t('quotes:emptyLines');
    }
    if (lines.some((l) => l.description.trim() !== '' && !isValidLine(l))) {
      return t('quotes:lineErrors');
    }
    return '';
  };

  const handleSave = async () => {
    setFormError('');
    setIsSaving(true);
    try {
      const errorMessage = validate();
      if (errorMessage) throw new Error(errorMessage);
      const input = buildInput();
      const saved = id ? await updateQuote(id, input) : await createQuote(input);
      navigate(`/quotes/${saved.id}`);
    } catch (err) {
      setFormError(translateApiError(err) || t('quotes:saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500" aria-busy="true">
        <Spinner />
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState title={t('quotes:loadErrorTitle')} description={loadError}>
        <Button onClick={() => navigate('/quotes')}>
          {t('quotes:backToQuotes')}
        </Button>
      </EmptyState>
    );
  }

  if (!canRead) {
    return (
      <EmptyState
        title={t('quotes:permissionTitle')}
        description={t('quotes:permissionReadDescription')}
      >
        <Button onClick={() => navigate('/')}>{t('quotes:backHome')}</Button>
      </EmptyState>
    );
  }

  if (notEditable) {
    return (
      <EmptyState
        title={t('quotes:notEditableTitle')}
        description={t('quotes:notEditableDescription')}
      >
        <Button onClick={() => navigate('/quotes')}>
          {t('quotes:backToQuotes')}
        </Button>
      </EmptyState>
    );
  }

  if (!canWrite) {
    return (
      <EmptyState
        title={t('quotes:permissionTitle')}
        description={t('quotes:permissionWriteDescription')}
      >
        <Button onClick={() => navigate('/quotes')}>
          {t('quotes:backToQuotes')}
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="p-4 sm:p-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          {isEdit ? t('quotes:editTitle') : t('quotes:newTitle')}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {t('quotes:formHint')}
        </p>

        {formError && (
          <div
            className="mt-4 text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
            role="alert"
          >
            {formError}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="quote-partner"
              className="block text-sm font-medium text-gray-700"
            >
              {t('quotes:customerLabel')} <span className="text-danger-600">*</span>
            </label>
            <Select
              id="quote-partner"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="mt-1"
              disabled={partnersLoading}
            >
              <option value="">
                {partnersLoading
                  ? t('quotes:loadingCustomers')
                  : t('quotes:chooseCustomer')}
              </option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label
              htmlFor="quote-objet"
              className="block text-sm font-medium text-gray-700"
            >
              {t('quotes:objet')}
            </label>
            <Input
              id="quote-objet"
              type="text"
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              placeholder={t('quotes:objetPlaceholder')}
              className="mt-1"
            />
          </div>

          <div>
            <label
              htmlFor="quote-discount"
              className="block text-sm font-medium text-gray-700"
            >
              {t('quotes:discount')}
            </label>
            <Input
              id="quote-discount"
              type="number"
              min="0"
              max="100"
              step="0.01"
              inputMode="decimal"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              placeholder={t('quotes:discountPlaceholder')}
              className="mt-1"
            />
          </div>

          <div className="sm:col-span-2">
            <h3 className="text-sm font-medium text-gray-700">
              {t('quotes:paymentMethods')}
            </h3>
            <div className="mt-2">
              <Button variant="ghost" size="sm" onClick={addPaymentMethod}>
                {t('quotes:addPaymentMethod')}
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {paymentMethods.length === 0 && (
                <p className="text-xs text-text-secondary">
                  {t('quotes:paymentMethodsEmpty')}
                </p>
              )}
              {paymentMethods.map((method, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label
                      htmlFor={`quote-payment-label-${index}`}
                      className="block text-xs font-medium text-text-secondary mb-1"
                    >
                      {t('quotes:paymentMethodLabel')}
                    </label>
                    <Input
                      id={`quote-payment-label-${index}`}
                      type="text"
                      value={method.label}
                      onChange={(e) =>
                        updatePaymentMethod(index, { label: e.target.value })
                      }
                    />
                  </div>
                  <div className="w-24">
                    <label
                      htmlFor={`quote-payment-pct-${index}`}
                      className="block text-xs font-medium text-text-secondary mb-1"
                    >
                      {t('quotes:paymentMethodPercentage')}
                    </label>
                    <Input
                      id={`quote-payment-pct-${index}`}
                      type="number"
                      min={0}
                      max={100}
                      value={method.percentage === 0 ? '' : String(method.percentage)}
                      onChange={(e) =>
                        updatePaymentMethod(index, {
                          percentage: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-1"
                    onClick={() => removePaymentMethod(index)}
                    aria-label={t('quotes:removePaymentMethod', { n: index + 1 })}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-medium text-gray-700">{t('quotes:linesTitle')}</h3>
            <Button variant="ghost" size="sm" onClick={addLine}>
              {t('quotes:addLine')}
            </Button>
          </div>

          <div className="mt-3 space-y-3">
            {lines.map((line, index) => (
              <div
                key={index}
                className="border border-border rounded-md p-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
              >
                <div className="sm:col-span-4">
                  <label
                    htmlFor={`line-desc-${index}`}
                    className="block text-xs font-medium text-text-secondary mb-1"
                  >
                    {t('quotes:description')}
                  </label>
                  <Input
                    id={`line-desc-${index}`}
                    type="text"
                    value={line.description}
                    onChange={(e) =>
                      updateLine(index, { description: e.target.value })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`line-unit-${index}`}
                    className="block text-xs font-medium text-text-secondary mb-1"
                  >
                    {t('quotes:unit')}
                  </label>
                  <Combobox
                    id={`line-unit-${index}`}
                    options={UNIT_OPTIONS}
                    value={line.unit}
                    onChange={(e) => updateLine(index, { unit: e.target.value })}
                    placeholder={t('quotes:unitPlaceholder')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`line-qty-${index}`}
                    className="block text-xs font-medium text-text-secondary mb-1"
                  >
                    {t('quotes:quantity')}
                  </label>
                  <Input
                    id={`line-qty-${index}`}
                    type="number"
                    min="0"
                    step="0.001"
                    inputMode="decimal"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(index, { quantity: e.target.value })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`line-price-${index}`}
                    className="block text-xs font-medium text-text-secondary mb-1"
                  >
                    {t('quotes:unitPrice')}
                  </label>
                  <Input
                    id={`line-price-${index}`}
                    type="number"
                    min="0"
                    step="0.001"
                    inputMode="decimal"
                    value={line.unitPrice}
                    onChange={(e) =>
                      updateLine(index, { unitPrice: e.target.value })
                    }
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    {t('quotes:lineTotal')}
                  </label>
                  <p className="text-sm text-gray-900 py-2.5 truncate">
                    {line.quantity && line.unitPrice
                      ? formatAmount(
                          String(
                            fixed2(
                              Number(line.quantity) * Number(line.unitPrice),
                            ),
                          ),
                        )
                      : '—'}
                  </p>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(index)}
                    className="text-danger-600"
                    aria-label={t('quotes:deleteLine', { n: index + 1 })}
                  >
                    {t('common:delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2 w-full sm:w-72">
            <div className="flex justify-between gap-8 text-sm">
              <span className="text-text-secondary">{t('quotes:subtotal')}</span>
              <span className="text-gray-900">
                {formatAmount(String(totals.subtotal))}
              </span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between gap-8 text-sm">
                <span className="text-text-secondary">
                  {t('quotes:remise', {
                    pct: parseDiscount(discountPercent) ?? 0,
                  })}
                </span>
                <span className="text-gray-900">
                  {formatAmount(String(totals.discountAmount))}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-8 text-sm">
              <span className="text-text-secondary">{t('quotes:tax19')}</span>
              <span className="text-gray-900">
                {formatAmount(String(totals.tvaAmount))}
              </span>
            </div>
            <div className="flex justify-between gap-8 text-base font-semibold border-t border-border pt-2">
              <span className="text-gray-900">{t('quotes:totalLabel')}</span>
              <span className="text-gray-900">
                {formatAmount(String(totals.totalAmount))}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="secondary" onClick={() => navigate('/quotes')}>
              {t('common:cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? t('common:saving') : t('quotes:saveAsDraft')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}