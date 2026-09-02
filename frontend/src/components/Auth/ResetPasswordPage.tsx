import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '../../api/auth';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [succeeded, setSucceeded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Guard: if no token in the URL, show an error immediately.
  const missingToken = !token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      await resetPassword(token, newPassword);
      setSucceeded(true);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? '';
      // Map known backend error codes / messages to a friendly string.
      if (
        msg.includes('EXPIRED') ||
        msg.includes('USED') ||
        msg.includes('INVALID') ||
        msg.includes('غير صالح')
      ) {
        setError(t('auth:invalidOrExpiredToken'));
      } else {
        setError(t('auth:invalidOrExpiredToken'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-2 px-4">
      <Card className="max-w-md w-full p-6 sm:p-8">
        {/* Lock icon */}
        <div className="flex justify-center mb-2">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
        </div>

        <h1 className="text-center text-2xl font-bold text-gray-900">
          {t('auth:resetPasswordTitle')}
        </h1>
        <p className="mt-2 text-center text-sm text-text-secondary">
          {t('auth:resetPasswordSubtitle')}
        </p>

        {/* ── Missing / invalid token in URL ── */}
        {missingToken && (
          <div className="mt-8 space-y-6">
            <div
              className="rounded-md bg-danger-50 border border-danger-100 px-4 py-4 text-sm text-danger-600 text-center"
              role="alert"
              data-testid="reset-missing-token"
            >
              {t('auth:invalidOrExpiredToken')}
            </div>
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
              >
                {t('auth:forgotPassword')}
              </Link>
            </div>
          </div>
        )}

        {/* ── Success state ── */}
        {!missingToken && succeeded && (
          <div className="mt-8 space-y-6">
            <div
              className="rounded-md bg-success-50 border border-success-100 px-4 py-4 text-sm text-success-700 text-center"
              role="status"
              data-testid="reset-success"
            >
              {t('auth:passwordResetSuccess')}
            </div>
            <div className="text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
              >
                ← {t('auth:backToLogin')}
              </Link>
            </div>
          </div>
        )}

        {/* ── Form state ── */}
        {!missingToken && !succeeded && (
          <form
            className="mt-8 space-y-4"
            onSubmit={handleSubmit}
            noValidate
          >
            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-gray-900"
              >
                {t('auth:newPassword')}
              </label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-new-password"
                className="block text-sm font-medium text-gray-900"
              >
                {t('auth:confirmPassword')}
              </label>
              <Input
                id="confirm-new-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
              />
            </div>

            {error && (
              <div
                className="text-danger-600 text-sm text-center bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
                role="alert"
                data-testid="reset-error"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              block
              disabled={isLoading}
              id="reset-password-submit"
            >
              {isLoading
                ? t('auth:settingPassword')
                : t('auth:setNewPassword')}
            </Button>

            <div className="text-center">
              <Link
                to="/"
                className="text-sm text-text-secondary hover:text-gray-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
              >
                ← {t('auth:backToLogin')}
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
