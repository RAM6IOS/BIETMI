import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sortable?: boolean;
  onSort?: (key: string) => void;
  sortActive?: string;
  sortOrder?: 'asc' | 'desc';
  emptyState?: ReactNode;
  actions?: (row: T) => ReactNode;
  actionsLabel?: string;
}

/**
 * Responsive Table:
 * - On md (>=768px) renders a normal table.
 * - Below md it renders each row as a stacked card instead of horizontal scroll.
 */
export function Table<T>({
  columns,
  rows,
  rowKey,
  onSort,
  sortActive,
  sortOrder,
  emptyState,
  actions,
  actionsLabel,
}: TableProps<T>) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  const sortIndicator = (key: string) => {
    if (!onSort) return null;
    const active = key === sortActive;
    const glyph = active ? (sortOrder === 'asc' ? '↑' : '↓') : '↕';
    return <span aria-hidden="true">{glyph}</span>;
  };

  return (
    <>
      {/* Desktop / tablet table (md and up) */}
      <table className="hidden md:table min-w-full divide-y divide-border">
        <thead className="bg-surface-2">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="px-6 py-3 text-end text-xs font-medium text-text-secondary uppercase tracking-wider"
              >
                {col.sortable && onSort ? (
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className="inline-flex items-center gap-1 uppercase tracking-wider font-medium text-xs text-text-secondary hover:text-gray-800"
                  >
                    {col.header}
                    {sortIndicator(col.key)}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
            {actions && (
              <th
                scope="col"
                className="px-6 py-3 text-start text-xs font-medium text-text-secondary uppercase tracking-wider"
              >
                {actionsLabel ?? t('common:actions')}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-border">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${col.className ?? ''}`}
                >
                  {col.render(row)}
                </td>
              ))}
              {actions && (
                <td className="px-6 py-4 whitespace-nowrap text-start text-sm font-medium">
                  {actions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Stacked cards (below md) */}
      <div className="md:hidden divide-y divide-border">
        {rows.map((row) => (
          <div key={rowKey(row)} className="p-4 space-y-2">
            {columns.map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-3">
                <span className="text-xs text-text-secondary">{col.header}</span>
                <span className="text-sm text-gray-900 text-end">{col.render(row)}</span>
              </div>
            ))}
            {actions && (
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                {actions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
