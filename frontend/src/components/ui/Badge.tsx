import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full',
        'bg-surface-2 text-text-secondary text-xs',
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
