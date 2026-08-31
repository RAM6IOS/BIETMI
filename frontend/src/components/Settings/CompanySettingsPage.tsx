import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { updateCompany } from '../../api/company';
import type { CompanyUpdateInput } from '../../api/company';
import { translateApiError } from '../../api/errors';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import { Toast } from '../ui/Toast';
import { useCompany } from '../../hooks/useCompany';

type FieldKey = keyof CompanyUpdateInput;

const FIELD_KEYS: Record<FieldKey, { label: string; hint?: string }> = {
  name: { label: 'settings:companyName' },
  logoUrl: { label: 'settings:logoUrl', hint: 'settings:logoUrlHint' },
  siegeSocial: { label: 'settings:siegeSocial' },
  ville: { label: 'settings:city', hint: 'settings:cityHint' },
  mobile: { label: 'settings:mobile' },
  telFax: { label: 'settings:telFax' },
  rc: { label: 'settings:rc' },
  nif: { label: 'settings:nif' },
  ain: { label: 'settings:ain' },
  banqueBaraka: { label: 'settings:banqueBaraka' },
};

const FIELD_ORDER: FieldKey[] = [
  'name',
  'logoUrl',
  'siegeSocial',
  'ville',
  'mobile',
  'telFax',
  'rc',
  'nif',
  'ain',
  'banqueBaraka',
];

export function CompanySettingsPage() {
  const { t } = useTranslation();
  const { company, loading, refresh } = useCompany();

  const [form, setForm] = useState<CompanyUpdateInput>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!company) return;
    // oxlint-disable-next-line react/set-state-in-effect
    setForm({
      name: company.name ?? '',
      logoUrl: company.logoUrl ?? '',
      siegeSocial: company.siegeSocial ?? '',
      ville: company.ville ?? '',
      mobile: company.mobile ?? '',
      telFax: company.telFax ?? '',
      rc: company.rc ?? '',
      nif: company.nif ?? '',
      ain: company.ain ?? '',
      banqueBaraka: company.banqueBaraka ?? '',
    });
  }, [company]);

  const set = (key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      setSaveError(t('settings:nameRequired'));
      return;
    }
    setSaveError('');
    setSuccess(false);
    setIsSaving(true);
    try {
      const cleaned: CompanyUpdateInput = {};
      for (const entry of Object.entries(form) as [
        FieldKey,
        string | null | undefined,
      ][]) {
        const [key, raw] = entry;
        const trimmed = typeof raw === 'string' ? raw.trim() : '';
        if (trimmed) cleaned[key] = trimmed;
      }
      await updateCompany(cleaned);
      refresh();
      setSuccess(true);
    } catch (err) {
      setSaveError(translateApiError(err) || t('settings:saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !company) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8 text-center py-16 text-gray-500">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="p-4 sm:p-6">
        <PageHeader
          title={t('settings:title')}
          subtitle={t('settings:subtitle')}
        />

        <div className="mt-4">
          <Link
            to="/purchase-orders"
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            {t('settings:backToOrders')}
          </Link>
        </div>

        {success && (
          <div className="mt-4">
            <Toast>{t('settings:savedSuccess')}</Toast>
          </div>
        )}

        {saveError && (
          <div
            className="mt-4 text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
            role="alert"
          >
            {saveError}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELD_ORDER.map((key) => {
            const field = FIELD_KEYS[key];
            return (
              <div key={key}>
                <label
                  htmlFor={`company-field-${key}`}
                  className="block text-sm font-medium text-gray-900"
                >
                  {t(field.label)}
                </label>
                <Input
                  id={`company-field-${key}`}
                  type="text"
                  value={(form[key] as string | undefined) ?? ''}
                  onChange={(e) => set(key, e.target.value)}
                  className="mt-1"
                />
                {field.hint && (
                  <p className="mt-1 text-xs text-text-secondary">
                    {t(field.hint)}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
          <Button variant="secondary" onClick={() => window.history.back()}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('settings:saving') : t('settings:saveChanges')}
          </Button>
        </div>
      </Card>
    </div>
  );
}