import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/useAuth';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { API_BASE } from '../api/config';

export function LoginForm() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data?.errorCode === 'AUTH_INVALID_CREDENTIALS') {
          setError(t('auth:invalidCredentials'));
        } else {
          setError(t('auth:invalidCredentials'));
        }
        return;
      }

      login(data.access_token);
    } catch {
      setError(t('auth:serverError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-2">
      <Card className="max-w-md w-full p-6 sm:p-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          {t('auth:loginTitle')}
        </h2>
        <p className="mt-2 text-center text-sm text-text-secondary">
          {t('auth:systemName')}
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="sr-only">
              {t('auth:username')}
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              placeholder={t('auth:username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              {t('auth:password')}
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder={t('auth:password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div
              className="text-danger-600 text-sm text-center bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
              role="alert"
              data-testid="login-error"
            >
              {error}
            </div>
          )}

          <Button type="submit" block disabled={isLoading}>
            {isLoading ? t('auth:loggingIn') : t('auth:login')}
          </Button>

          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
            >
              {t('auth:forgotPassword')}
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
