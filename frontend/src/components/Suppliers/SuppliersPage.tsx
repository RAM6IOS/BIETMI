import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../../api/suppliers';
import type { Supplier, SupplierInput } from '../../api/suppliers';
import { translateApiError } from '../../api/errors';
import { SupplierTable } from './SupplierTable';
import type { SortField, SortOrder } from './SupplierTable';
import { SupplierFormModal } from './SupplierFormModal';
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
  label: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}

function applySuccess(
  timeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  setSuccess: (m: string | null) => void,
  message: string,
) {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  setSuccess(message);
  timeoutRef.current = setTimeout(() => setSuccess(null), 3000);
}

export function SuppliersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const SORT_OPTIONS: SortOption[] = [
    { label: t('suppliers:sortNewest'), sortBy: 'createdAt', sortOrder: 'desc' },
    { label: t('suppliers:sortNameAsc'), sortBy: 'name', sortOrder: 'asc' },
    { label: t('suppliers:sortNameDesc'), sortBy: 'name', sortOrder: 'desc' },
  ];

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listSuppliers({
      search: search.trim() || undefined,
      sortBy,
      sortOrder,
      page,
      limit: PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) return;
        setSuppliers(result.data);
        setTotal(result.meta.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(translateApiError(err) || t('suppliers:loadFailed'));
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
      const result = await listSuppliers({
        search: (opts.searchValue ?? search).trim() || undefined,
        sortBy: opts.sortByValue ?? sortBy,
        sortOrder: opts.sortOrderValue ?? sortOrder,
        page: opts.pageValue ?? page,
        limit: PAGE_SIZE,
      });
      setSuppliers(result.data);
      setTotal(result.meta.total);
    } catch (err) {
      setError(translateApiError(err) || t('suppliers:loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const handleSortChange = (value: string) => {
    const option = SORT_OPTIONS.find((o) => o.label === value);
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

  const handleCreate = async (input: SupplierInput) => {
    await createSupplier(input);
    setShowForm(false);
    setEditingSupplier(null);
    setPage(1);
    setSearch('');
    await fetchPage({ searchValue: '', sortByValue: sortBy, sortOrderValue: sortOrder, pageValue: 1 });
    applySuccess(successTimer, setSuccess, t('suppliers:createdSuccess'));
  };

  const handleUpdate = async (input: SupplierInput) => {
    if (!editingSupplier) return;
    await updateSupplier(editingSupplier.id, input);
    setShowForm(false);
    setEditingSupplier(null);
    await fetchPage();
    applySuccess(successTimer, setSuccess, t('suppliers:updatedSuccess'));
  };

  const handleSubmit = async (input: SupplierInput) => {
    if (editingSupplier) {
      await handleUpdate(input);
    } else {
      await handleCreate(input);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteSupplier(deleteTarget.id);
      setDeleteTarget(null);
      await fetchPage();
      applySuccess(successTimer, setSuccess, t('suppliers:deletedSuccess'));
    } catch (err) {
      setError(translateApiError(err) || t('suppliers:deleteFailed'));
      setDeleteTarget(null);
      setIsLoading(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreate = () => {
    setEditingSupplier(null);
    setShowForm(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  const openView = (supplier: Supplier) => {
    navigate(`/suppliers/${supplier.id}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeSortLabel =
    SORT_OPTIONS.find((o) => o.sortBy === sortBy && o.sortOrder === sortOrder)?.label ??
    SORT_OPTIONS[0].label;

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="p-4 sm:p-6">
        <PageHeader title={t('suppliers:title')} actionLabel={t('suppliers:new')} onAction={openCreate} />

        {success && (
          <div className="mt-4">
            <Toast>{success}</Toast>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <label htmlFor="supplier-search" className="sr-only">
            {t('suppliers:searchLabel')}
          </label>
          <Input
            id="supplier-search"
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('suppliers:searchPlaceholder')}
            className="sm:flex-1"
          />
          <label htmlFor="supplier-sort" className="sr-only">
            {t('suppliers:sortLabel')}
          </label>
          <Select
            id="supplier-sort"
            value={activeSortLabel}
            onChange={(e) => handleSortChange(e.target.value)}
            className="sm:w-52"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.label} value={o.label}>
                {o.label}
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
            <SupplierTable
              suppliers={suppliers}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleColumnSort}
              onView={openView}
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
        <SupplierFormModal
          supplier={editingSupplier}
          onClose={() => {
            setShowForm(false);
            setEditingSupplier(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          supplier={deleteTarget}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
