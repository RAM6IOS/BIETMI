import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className = '', ...rest }, ref) {
    return (
      <textarea
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