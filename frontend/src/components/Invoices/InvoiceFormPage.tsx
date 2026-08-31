import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getInvoice,
  createInvoice,
  updateInvoice,
  issueInvoice,
} from '../../api/invoices';
import type { Invoice, InvoiceInput, InvoiceLine } from '../../api/invoices';
import { listCustomers } from '../../api/customers';
import type { Customer } from '../../api/customers';
import { translateApiError } from '../../api/errors';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { formatAmount } from './invoice-labels';
import { useAuthRole } from '../../hooks/useAuthRole';
import { canWriteInvoices } from './invoice-permissions';

interface LineDraft {
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
}

type PartnerOption = { id: string; name: string };

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

function toLineDrafts(lines: InvoiceLine[] | undefined): LineDraft[] {
  if (!lines || lines.length === 0) return [{ ...EMPTY_LINE }];
  return lines.map((l) => ({
    description: l.description,
    unit: l.unit ?? '',
    quantity: String(l.quantity),
    unitPrice: String(l.unitPrice),
  }));
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

export function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useAuthRole();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [issueDate, setIssueDate] = useState(() => todayInputValue());
  const [dueDate, setDueDate] = useState('');
  const [internalReference, setInternalReference] = useState('');
  const [objet, setObjet] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([{ ...EMPTY_LINE }]);

  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [formError, setFormError] = useState('');

  const canWrite = canWriteInvoices(role);

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true);
    setLoadError('');
    getInvoice(id)
      .then((inv) => {
        if (cancelled) return;
        setPartnerId(inv.partnerId);
        setIssueDate(inv.issueDate.slice(0, 10));
        setDueDate(inv.dueDate ? inv.dueDate.slice(0, 10) : '');
        setInternalReference(inv.internalReference ?? '');
        setObjet(inv.objet ?? '');
        setLines(toLineDrafts(inv.lines));
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          translateApiError(err) || t('invoices:loadFailedOne'),
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
          translateApiError(err) || t('invoices:loadPartnersFailed'),
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
      prev.length === 1 ? [{ ...EMPTY_LINE }] : prev.filter((_, i) => i !== index),
    );
  };

  const totals = computeTotals(lines);

  const buildInput = (): InvoiceInput => ({
    partnerId,
    issueDate,
    dueDate: dueDate || undefined,
    internalReference: internalReference.trim() || undefined,
    objet: objet.trim() || undefined,
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
    if (!canWrite) return t('invoices:writeNotAllowed');
    if (!partnerId) return t('invoices:partnerRequired');
    const validLines = lines.filter(isValidLine);
    if (validLines.length === 0) {
      return t('invoices:emptyLines');
    }
    if (lines.some((l) => l.description.trim() !== '' && !isValidLine(l))) {
      return t('invoices:lineErrors');
    }
    return '';
  };

  const saveDraft = async (): Promise<Invoice> => {
    const errorMessage = validate();
    if (errorMessage) {
      throw new Error(errorMessage);
    }
    const input = buildInput();
    if (id) {
      return updateInvoice(id, input);
    }
    return createInvoice(input);
  };

  const handleSaveDraft = async () => {
    setFormError('');
    setIsSavingDraft(true);
    try {
      const saved = await saveDraft();
      navigate(`/invoices/${saved.id}`);
    } catch (err) {
      setFormError(translateApiError(err) || t('invoices:saveDraftFailed'));
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleIssue = async () => {
    setFormError('');
    setIsIssuing(true);
    try {
      const saved = await saveDraft();
      const issued = await issueInvoice(saved.id);
      navigate(`/invoices/${issued.id}`);
    } catch (err) {
      setFormError(translateApiError(err) || t('invoices:issueFailed'));
    } finally {
      setIsIssuing(false);
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
      <EmptyState
        title={t('invoices:loadErrorTitle')}
        description={loadError}
      >
        <Button onClick={() => navigate('/invoices')}>
          {t('invoices:backToInvoices')}
        </Button>
      </EmptyState>
    );
  }

  if (!canWrite) {
    return (
      <EmptyState
        title={t('invoices:permissionTitle')}
        description={t('invoices:permissionDescription')}
      >
        <Button onClick={() => navigate('/invoices')}>
          {t('invoices:backToInvoices')}
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="p-4 sm:p-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          {isEdit ? t('invoices:editTitle') : t('invoices:newTitle')}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {t('invoices:formHint')}
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
              htmlFor="invoice-partner"
              className="block text-sm font-medium text-gray-700"
            >
              {t('invoices:partnerLabel')} <span className="text-danger-600">*</span>
            </label>
            <Select
              id="invoice-partner"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="mt-1"
              disabled={partnersLoading}
            >
              <option value="">
                {partnersLoading
                  ? t('invoices:loadingPartners')
                  : t('invoices:chooseCustomer')}
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
              htmlFor="invoice-issue-date"
              className="block text-sm font-medium text-gray-700"
            >
              {t('invoices:issueDate')}
            </label>
            <Input
              id="invoice-issue-date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label
              htmlFor="invoice-due-date"
              className="block text-sm font-medium text-gray-700"
            >
              {t('invoices:dueDate')}
            </label>
            <Input
              id="invoice-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="invoice-reference"
              className="block text-sm font-medium text-gray-700"
            >
              {t('invoices:internalReference')}
            </label>
            <Input
              id="invoice-reference"
              type="text"
              value={internalReference}
              onChange={(e) => setInternalReference(e.target.value)}
              placeholder={t('invoices:refPlaceholder')}
              className="mt-1"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="invoice-objet"
              className="block text-sm font-medium text-gray-700"
            >
              {t('invoices:objet')}
            </label>
            <Input
              id="invoice-objet"
              type="text"
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              placeholder={t('invoices:objetPlaceholder')}
              className="mt-1"
            />
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-medium text-gray-700">{t('invoices:linesTitle')}</h3>
            <Button variant="ghost" size="sm" onClick={addLine}>
              {t('invoices:addLine')}
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
                    {t('invoices:description')}
                  </label>
                  <Input
                    id={`line-desc-${index}`}
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(index, { description: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`line-unit-${index}`}
                    className="block text-xs font-medium text-text-secondary mb-1"
                  >
                    {t('invoices:unit')}
                  </label>
                  <Input
                    id={`line-unit-${index}`}
                    type="text"
                    value={line.unit}
                    onChange={(e) => updateLine(index, { unit: e.target.value })}
                    placeholder={t('invoices:unitPlaceholder')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`line-qty-${index}`}
                    className="block text-xs font-medium text-text-secondary mb-1"
                  >
                    {t('invoices:quantity')}
                  </label>
                  <Input
                    id={`line-qty-${index}`}
                    type="number"
                    min="0"
                    step="0.001"
                    inputMode="decimal"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, { quantity: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`line-price-${index}`}
                    className="block text-xs font-medium text-text-secondary mb-1"
                  >
                    {t('invoices:unitPrice')}
                  </label>
                  <Input
                    id={`line-price-${index}`}
                    type="number"
                    min="0"
                    step="0.001"
                    inputMode="decimal"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    {t('invoices:lineTotal')}
                  </label>
                  <p className="text-sm text-gray-900 py-2.5 truncate">
                    {line.quantity && line.unitPrice
                      ? formatAmount(String(fixed2(Number(line.quantity) * Number(line.unitPrice))))
                      : '—'}
                  </p>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(index)}
                    className="text-danger-600"
                    aria-label={t('invoices:deleteLine', { n: index + 1 })}
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
              <span className="text-text-secondary">{t('invoices:subtotal')}</span>
              <span className="text-gray-900">{formatAmount(String(totals.subtotal))}</span>
            </div>
            <div className="flex justify-between gap-8 text-sm">
              <span className="text-text-secondary">{t('invoices:tax19')}</span>
              <span className="text-gray-900">{formatAmount(String(totals.tvaAmount))}</span>
            </div>
            <div className="flex justify-between gap-8 text-base font-semibold border-t border-border pt-2">
              <span className="text-gray-900">{t('invoices:totalLabel')}</span>
              <span className="text-gray-900">{formatAmount(String(totals.totalAmount))}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="secondary" onClick={() => navigate('/invoices')}>
              {t('common:cancel')}
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isIssuing}
            >
              {isSavingDraft ? t('common:saving') : t('invoices:saveAsDraft')}
            </Button>
            <Button
              onClick={handleIssue}
              disabled={isSavingDraft || isIssuing}
            >
              {isIssuing ? t('invoices:issuing') : t('invoices:issueButton')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}