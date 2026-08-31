import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from '../../api/users';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ConfirmDeleteDialogProps {
  user: User;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteDialog({
  user,
  isDeleting,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      title={t('users:confirmDelete')}
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
            {t('users:cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? t('common:deleting') : t('common:delete')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">
        {t('users:deleteConfirmation', { name: user.fullName })}
      </p>
    </Modal>
  );
}
