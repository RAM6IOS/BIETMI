import { useTranslation } from 'react-i18next';

export function Spinner() {
  const { t } = useTranslation();
  return (
    <div
      className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary-600"
      role="status"
      aria-label={t('common:loading')}
    />
  );
}
