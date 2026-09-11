import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { SupplierCategory } from '../../api/supplierCategories';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ConfirmDeleteDialogProps {
  category: SupplierCategory;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteDialog({
  category,
  isDeleting,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      title={t('supplierCategories:confirmDelete')}
      onClose={onCancel}
      size="md"
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button
            variant="secondary"
            ref={cancelRef}
            onClick={onCancel}
            disabled={isDeleting}
          >
            {t('common:cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? t('common:deleting') : t('common:delete')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">
        {t('supplierCategories:deleteConfirmation', {
          name: category.name,
        })}
      </p>
    </Modal>
  );
}