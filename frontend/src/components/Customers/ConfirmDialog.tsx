import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Customer } from '../../api/customers';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ConfirmDialogProps {
  customer: Customer;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  customer,
  isDeleting,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      title={t('customers:deleteTitle')}
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
        {t('customers:deleteConfirm', { name: customer.name })}
      </p>
    </Modal>
  );
}
