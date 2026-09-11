import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  id?: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  extra?: ReactNode;
}

export function MultiSelect({
  id,
  options,
  selected,
  onChange,
  placeholder = '',
  className = '',
  extra,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const t = useTranslation().t;
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const remove = (value: string) => {
    onChange(selected.filter((v) => v !== value));
  };

  const selectedOptions = options.filter((o) => selected.includes(o.value));

  return (
    <div className={className}>
      {selectedOptions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700"
            >
              {opt.label}
              <button
                type="button"
                onClick={() => remove(opt.value)}
                aria-label={t('supplierCategories:removeSelected', { name: opt.label })}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary-100 text-primary-700 hover:bg-primary-200"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={[
          'w-full rounded-md border border-border bg-white text-start text-sm p-2.5',
          'shadow-sm hover:bg-surface-2',
          'focus:border-primary-500 focus:outline-none focus:ring-primary-500',
          open ? 'border-primary-500' : '',
        ].join(' ')}
      >
        {selectedOptions.length > 0
          ? t('supplierCategories:selectedCount', { count: selectedOptions.length })
          : placeholder}
      </button>

      {open && (
        <div className="mt-1.5 border border-border rounded-md bg-surface-1 text-sm">
          {options.length === 0 ? (
            <p className="px-3 py-3 text-text-secondary">
              {t('supplierCategories:noCategories')}
            </p>
          ) : (
            <ul className="max-h-52 overflow-y-auto py-1">
              {options.map((opt) => {
                const checked = selected.includes(opt.value);
                return (
                  <li key={opt.value}>
                    <label
                      htmlFor={id ? `${id}-${opt.value}` : `ms-${opt.value}`}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-surface-2 cursor-pointer"
                    >
                      <input
                        id={id ? `${id}-${opt.value}` : `ms-${opt.value}`}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(opt.value)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-gray-900">{opt.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {extra}
        </div>
      )}
    </div>
  );
}