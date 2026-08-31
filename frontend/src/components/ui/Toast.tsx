import type { ReactNode } from 'react';

interface ToastProps {
  children: ReactNode;
  className?: string;
}

export function Toast({ children, className = '' }: ToastProps) {
  return (
    <div
      role="status"
      className={[
        'flex w-full items-center gap-2 rounded-md px-4 py-3 text-sm',
        'bg-success-50 text-success-700 border border-success-100',
        className,
      ].join(' ')}
    >
      <span aria-hidden="true">✓</span>
      <span>{children}</span>
    </div>
  );
}
