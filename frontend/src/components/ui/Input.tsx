import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  endAdornment?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className = '', endAdornment, ...rest }, ref) {
    const input = (
      <input
        ref={ref}
        className={[
          'block w-full rounded-md border border-border bg-white text-gray-900',
          'shadow-sm placeholder:text-gray-400',
          'focus:border-primary-500 focus:outline-none focus:ring-primary-500',
          'text-sm p-2.5',
          endAdornment ? 'pe-11' : '',
          className,
        ].join(' ')}
        {...rest}
      />
    );

    if (!endAdornment) {
      return input;
    }

    return (
      <div className="relative">
        {input}
        <div className="absolute inset-y-0 end-0 flex items-center">
          {endAdornment}
        </div>
      </div>
    );
  },
);
