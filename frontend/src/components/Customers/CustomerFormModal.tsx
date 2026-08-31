import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { translateApiError } from '../../api/errors';
import type { Contact, Customer, CustomerInput } from '../../api/customers';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface CustomerFormModalProps {
  customer?: Customer | null;
  onClose: () => void;
  onSubmit: (input: CustomerInput) => Promise<void>;
}

interface ContactDraft {
  name: string;
  phone: string;
  email: string;
  position: string;
  isPrimary: boolean;
}

const EMPTY_CONTACT: ContactDraft = {
  name: '',
  phone: '',
  email: '',
  position: '',
  isPrimary: false,
};

function toContactDrafts(contacts: Contact[] | undefined): ContactDraft[] {
  if (!contacts || contacts.length === 0) return [];
  return contacts.map((c) => ({
    name: c.name ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    position: c.position ?? '',
    isPrimary: c.isPrimary ?? false,
  }));
}

function toInput(
  name: string,
  commercialRegister: string,
  nif: string,
  address: string,
  contacts: ContactDraft[],
): CustomerInput {
  const trimmedContacts = contacts
    .filter((c) => c.name.trim() !== '')
    .map((c) => ({
      name: c.name.trim(),
      phone: c.phone.trim() || undefined,
      email: c.email.trim() || undefined,
      position: c.position.trim() || undefined,
      isPrimary: c.isPrimary,
    }));

  return {
    name: name.trim(),
    commercialRegister: commercialRegister.trim() || null,
    nif: nif.trim() || null,
    address: address.trim() || null,
    contacts: trimmedContacts.length > 0 ? trimmedContacts : undefined,
  };
}

export function CustomerFormModal({
  customer,
  onClose,
  onSubmit,
}: CustomerFormModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(customer?.name ?? '');
  const [commercialRegister, setCommercialRegister] = useState(
    customer?.commercialRegister ?? '',
  );
  const [nif, setNif] = useState(customer?.nif ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [contacts, setContacts] = useState<ContactDraft[]>(() =>
    toContactDrafts(customer?.contacts),
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  const updateContact = (index: number, patch: Partial<ContactDraft>) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  };

  const addContact = () => {
    setContacts((prev) => [...prev, { ...EMPTY_CONTACT }]);
  };

  const removeContact = (index: number) => {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim() === '') {
      setError(t('customers:nameRequired'));
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(toInput(name, commercialRegister, nif, address, contacts));
    } catch (err) {
      setError(translateApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = customer ? t('customers:editTitle') : t('customers:new');

  return (
    <Modal
      title={title}
      onClose={onClose}
      size="lg"
      initialFocusRef={nameRef}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common:cancel')}
          </Button>
          <Button
            type="submit"
            form="customer-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? t('common:saving') : t('common:save')}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="customer-name"
              className="block text-sm font-medium text-gray-700"
            >
              {t('customers:name')} <span className="text-danger-600">*</span>
            </label>
            <Input
              id="customer-name"
              ref={nameRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="customer-register"
                className="block text-sm font-medium text-gray-700"
              >
                {t('customers:registerNo')}
              </label>
              <Input
                id="customer-register"
                type="text"
                value={commercialRegister}
                onChange={(e) => setCommercialRegister(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="customer-nif"
                className="block text-sm font-medium text-gray-700"
              >
                {t('customers:nif')}
              </label>
              <Input
                id="customer-nif"
                type="text"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                className="mt-1"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="customer-address"
              className="block text-sm font-medium text-gray-700"
            >
              {t('customers:address')}
            </label>
            <Input
              id="customer-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">{t('customers:contacts')}</h3>
              <Button variant="ghost" size="sm" onClick={addContact}>
                {t('customers:addContact')}
              </Button>
            </div>

            {contacts.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">{t('customers:noContacts')}</p>
            ) : (
              <div className="mt-2 space-y-3">
                {contacts.map((contact, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-md p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-secondary">
                        {t('customers:contactN', { n: index + 1 })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(index)}
                        className="text-danger-600"
                        aria-label={t('customers:deleteContact', { n: index + 1 })}
                      >
                        {t('common:delete')}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        type="text"
                        placeholder={t('customers:contactName')}
                        value={contact.name}
                        onChange={(e) =>
                          updateContact(index, { name: e.target.value })
                        }
                      />
                      <Input
                        type="text"
                        placeholder={t('customers:contactPhone')}
                        value={contact.phone}
                        onChange={(e) =>
                          updateContact(index, { phone: e.target.value })
                        }
                        dir="ltr"
                      />
                      <Input
                        type="email"
                        placeholder={t('customers:contactEmail')}
                        value={contact.email}
                        onChange={(e) =>
                          updateContact(index, { email: e.target.value })
                        }
                        dir="ltr"
                      />
                      <Input
                        type="text"
                        placeholder={t('customers:contactPosition')}
                        value={contact.position}
                        onChange={(e) =>
                          updateContact(index, { position: e.target.value })
                        }
                      />
                    </div>
                    <label className="inline-flex items-center text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={contact.isPrimary}
                        onChange={(e) =>
                          updateContact(index, { isPrimary: e.target.checked })
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ms-2">{t('customers:primaryContact')}</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div
              className="text-danger-600 text-sm bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
