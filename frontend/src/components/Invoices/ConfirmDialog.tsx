import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'primary' | 'danger';
  isWorking?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  variant = 'primary',
  isWorking = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="md"
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button
            variant="secondary"
            ref={cancelRef}
            onClick={onCancel}
            disabled={isWorking}
          >
            {t('common:cancel')}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={isWorking}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{description}</p>
    </Modal>
  );
}