import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { LoginForm } from './components/LoginForm';
import { Sidebar } from './components/layout/Sidebar';
import { CustomersPage } from './components/Customers/CustomersPage';
import { CustomerDetailPage } from './components/Customers/CustomerDetailPage';
import { SuppliersPage } from './components/Suppliers/SuppliersPage';
import { SupplierDetailPage } from './components/Suppliers/SupplierDetailPage';
import { InvoicesPage } from './components/Invoices/InvoicesPage';
import { InvoiceFormPage } from './components/Invoices/InvoiceFormPage';
import { InvoiceDetailPage } from './components/Invoices/InvoiceDetailPage';
import { OverdueReportPage } from './components/Invoices/OverdueReportPage';
import { QuotesPage } from './components/Quotes/QuotesPage';
import { QuoteFormPage } from './components/Quotes/QuoteFormPage';
import { QuoteDetailPage } from './components/Quotes/QuoteDetailPage';
import { PurchaseOrdersPage } from './components/PurchaseOrders/PurchaseOrdersPage';
import { PurchaseOrderFormPage } from './components/PurchaseOrders/PurchaseOrderFormPage';
import { PurchaseOrderDetailPage } from './components/PurchaseOrders/PurchaseOrderDetailPage';
import { CompanySettingsPage } from './components/Settings/CompanySettingsPage';
import { UsersPage } from './components/Users/UsersPage';
import { ChangePasswordPage } from './components/Auth/ChangePasswordPage';
import { ForgotPasswordPage } from './components/Auth/ForgotPasswordPage';
import { ResetPasswordPage } from './components/Auth/ResetPasswordPage';
import { useAuthRole } from './hooks/useAuthRole';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function DashboardLayout() {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const role = useAuthRole();
  const canPurchase = role === 'admin' || role === 'purchasing';
  const canInvoices = role === 'admin' || role === 'commercial' || role === 'accountant';
  const canQuotes = role === 'admin' || role === 'commercial';
  const isAdmin = role === 'admin';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  const handleLogout = () => {
    setSidebarOpen(false);
    logout();
  };

  return (
    <div className="min-h-screen bg-surface-2">
      <div className="flex">
        <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 border-e border-border bg-surface-1 md:block">
          <Sidebar canPurchase={canPurchase} canInvoices={canInvoices} canQuotes={canQuotes} isAdmin={isAdmin} logout={handleLogout} />
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              aria-label={t('layout:closeMenu')}
              className="absolute inset-0 h-full w-full bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('layout:navLabel')}
              className="absolute inset-y-0 start-0 w-64 bg-surface-1 shadow-lg"
            >
<Sidebar
                canPurchase={canPurchase}
                canInvoices={canInvoices}
                canQuotes={canQuotes}
                isAdmin={isAdmin}
                logout={handleLogout}
                onNavigate={() => setSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        <div className="flex min-h-screen flex-1 flex-col md:ps-64">
          <header className="flex h-16 items-center justify-between border-b border-border bg-surface-1 px-4 md:hidden">
            <Link to="/" className="text-lg font-semibold">
              BIETMI ERP
            </Link>
            <button
              type="button"
              aria-label={t('layout:openMenu')}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
              className="min-h-11 inline-flex items-center justify-center rounded-md px-3 text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </header>
          <main className="mx-auto w-full max-w-7xl py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/invoices/reports/outstanding" element={<OverdueReportPage />} />
              <Route path="/invoices/new" element={<InvoiceFormPage />} />
              <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />
              <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="/quotes" element={<QuotesPage />} />
              <Route path="/quotes/new" element={<QuoteFormPage />} />
              <Route path="/quotes/:id/edit" element={<QuoteFormPage />} />
              <Route path="/quotes/:id" element={<QuoteDetailPage />} />
              <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="/purchase-orders/new" element={<PurchaseOrderFormPage />} />
              <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings/company" element={<CompanySettingsPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<LoginForm />} />
      </Routes>
    );
  }

  return <DashboardLayout />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
