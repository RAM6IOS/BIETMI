import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className = '', ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={[
          'block w-full rounded-md border border-border bg-white text-gray-900',
          'shadow-sm placeholder:text-gray-400',
          'focus:border-primary-500 focus:outline-none focus:ring-primary-500',
          'text-sm p-2.5',
          className,
        ].join(' ')}
        {...rest}
      />
    );
  },
);
