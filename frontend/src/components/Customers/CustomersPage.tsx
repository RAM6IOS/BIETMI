import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { translateApiError } from '../../api/errors';
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../../api/customers';
import type { Customer, CustomerInput } from '../../api/customers';
import { CustomerTable } from './CustomerTable';
import type { SortField, SortOrder } from './CustomerTable';
import { CustomerFormModal } from './CustomerFormModal';
import { ConfirmDialog } from './ConfirmDialog';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { Toast } from '../ui/Toast';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

const PAGE_SIZE = 20;

interface SortOption {
  labelKey: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}

const SORT_OPTIONS: SortOption[] = [
  { labelKey: 'customers:sortNewest', sortBy: 'createdAt', sortOrder: 'desc' },
  { labelKey: 'customers:sortNameAsc', sortBy: 'name', sortOrder: 'asc' },
  { labelKey: 'customers:sortNameDesc', sortBy: 'name', sortOrder: 'desc' },
];

function applySuccess(
  timeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  setSuccess: (m: string | null) => void,
  message: string,
) {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  setSuccess(message);
  timeoutRef.current = setTimeout(() => setSuccess(null), 3000);
}

export function CustomersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listCustomers({
      search: search.trim() || undefined,
      sortBy,
      sortOrder,
      page,
      limit: PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) return;
        setCustomers(result.data);
        setTotal(result.meta.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(translateApiError(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, sortBy, sortOrder, page]);

  useEffect(() => {
    const timer = successTimer.current;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const fetchPage = async (opts: {
    searchValue?: string;
    sortByValue?: SortField;
    sortOrderValue?: SortOrder;
    pageValue?: number;
  } = {}) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await listCustomers({
        search: (opts.searchValue ?? search).trim() || undefined,
        sortBy: opts.sortByValue ?? sortBy,
        sortOrder: opts.sortOrderValue ?? sortOrder,
        page: opts.pageValue ?? page,
        limit: PAGE_SIZE,
      });
      setCustomers(result.data);
      setTotal(result.meta.total);
    } catch (err) {
      setError(translateApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const handleSortChange = (value: string) => {
    const option = SORT_OPTIONS.find((o) => t(o.labelKey) === value);
    if (!option) return;
    setSortBy(option.sortBy);
    setSortOrder(option.sortOrder);
    setPage(1);
  };

  const handleColumnSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleCreate = async (input: CustomerInput) => {
    await createCustomer(input);
    setShowForm(false);
    setEditingCustomer(null);
    setPage(1);
    setSearch('');
    await fetchPage({ searchValue: '', sortByValue: sortBy, sortOrderValue: sortOrder, pageValue: 1 });
    applySuccess(successTimer, setSuccess, t('customers:createdSuccess'));
  };

  const handleUpdate = async (input: CustomerInput) => {
    if (!editingCustomer) return;
    await updateCustomer(editingCustomer.id, input);
    setShowForm(false);
    setEditingCustomer(null);
    await fetchPage();
    applySuccess(successTimer, setSuccess, t('customers:updatedSuccess'));
  };

  const handleSubmit = async (input: CustomerInput) => {
    if (editingCustomer) {
      await handleUpdate(input);
    } else {
      await handleCreate(input);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(deleteTarget.id);
      setDeleteTarget(null);
      await fetchPage();
      applySuccess(successTimer, setSuccess, t('customers:deletedSuccess'));
    } catch (err) {
      setError(translateApiError(err));
      setDeleteTarget(null);
      setIsLoading(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreate = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const openView = (customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  };

  const openViewInvoices = (customer: Customer) => {
    navigate(`/customers/${customer.id}?tab=invoices`);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeSortLabel =
    t(
      SORT_OPTIONS.find((o) => o.sortBy === sortBy && o.sortOrder === sortOrder)
        ?.labelKey ?? SORT_OPTIONS[0].labelKey,
    );

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="p-4 sm:p-6">
        <PageHeader title={t('customers:title')} actionLabel={t('customers:new')} onAction={openCreate} />

        {success && (
          <div className="mt-4">
            <Toast>{success}</Toast>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <label htmlFor="customer-search" className="sr-only">
            {t('customers:searchLabel')}
          </label>
          <Input
            id="customer-search"
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('customers:searchPlaceholder')}
            className="sm:flex-1"
          />
          <label htmlFor="customer-sort" className="sr-only">
            {t('customers:sortLabel')}
          </label>
          <Select
            id="customer-sort"
            value={activeSortLabel}
            onChange={(e) => handleSortChange(e.target.value)}
            className="sm:w-52"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.labelKey} value={t(o.labelKey)}>
                {t(o.labelKey)}
              </option>
            ))}
          </Select>
        </div>

        {error && (
          <div
            className="mt-4 text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="mt-4 overflow-hidden border border-border rounded-lg">
          {isLoading ? (
            <div className="text-center py-14">
              <Spinner />
            </div>
          ) : (
            <CustomerTable
              customers={customers}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleColumnSort}
              onView={openView}
              onViewInvoices={openViewInvoices}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          )}
        </div>

        {!isLoading && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-text-secondary">
              {t('common:pagination.showing', { from, to, total })}
            </p>
            <div className="flex gap-2 items-center flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsLoading(true);
                  setPage((p) => Math.max(1, p - 1));
                }}
                disabled={page <= 1}
              >
                {t('common:previous')}
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Button
                  key={n}
                  variant={n === page ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setIsLoading(true);
                    setPage(n);
                  }}
                  aria-current={n === page ? 'page' : undefined}
                >
                  {n}
                </Button>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsLoading(true);
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
                disabled={page >= totalPages}
              >
                {t('common:next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {showForm && (
        <CustomerFormModal
          customer={editingCustomer}
          onClose={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          customer={deleteTarget}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
