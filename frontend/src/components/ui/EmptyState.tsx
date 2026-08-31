import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  title,
  description,
  className = '',
  children,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={['text-center py-14 text-gray-500', className].join(' ')}
    >
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-sm">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
