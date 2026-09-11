import { useTranslation } from 'react-i18next';
import type { Supplier, PartnerCurrency } from '../../api/suppliers';
import { Table } from '../ui/Table';
import type { TableColumn } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

export type SortField = 'name' | 'createdAt' | 'nif';
export type SortOrder = 'asc' | 'desc';

interface SupplierTableProps {
  suppliers: Supplier[];
  sortBy: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}

function getPrimaryPhone(supplier: Supplier): string {
  const primary = supplier.contacts?.find((c) => c.isPrimary);
  const first = supplier.contacts?.[0];
  return primary?.phone ?? first?.phone ?? '—';
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('ar-DZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function CurrencyBadge({ currency }: { currency: PartnerCurrency }) {
  const { t } = useTranslation();
  const isDzd = currency === 'DZD';
  return (
    <Badge
      className={
        isDzd
          ? 'bg-success-50 text-success-700'
          : 'bg-warning-50 text-warning-700'
      }
    >
      {isDzd ? 'DZD' : t('suppliers:foreignCurrency')}
    </Badge>
  );
}

export function SupplierTable({
  suppliers,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onEdit,
  onDelete,
}: SupplierTableProps) {
  const { t } = useTranslation();
  const columns: TableColumn<Supplier>[] = [
    {
      key: 'name',
      header: t('suppliers:name'),
      sortable: true,
      render: (s) => <span className="font-medium text-gray-900">{s.name}</span>,
    },
    {
      key: 'currency',
      header: t('suppliers:currency'),
      render: (s) => <CurrencyBadge currency={s.currency} />,
    },
    {
      key: 'paymentTerms',
      header: t('suppliers:paymentTerms'),
      render: (s) => (
        <span className="text-gray-500">{s.paymentTerms ?? '—'}</span>
      ),
    },
    {
      key: 'categories',
      header: t('supplierCategories:categories'),
      render: (s) =>
        s.categories && s.categories.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {s.categories.map((c) => (
              <Badge key={c.id} className="bg-primary-50 text-primary-700">
                {c.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'phone',
      header: t('suppliers:phone'),
      render: (s) => <span className="text-gray-500">{getPrimaryPhone(s)}</span>,
    },
    {
      key: 'nif',
      header: t('suppliers:nif'),
      render: (s) => <span className="text-gray-500">{s.nif ?? '—'}</span>,
    },
    {
      key: 'createdAt',
      header: t('suppliers:createdAt'),
      sortable: true,
      render: (s) => (
        <span className="text-gray-500">{formatDate(s.createdAt)}</span>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      rows={suppliers}
      rowKey={(s) => s.id}
      onSort={(key) => onSort(key as SortField)}
      sortActive={sortBy}
      sortOrder={sortOrder}
      emptyState={
        <EmptyState
          title={t('suppliers:empty')}
          description={t('suppliers:emptyDescription')}
        />
      }
      actionsLabel={t('common:actions')}
      actions={(s) => (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(s)}
            className="min-h-11"
          >
            {t('common:view')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(s)}
            className="text-primary-600 min-h-11"
          >
            {t('common:edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(s)}
            className="text-danger-600 min-h-11"
          >
            {t('common:delete')}
          </Button>
        </>
      )}
    />
  );
}
