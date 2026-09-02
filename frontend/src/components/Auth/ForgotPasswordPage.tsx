import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { forgotPassword } from '../../api/auth';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic email format check on the client.
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('auth:emailInvalidFormat'));
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(email.trim());
      // Always show the generic success message — never reveal whether the
      // email exists in the system (mirrors the backend anti-enumeration).
      setSubmitted(true);
    } catch {
      // Even on network errors show the generic success message so that
      // attackers cannot distinguish error from success.
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-2 px-4">
      <Card className="max-w-md w-full p-6 sm:p-8">
        {/* Logo / brand mark */}
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
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </span>
        </div>

        <h1 className="text-center text-2xl font-bold text-gray-900">
          {t('auth:forgotPasswordTitle')}
        </h1>
        <p className="mt-2 text-center text-sm text-text-secondary">
          {t('auth:forgotPasswordSubtitle')}
        </p>

        {submitted ? (
          /* ── Success state ── */
          <div className="mt-8 space-y-6">
            <div
              className="rounded-md bg-success-50 border border-success-100 px-4 py-4 text-sm text-success-700 text-center"
              role="status"
              data-testid="forgot-password-success"
            >
              {t('auth:forgotPasswordSuccess')}
            </div>
            <div className="text-center">
              <Link
                to="/"
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
              >
                ← {t('auth:backToLogin')}
              </Link>
            </div>
          </div>
        ) : (
          /* ── Form state ── */
          <form
            className="mt-8 space-y-4"
            onSubmit={handleSubmit}
            noValidate
          >
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-sm font-medium text-gray-900"
              >
                {t('auth:email')}
              </label>
              <Input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            {error && (
              <div
                className="text-danger-600 text-sm text-center bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
                role="alert"
                data-testid="forgot-password-error"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              block
              disabled={isLoading}
              id="forgot-password-submit"
            >
              {isLoading
                ? t('auth:sendingResetLink')
                : t('auth:sendResetLink')}
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
