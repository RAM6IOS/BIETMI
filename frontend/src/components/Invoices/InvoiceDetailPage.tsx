import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getInvoice, deleteInvoice, issueInvoice } from '../../api/invoices';
import type { Invoice } from '../../api/invoices';
import { translateApiError } from '../../api/errors';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { InvoiceStatusBadge } from './InvoiceBadges';
import { invoiceDocumentTitle } from './invoice-labels';
import { InvoiceDocument } from './InvoiceDocument';
import { useAuthRole } from '../../hooks/useAuthRole';
import { useCompany } from '../../hooks/useCompany';
import { canWriteInvoices } from './invoice-permissions';
import { ConfirmDialog } from './ConfirmDialog';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useAuthRole();
  const canWrite = canWriteInvoices(role);
  const { company } = useCompany();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setInvoice(await getInvoice(id));
    } catch (err) {
      setError(translateApiError(err) || t('invoices:loadFailedOne'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleIssue = async () => {
    if (!id || !invoice) return;
    setIsIssuing(true);
    try {
      setInvoice(await issueInvoice(id));
    } catch (err) {
      setDeleteError(translateApiError(err) || t('invoices:issueFailed'));
    } finally {
      setIsIssuing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteInvoice(id);
      navigate('/invoices');
    } catch (err) {
      setDeleteError(translateApiError(err) || t('invoices:deleteFailed'));
      setShowDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500" aria-busy="true">
        <Spinner />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <EmptyState
        title={t('invoices:loadErrorTitle')}
        description={error || t('invoices:notFound')}
      >
        <Link to="/invoices">
          <Button>{t('invoices:backToInvoices')}</Button>
        </Link>
      </EmptyState>
    );
  }

  const isEditable = invoice.status === 'draft';

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="no-print mb-4">
        <Link
          to="/invoices"
          className="text-sm text-primary-600 hover:text-primary-800"
        >
          → {t('invoices:backToInvoices')}
        </Link>
      </div>

      <div className="no-print flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-semibold text-gray-900">
              {invoiceDocumentTitle(invoice)}
            </h2>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isEditable && canWrite && (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
              >
                {t('common:edit')}
              </Button>
              <Button variant="danger" onClick={() => setShowDelete(true)}>
                {t('common:delete')}
              </Button>
            </>
          )}
          {isEditable && canWrite && (
            <Button onClick={handleIssue} disabled={isIssuing}>
              {isIssuing ? t('invoices:issuing') : t('invoices:issueButton')}
            </Button>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            {t('common:printSavePdf')}
          </Button>
        </div>
      </div>

      {deleteError && (
        <div
          className="no-print mt-4 text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
          role="alert"
        >
          {deleteError}
        </div>
      )}

      <Card className="p-4 sm:p-8 print-area">
        <InvoiceDocument invoice={invoice} company={company} />
      </Card>

      {showDelete && (
        <ConfirmDialog
          title={t('invoices:deleteTitle')}
          description={t('invoices:deleteConfirmDoc')}
          confirmLabel={isDeleting ? t('common:deleting') : t('common:delete')}
          variant="danger"
          isWorking={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}