import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Supplier } from '../../api/suppliers';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ConfirmDialogProps {
  supplier: Supplier;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  supplier,
  isDeleting,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      title={t('suppliers:deleteTitle')}
      onClose={onCancel}
      size="md"
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button variant="secondary" ref={cancelRef} onClick={onCancel} disabled={isDeleting}>
            {t('common:cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? t('common:deleting') : t('common:delete')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600">
        {t('suppliers:deleteConfirm', { name: supplier.name })}
      </p>
    </Modal>
  );
}
