import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={[
        'bg-white border border-border rounded-xl shadow-card',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
