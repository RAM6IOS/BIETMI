import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeMyPassword } from '../../api/users';
import { translateApiError } from '../../api/errors';
import { Card } from '../ui/Card';
import { PasswordInput } from '../ui/PasswordInput';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';

export function ChangePasswordPage() {
  const { t } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('auth:passwordsRequired'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('auth:passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth:passwordMismatch'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await changeMyPassword({
        currentPassword,
        newPassword,
      });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      void res;
    } catch (err) {
      setError(translateApiError(err) || t('common:errors.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="max-w-md mx-auto p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('auth:changePasswordTitle')}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {t('auth:changePasswordSubtitle')}
        </p>

        {success && (
          <div className="mt-4">
            <Toast>{t('auth:passwordChanged')}</Toast>
          </div>
        )}

        {error && (
          <div
            className="mt-4 text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
            role="alert"
          >
            {error}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-900">
              {t('auth:currentPassword')}
            </label>
            <PasswordInput
              id="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-900">
              {t('auth:newPassword')}
            </label>
            <PasswordInput
              id="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-900">
              {t('auth:confirmPassword')}
            </label>
            <PasswordInput
              id="confirm-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1"
            />
          </div>

          <Button type="submit" block disabled={isLoading}>
            {isLoading ? t('auth:changingPassword') : t('auth:changePassword')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
