import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getSupplier,
  updateSupplier,
  deleteSupplier,
} from '../../api/suppliers';
import type { SupplierDetail, SupplierInput } from '../../api/suppliers';
import { translateApiError } from '../../api/errors';
import { SupplierFormModal } from './SupplierFormModal';
import { ConfirmDialog } from './ConfirmDialog';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { PurchaseOrdersList } from '../PurchaseOrders/PurchaseOrdersList';

type TabKey = 'info' | 'purchaseOrders';

interface TabDef {
  key: TabKey;
  label: string;
  countKey: 'purchaseOrders' | null;
}

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const TABS: TabDef[] = [
    { key: 'info', label: t('suppliers:info'), countKey: null },
    { key: 'purchaseOrders', label: t('suppliers:purchaseOrders'), countKey: 'purchaseOrders' },
  ];

  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('info');

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await getSupplier(id);
      setSupplier(result);
    } catch (err) {
      setError(translateApiError(err) || t('suppliers:loadFailedOne'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdate = async (input: SupplierInput) => {
    if (!id) return;
    await updateSupplier(id, input);
    setShowEdit(false);
    await load();
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteSupplier(id);
      setShowDelete(false);
      navigate('/suppliers');
    } catch (err) {
      setError(translateApiError(err) || t('suppliers:deleteFailed'));
      setShowDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const primary =
    supplier?.contacts?.find((c) => c.isPrimary) ?? supplier?.contacts?.[0];
  const otherContacts =
    supplier?.contacts?.filter((c) => c !== primary) ?? [];

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500" aria-busy="true">
        <Spinner />
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <EmptyState title={t('suppliers:loadErrorTitle')} description={error || t('suppliers:notFound')}>
        <Link to="/suppliers">
          <Button>{t('suppliers:backToList')}</Button>
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="p-4 sm:p-6">
        <div className="mb-4">
          <Link
            to="/suppliers"
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            → {t('suppliers:backToList')}
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-gray-900">{supplier.name}</h2>
              <Badge
                className={
                  supplier.currency === 'DZD'
                    ? 'bg-success-50 text-success-700'
                    : 'bg-warning-50 text-warning-700'
                }
              >
                {supplier.currency === 'DZD' ? 'DZD' : t('suppliers:foreignCurrency')}
              </Badge>
            </div>
            {supplier.nif && (
              <p className="text-sm text-text-secondary mt-1">NIF: {supplier.nif}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowEdit(true)}>
              {t('common:edit')}
            </Button>
            <Button variant="danger" onClick={() => setShowDelete(true)}>
              {t('common:delete')}
            </Button>
          </div>
        </div>

        <div
          className="flex gap-6 border-b border-border mt-6 overflow-x-auto"
          role="tablist"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`pb-2.5 pt-1 text-sm font-medium -mb-px border-b-2 focus:outline-none whitespace-nowrap ${
                  isActive
                    ? 'text-primary-600 border-primary-600'
                    : 'text-text-secondary border-transparent hover:text-gray-800'
                }`}
                aria-selected={isActive}
                role="tab"
              >
                {tab.label}
                {tab.countKey && (
                  <Badge className="ms-1">{supplier[tab.countKey].length}</Badge>
                )}
              </button>
            );
          })}
        </div>

        <div className="pt-6">
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-text-secondary mb-1">
                  {t('suppliers:mainContact')}
                </p>
                <p className="text-gray-900">
                  {primary
                    ? `${primary.name}${primary.email ? ` — ${primary.email}` : ''}`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">{t('suppliers:phone')}</p>
                <p className="text-gray-900">{primary?.phone ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">{t('suppliers:paymentTerms')}</p>
                <p className="text-gray-900">{supplier.paymentTerms ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">
                  {t('suppliers:registerNo')}
                </p>
                <p className="text-gray-900">{supplier.commercialRegister ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">{t('suppliers:address')}</p>
                <p className="text-gray-900">{supplier.address ?? '—'}</p>
              </div>
              {supplier.categories && supplier.categories.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-text-secondary mb-1">
                    {t('supplierCategories:categories')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {supplier.categories.map((c) => (
                      <Badge
                        key={c.id}
                        className="bg-primary-50 text-primary-700"
                      >
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {otherContacts.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-text-secondary mb-1">
                    {t('suppliers:otherContacts')}
                  </p>
                  <ul className="space-y-1">
                    {otherContacts.map((c, i) => (
                      <li key={i} className="text-gray-900">
                        {c.name}
                        {c.phone ? ` — ${c.phone}` : ''}
                        {c.email ? ` — ${c.email}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'purchaseOrders' && (
            <PurchaseOrdersList orders={supplier.purchaseOrders} />
          )}
        </div>
      </Card>

      {showEdit && supplier && (
        <SupplierFormModal
          supplier={supplier}
          onClose={() => setShowEdit(false)}
          onSubmit={handleUpdate}
        />
      )}

      {showDelete && supplier && (
        <ConfirmDialog
          supplier={supplier}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
