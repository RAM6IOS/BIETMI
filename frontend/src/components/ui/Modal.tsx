import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type ModalSize = 'md' | 'lg';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: ModalSize;
  footer?: ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const MAXW: Record<ModalSize, string> = {
  md: 'lg:max-w-md',
  lg: 'lg:max-w-2xl',
};

/**
 * Responsive Modal:
 * - On lg (>=1024px) it renders as a fixed-width centered dialog (max-w-md/lg).
 * - On smaller screens it becomes full-screen (no padding, fills viewport).
 */
export function Modal({
  title,
  onClose,
  children,
  size = 'lg',
  footer,
  initialFocusRef,
}: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    (initialFocusRef?.current ?? closeRef.current)?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, initialFocusRef]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center lg:items-center lg:p-4 lg:overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-50"
        onClick={onClose}
      />
      <div
        className={[
          'relative bg-white w-full flex flex-col',
          // full-screen below lg, centered fixed-width card on lg+
          'rounded-none lg:rounded-xl lg:shadow-xl',
          MAXW[size],
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border lg:px-6 lg:py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 -m-2"
            aria-label={t('common:close')}
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-5 flex-1 overflow-y-auto lg:px-6">{children}</div>

        {footer && (
          <div className="flex justify-end gap-3 px-4 py-4 border-t border-border bg-surface-2 lg:px-6">
            {footer}
          </div>        )}
      </div>
    </div>
  );
}
