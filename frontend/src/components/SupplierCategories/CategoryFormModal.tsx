import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  SupplierCategory,
  SupplierCategoryInput,
} from '../../api/supplierCategories';
import { translateApiError } from '../../api/errors';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface CategoryFormModalProps {
  category?: SupplierCategory | null;
  onClose: () => void;
  onSubmit: (input: SupplierCategoryInput) => Promise<void>;
}

export function CategoryFormModal({
  category,
  onClose,
  onSubmit,
}: CategoryFormModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(category?.name ?? '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim() === '') {
      setError(t('supplierCategories:nameRequired'));
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim() });
      onClose();
    } catch (err) {
      setError(translateApiError(err) || t('common:errors.saveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = category
    ? t('supplierCategories:editTitle')
    : t('supplierCategories:new');

  return (
    <Modal
      title={title}
      onClose={onClose}
      size="md"
      initialFocusRef={nameRef}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common:cancel')}
          </Button>
          <Button
            type="submit"
            form="category-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? t('common:saving') : t('common:save')}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="category-name"
              className="block text-sm font-medium text-gray-700"
            >
              {t('supplierCategories:name')}{' '}
              <span className="text-danger-600">*</span>
            </label>
            <Input
              id="category-name"
              ref={nameRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          {error && (
            <div
              className="text-danger-600 text-sm bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}