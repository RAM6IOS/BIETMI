import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resetUserPassword } from '../../api/users';
import type { User } from '../../api/users';
import { translateApiError } from '../../api/errors';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { Spinner } from '../ui/Spinner';

interface ResetPasswordModalProps {
  user: User;
  onClose: () => void;
}

export function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const { t } = useTranslation();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const performReset = async () => {
    setError('');
    setIsResetting(true);
    try {
      const result = await resetUserPassword(user.id);
      setTempPassword(result.tempPassword);
      setCopied(false);
    } catch (err) {
      setError(translateApiError(err) || t('common:errors.default'));
    } finally {
      setIsLoading(false);
      setIsResetting(false);
    }
  };

  useEffect(() => {
    void performReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyGenerated = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      title={t('users:resetPasswordTitle')}
      onClose={onClose}
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('users:close')}
        </Button>
      }
    >
      {isLoading ? (
        <div className="py-10 text-center">
          <Spinner />
        </div>
      ) : error ? (
        <div>
          <div
            className="mb-4 text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
            role="alert"
          >
            {error}
          </div>
          <div className="flex justify-end">
            <Button onClick={performReset} disabled={isResetting}>
              {isResetting ? t('common:saving') : t('users:retry')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Toast>{t('users:tempPasswordGenerated')}</Toast>
          <div className="rounded-md border border-border bg-surface-2 p-3">
            <p className="text-sm text-text-secondary">
              {t('users:resetPasswordCopyNote')}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 break-all rounded border border-border bg-white px-2 py-1 text-sm font-mono">
                {tempPassword}
              </code>
              <Button variant="secondary" size="sm" onClick={copyGenerated}>
                {copied ? t('users:copied') : t('users:copy')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
