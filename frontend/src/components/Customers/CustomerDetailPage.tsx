import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { translateApiError } from '../../api/errors';
import {
  getCustomer,
  updateCustomer,
  deleteCustomer,
} from '../../api/customers';
import type { CustomerDetail, CustomerInput } from '../../api/customers';
import { CustomerFormModal } from './CustomerFormModal';
import { ConfirmDialog } from './ConfirmDialog';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { InvoicesList } from '../Invoices/InvoicesList';

type TabKey = 'info' | 'invoices';

const TABS: {
  key: TabKey;
  labelKey: string;
  countKey: 'invoices' | null;
}[] = [
  { key: 'info', labelKey: 'customers:info', countKey: null },
  { key: 'invoices', labelKey: 'customers:invoices', countKey: 'invoices' },
];

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    searchParams.get('tab') === 'invoices' ? 'invoices' : 'info',
  );

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await getCustomer(id);
      setCustomer(result);
    } catch (err) {
      setError(translateApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdate = async (input: CustomerInput) => {
    if (!id) return;
    await updateCustomer(id, input);
    setShowEdit(false);
    await load();
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(id);
      setShowDelete(false);
      navigate('/');
    } catch (err) {
      setError(translateApiError(err));
      setShowDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const primary =
    customer?.contacts?.find((c) => c.isPrimary) ?? customer?.contacts?.[0];
  const otherContacts =
    customer?.contacts?.filter((c) => c !== primary) ?? [];

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500" aria-busy="true">
        <Spinner />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <EmptyState
        title={t('customers:loadErrorTitle')}
        description={error || t('customers:notFound')}
      >
        <Link to="/">
          <Button>{t('customers:backToList')}</Button>
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="p-4 sm:p-6">
        <div className="mb-4">
          <Link
            to="/"
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            → {t('common:back')}
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{customer.name}</h2>
            {customer.nif && (
              <p className="text-sm text-text-secondary mt-1">NIF: {customer.nif}</p>
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
                {t(tab.labelKey)}
                {tab.countKey && (
                  <Badge className="ms-1">{customer[tab.countKey].length}</Badge>
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
                  {t('customers:mainContact')}
                </p>
                <p className="text-gray-900">
                  {primary
                    ? `${primary.name}${primary.email ? ` — ${primary.email}` : ''}`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">
                  {t('customers:phone')}
                </p>
                <p className="text-gray-900">{primary?.phone ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">
                  {t('customers:registerNo')}
                </p>
                <p className="text-gray-900">{customer.commercialRegister ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">
                  {t('customers:address')}
                </p>
                <p className="text-gray-900">{customer.address ?? '—'}</p>
              </div>
              {otherContacts.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-text-secondary mb-1">
                    {t('customers:otherContacts')}
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

          {activeTab === 'invoices' && (
            <InvoicesList invoices={customer.invoices} />
          )}
        </div>
      </Card>

      {showEdit && customer && (
        <CustomerFormModal
          customer={customer}
          onClose={() => setShowEdit(false)}
          onSubmit={handleUpdate}
        />
      )}

      {showDelete && customer && (
        <ConfirmDialog
          customer={customer}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
