import type { Customer } from '../../api/customers';
import { useTranslation } from 'react-i18next';
import { Table } from '../ui/Table';
import type { TableColumn } from '../ui/Table';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

export type SortField = 'name' | 'createdAt' | 'nif';
export type SortOrder = 'asc' | 'desc';

interface CustomerTableProps {
  customers: Customer[];
  sortBy: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onView: (customer: Customer) => void;
  onViewInvoices: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

function getPrimaryPhone(customer: Customer): string {
  const primary = customer.contacts?.find((c) => c.isPrimary);
  const first = customer.contacts?.[0];
  return primary?.phone ?? first?.phone ?? '—';
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('ar-DZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function CustomerTable({
  customers,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onViewInvoices,
  onEdit,
  onDelete,
}: CustomerTableProps) {
  const { t } = useTranslation();

  const columns: TableColumn<Customer>[] = [
    {
      key: 'name',
      header: t('customers:name'),
      sortable: true,
      render: (c) => <span className="font-medium text-gray-900">{c.name}</span>,
    },
    {
      key: 'phone',
      header: t('customers:phone'),
      render: (c) => <span className="text-gray-500">{getPrimaryPhone(c)}</span>,
    },
    {
      key: 'nif',
      header: t('customers:nif'),
      render: (c) => <span className="text-gray-500">{c.nif ?? '—'}</span>,
    },
    {
      key: 'createdAt',
      header: t('customers:createdAt'),
      sortable: true,
      render: (c) => <span className="text-gray-500">{formatDate(c.createdAt)}</span>,
    },
    {
      key: 'invoices',
      header: t('customers:invoices'),
      render: (c) => (
        <button
          type="button"
          onClick={() => onViewInvoices(c)}
          className="focus:outline-none"
          title={t('customers:viewInvoices')}
        >
          <Badge className="bg-primary-50 text-primary-700 border border-primary-100 cursor-pointer hover:bg-primary-100">
            {c.invoices.length}
          </Badge>
        </button>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      rows={customers}
      rowKey={(c) => c.id}
      onSort={(key) => onSort(key as SortField)}
      sortActive={sortBy}
      sortOrder={sortOrder}
      emptyState={
        <EmptyState
          title={t('customers:empty')}
          description={t('customers:emptyDescription')}
        />
      }
      actionsLabel={t('common:actions')}
      actions={(c) => (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(c)}
            className="min-h-11"
          >
            {t('common:view')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(c)}
            className="text-primary-600 min-h-11"
          >
            {t('common:edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(c)}
            className="text-danger-600 min-h-11"
          >
            {t('common:delete')}
          </Button>
        </>
      )}
    />
  );
}
