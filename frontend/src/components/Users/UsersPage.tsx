import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listUsers, updateUser, deleteUser } from '../../api/users';
import type { User } from '../../api/users';
import { translateApiError } from '../../api/errors';
import { Table } from '../ui/Table';
import type { TableColumn } from '../ui/Table';
import { UserFormModal } from './UserFormModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { Toast } from '../ui/Toast';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';

const PAGE_SIZE = 20;

export function UsersPage() {
  const { t } = useTranslation();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listUsers({
      search: search.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) return;
        setUsers(result.data);
        setTotal(result.meta.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(translateApiError(err) || t('common:errors.requestFailed', { status: 500 }));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, page]);

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

  const handleSearchChange = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const openCreate = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleCreated = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await listUsers({ page: 1, limit: PAGE_SIZE });
      setUsers(result.data);
      setTotal(result.meta.total);
      setPage(1);
      setSearch('');
    } catch (err) {
      setError(translateApiError(err) || t('common:errors.default'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdated = async () => {
    setShowForm(false);
    setEditingUser(null);
    notify(t('users:updatedSuccess'));
    setIsLoading(true);
    setError('');
    try {
      const result = await listUsers({
        search: search.trim() || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setUsers(result.data);
      setTotal(result.meta.total);
    } catch (err) {
      setError(translateApiError(err) || t('common:errors.default'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActive = async (user: User) => {
    setError('');
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      await handleUpdated();
    } catch (err) {
      setError(translateApiError(err) || t('common:errors.default'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError('');
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await handleUpdated();
      notify(t('users:deletedSuccess'));
    } catch (err) {
      setError(translateApiError(err) || t('common:errors.default'));
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const columns: TableColumn<User>[] = [
    {
      key: 'fullName',
      header: t('users:fullName'),
      render: (r) => <span className="font-medium">{r.fullName}</span>,
    },
    {
      key: 'username',
      header: t('users:username'),
      render: (r) => r.username,
    },
    {
      key: 'role',
      header: t('users:role'),
      render: (r) => t(`users:roles.${r.role}`),
    },
    {
      key: 'isActive',
      header: t('users:status'),
      render: (r) => (
        <Button
          variant={r.isActive ? 'secondary' : 'danger'}
          size="sm"
          onClick={() => toggleActive(r)}
        >
          {r.isActive ? t('users:active') : t('users:inactive')}
        </Button>
      ),
    },
  ];

  const actions = (r: User) => (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={() => setResetUser(r)}>
        {t('users:resetPassword')}
      </Button>
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
          title={t('users:title')}
          subtitle={t('users:subtitle')}
          actionLabel={t('users:addUser')}
          onAction={openCreate}
        />

        {success && (
          <div className="mt-4">
            <Toast>{success}</Toast>
          </div>
        )}

        <div className="mt-6">
          <label htmlFor="user-search" className="sr-only">
            {t('users:searchPlaceholder')}
          </label>
          <Input
            id="user-search"
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('users:searchPlaceholder')}
          />
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
            <Table
              columns={columns}
              rows={users}
              rowKey={(r) => r.id}
              actions={actions}
              actionsLabel={t('common:actions')}
              emptyState={
                <EmptyState title={t('users:noUsers')} />
              }
            />
          )}
        </div>

        {!isLoading && totalPages > 1 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-text-secondary">
              {t('common:pagination.showing', { from, to, total })}
            </p>
            <div className="flex gap-2 items-center flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                {t('common:previous')}
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Button
                  key={n}
                  variant={n === page ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPage(n)}
                  aria-current={n === page ? 'page' : undefined}
                >
                  {n}
                </Button>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                {t('common:next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {showForm && (
        <UserFormModal
          user={editingUser}
          onClose={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      )}

      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          user={deleteTarget}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
