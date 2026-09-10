import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface ComboboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'list'> {
  options: string[];
  className?: string;
}

export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(
  function Combobox({ options, className = '', id, ...rest }, ref) {
    const listId = id ? `${id}-options` : undefined;
    return (
      <>
        <input
          ref={ref}
          id={id}
          list={listId}
          className={[
            'block w-full rounded-md border border-border bg-white text-gray-900',
            'shadow-sm placeholder:text-gray-400',
            'focus:border-primary-500 focus:outline-none focus:ring-primary-500',
            'text-sm p-2.5',
            className,
          ].join(' ')}
          {...rest}
        />
        {listId && (
          <datalist id={listId}>
            {options.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        )}
      </>
    );
  },
);