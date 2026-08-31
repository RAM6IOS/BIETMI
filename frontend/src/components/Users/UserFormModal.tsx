import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createUser, updateUser } from '../../api/users';
import type { User, CreateUserInput, UserRole } from '../../api/users';
import { translateApiError } from '../../api/errors';
import { ApiError } from '../../api/http';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';

const ROLE_OPTIONS: UserRole[] = ['admin', 'commercial', 'accountant', 'purchasing'];

interface UserFormModalProps {
  user: User | null;
  onClose: () => void;
  onCreated: (tempPassword: string | undefined) => void;
  onUpdated: () => void;
}

export function UserFormModal({ user, onClose, onCreated, onUpdated }: UserFormModalProps) {
  const { t } = useTranslation();
  const editing = user !== null;

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('commercial');
  const [isActive, setIsActive] = useState(true);
  const [tempPassword, setTempPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      // oxlint-disable-next-line react/set-state-in-effect
      setFullName(user.fullName);
      setUsername(user.username);
      setRole(user.role);
      setIsActive(user.isActive);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      if (editing) {
        await updateUser(user.id, {
          fullName: fullName.trim(),
          role,
          isActive,
        });
        onUpdated();
      } else {
        const input: CreateUserInput = {
          fullName: fullName.trim(),
          username: username.trim(),
          role,
        };
        if (tempPassword.trim()) input.tempPassword = tempPassword.trim();
        const created = await createUser(input);
        setGenerated(created.tempPassword);
        onCreated(created.tempPassword);
        setCopied(false);
      }
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === 'CONFLICT_USERNAME_EXISTS') {
        setError(t('errors:CONFLICT_USERNAME_EXISTS'));
      } else {
        setError(translateApiError(err) || t('common:errors.saveError'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const copyGenerated = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        {t('users:cancel')}
      </Button>
      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? t('common:saving') : editing ? t('users:save') : t('users:create')}
      </Button>
    </>
  );

  return (
    <Modal
      title={editing ? t('users:editUser') : t('users:addUser')}
      onClose={onClose}
      footer={footer}
      initialFocusRef={usernameRef}
    >
      {generated && (
        <div className="mb-4 space-y-3">
          <Toast>{t('users:tempPasswordGenerated')}</Toast>
          <div className="rounded-md border border-border bg-surface-2 p-3">
            <p className="text-xs text-text-secondary">
              {t('users:tempPasswordCopyNote')}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 break-all rounded border border-border bg-white px-2 py-1 text-sm font-mono">
                {generated}
              </code>
              <Button variant="secondary" size="sm" onClick={copyGenerated}>
                {copied ? t('users:copied') : t('users:copy')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          className="mb-4 text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-md px-4 py-3"
          role="alert"
        >
          {error}
        </div>
      )}

      <form id="user-form" className="space-y-4" onSubmit={handleSave}>
        <div>
          <label htmlFor="user-fullname" className="block text-sm font-medium text-gray-900">
            {t('users:fullName')}
          </label>
          <Input
            id="user-fullname"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <label htmlFor="user-username" className="block text-sm font-medium text-gray-900">
            {t('users:username')}
          </label>
          <Input
            id="user-username"
            ref={usernameRef}
            type="text"
            required
            disabled={editing}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <label htmlFor="user-role" className="block text-sm font-medium text-gray-900">
            {t('users:role')}
          </label>
          <Select
            id="user-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="mt-1"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {t(`users:roles.${r}`)}
              </option>
            ))}
          </Select>
        </div>

        {!editing && (
          <div>
            <label htmlFor="user-temp-password" className="block text-sm font-medium text-gray-900">
              {t('users:tempPassword')}
            </label>
            <Input
              id="user-temp-password"
              type="text"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder={t('users:tempPasswordHint')}
              className="mt-1"
            />
          </div>
        )}

        {editing && (
          <div>
            <span className="block text-sm font-medium text-gray-900">{t('users:status')}</span>
            <div className="mt-2 flex gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-gray-900">
                <input
                  type="radio"
                  name="isActive"
                  value="active"
                  checked={isActive}
                  onChange={() => setIsActive(true)}
                />
                <span>{t('users:active')}</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-900">
                <input
                  type="radio"
                  name="isActive"
                  value="inactive"
                  checked={!isActive}
                  onChange={() => setIsActive(false)}
                />
                <span>{t('users:inactive')}</span>
              </label>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
