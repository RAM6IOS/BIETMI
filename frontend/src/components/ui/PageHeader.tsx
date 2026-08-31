import type { ReactNode } from 'react';
import { Button } from './Button';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionIcon?: ReactNode;
}

/**
 * Responsive PageHeader:
 * - On lg (>=1024px): horizontal — title at the start, action button at the end (follows `dir`).
 * - Below lg: vertical — title on top, full-width action button below.
 */
export function PageHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  actionDisabled,
  actionIcon,
}: PageHeaderProps) {
  const action = actionLabel ? (
    <Button
      onClick={onAction}
      disabled={actionDisabled}
      className="lg:w-auto w-full"
    >
      {actionIcon ?? <span aria-hidden="true">+</span>}
      {actionLabel}
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
