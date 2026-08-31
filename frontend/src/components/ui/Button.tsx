import { forwardRef } from 'react';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500 border border-transparent',
  secondary:
    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-300',
  danger:
    'text-danger-600 bg-white border border-danger-100 hover:bg-danger-50 focus-visible:ring-danger-600',
  ghost:
    'text-gray-700 bg-transparent border border-transparent hover:bg-gray-100 focus-visible:ring-gray-300',
};

const SIZES: Record<Size, string> = {
  // min-h-11 = 44px touch target; retained on all breakpoints to prevent tap errors
  sm: 'min-h-11 px-3 py-2 text-sm',
  md: 'min-h-11 px-4 py-2 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      block = false,
      className = '',
      type = 'button',
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={[
          'inline-flex items-center justify-center gap-1.5 rounded-md font-medium',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          VARIANTS[variant],
          SIZES[size],
          block ? 'w-full' : '',
          className,
        ].join(' ')}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
