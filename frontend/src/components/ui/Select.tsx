import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export function Select({ className = '', ...rest }: SelectProps) {
  return (
    <select
      className={[
        'block w-full rounded-md border border-border bg-white text-gray-900',
        'shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500',
        'text-sm p-2.5',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}
