import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  listSupplierCategories,
  createSupplierCategory,
  updateSupplierCategory,
  deleteSupplierCategory,
} from '../../api/supplierCategories';
import type {
  SupplierCategory,
  SupplierCategoryInput,
} from '../../api/supplierCategories';
import { translateApiError } from '../../api/errors';
import { Table } from '../ui/Table';
import type { TableColumn } from '../ui/Table';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { Toast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { CategoryFormModal } from './CategoryFormModal';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

export function SupplierCategoriesPage() {
  const { t } = useTranslation();

  const [categories, setCategories] = useState<SupplierCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<SupplierCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierCategory | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listSupplierCategories()
      .then((result) => {
        if (cancelled) return;
        setCategories(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          translateApiError(err) ||
            t('common:errors.requestFailed', { status: 500 }),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = successTimer.current;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const notify = (message: string) => {
    if (successTimer.current) clearTimeout(successTimer.current);
    setSuccess(message);
    successTimer.current = setTimeout(() => setSuccess(null), 3000);
  };

  const refresh = async () => {
    try {
      const result = await listSupplierCategories();
      setCategories(result);
      setError('');
    } catch (err) {
      setError(translateApiError(err) || t('common:errors.default'));
    }
  };

  const openCreate = () => {
    setEditingCategory(null);
    setShowForm(true);
  };

  const openEdit = (category: SupplierCategory) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleSubmit = async (input: SupplierCategoryInput) => {
    if (editingCategory) {
      await updateSupplierCategory(editingCategory.id, input);
      notify(t('supplierCategories:updatedSuccess'));
    } else {
      await createSupplierCategory(input);
      notify(t('supplierCategories:createdSuccess'));
    }
    await refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError('');
    try {
      await deleteSupplierCategory(deleteTarget.id);
      setDeleteTarget(null);
      await refresh();
      notify(t('supplierCategories:deletedSuccess'));
    } catch (err) {
      setError(translateApiError(err) || t('common:errors.default'));
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: TableColumn<SupplierCategory>[] = [
    {
      key: 'name',
      header: t('supplierCategories:name'),
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: 'createdAt',
      header: t('supplierCategories:createdAt'),
      render: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
  ];

  const actions = (r: SupplierCategory) => (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={() => openEdit(r)}>
        {t('common:edit')}
      </Button>
      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(r)}>
        {t('common:delete')}
      </Button>
    </div>
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="p-4 sm:p-6">
        <PageHeader
          title={t('supplierCategories:title')}
          subtitle={t('supplierCategories:subtitle')}
          actionLabel={t('supplierCategories:addCategory')}
          onAction={openCreate}
        />

        {success && (
          <div className="mt-4">
            <Toast>{success}</Toast>
          </div>
        )}

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
            <Table
              columns={columns}
              rows={categories}
              rowKey={(r) => r.id}
              actions={actions}
              actionsLabel={t('common:actions')}
              emptyState={
                <EmptyState title={t('supplierCategories:noCategories')} />
              }
            />
          )}
        </div>
      </Card>

      {showForm && (
        <CategoryFormModal
          category={editingCategory}
          onClose={() => {
            setShowForm(false);
            setEditingCategory(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          category={deleteTarget}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}