import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LANGS, setLanguage } from '../../locales';

interface SidebarLinkProps {
  to: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}

function SidebarLink({ to, children, onNavigate }: SidebarLinkProps) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="block rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    >
      {children}
    </Link>
  );
}

interface SidebarProps {
  canPurchase: boolean;
  canInvoices: boolean;
  canQuotes: boolean;
  isAdmin: boolean;
  logout: () => void;
  onNavigate?: () => void;
}

export function Sidebar({
  canPurchase,
  canInvoices,
  canQuotes,
  isAdmin,
  logout,
  onNavigate,
}: SidebarProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === 'fr' ? 'fr' : 'ar';

  return (
    <div className="flex h-full flex-col justify-between py-6">
      <div>
        <Link
          to="/"
          onClick={onNavigate}
          className="mb-8 block px-3 text-xl font-semibold"
        >
          BIETMI ERP
        </Link>
        <nav aria-label={t('layout:navLabel')} className="flex flex-col gap-1">
          <SidebarLink to="/" onNavigate={onNavigate}>{t('layout:customers')}</SidebarLink>
          <SidebarLink to="/suppliers" onNavigate={onNavigate}>{t('layout:suppliers')}</SidebarLink>
          {canInvoices && (
            <>
              <SidebarLink to="/invoices" onNavigate={onNavigate}>{t('layout:invoices')}</SidebarLink>
              <SidebarLink to="/invoices/reports/outstanding" onNavigate={onNavigate}>
                {t('layout:outstandingInvoices')}
              </SidebarLink>
            </>
          )}
          {canQuotes && (
            <SidebarLink to="/quotes" onNavigate={onNavigate}>{t('layout:quotes')}</SidebarLink>
          )}
          {canPurchase && (
            <SidebarLink to="/purchase-orders" onNavigate={onNavigate}>{t('layout:purchaseOrders')}</SidebarLink>
          )}
          {isAdmin && (
            <>
              <SidebarLink to="/users" onNavigate={onNavigate}>{t('layout:users')}</SidebarLink>
              <SidebarLink to="/settings/supplier-categories" onNavigate={onNavigate}>{t('layout:supplierCategories')}</SidebarLink>
              <SidebarLink to="/settings/company" onNavigate={onNavigate}>{t('layout:companySettings')}</SidebarLink>
            </>
          )}
        </nav>
      </div>
      <div className="px-3 flex flex-col gap-3">
        <SidebarLink to="/change-password" onNavigate={onNavigate}>{t('layout:changePassword')}</SidebarLink>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">{t('layout:language')}:</span>
          {LANGS.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              aria-pressed={currentLang === lang}
              aria-label={lang === 'fr' ? t('layout:switchToFrench') : t('layout:switchToArabic')}
              className={`min-h-8 rounded-md px-2 py-1 text-xs font-medium ${
                currentLang === lang
                  ? 'bg-primary-600 text-on-accent'
                  : 'bg-surface-2 text-text-secondary hover:bg-border'
              }`}
            >
              {lang === 'fr' ? 'FR' : 'AR'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={logout}
          className="min-h-11 w-full rounded-md bg-white border border-danger-100 px-4 py-2 text-sm font-medium text-danger-600 hover:bg-danger-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger-600 focus-visible:ring-offset-1"
        >
          {t('layout:logout')}
        </button>
      </div>
    </div>
  );
}
