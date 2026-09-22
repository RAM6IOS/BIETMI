import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import { useAuth } from '../contexts/useAuth';
import { useAuthRole } from './useAuthRole';
import type { Me } from '../api/me';

function roleHarnessJwt(role: string): string {
  const payload = btoa(JSON.stringify({ role }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `header.${payload}.signature`;
}

function RoleDisplay() {
  const role = useAuthRole();
  const { refreshMe } = useAuth();
  return (
    <div>
      <span data-testid="role">{role ?? 'null'}</span>
      <button onClick={() => void refreshMe()}>refresh</button>
    </div>
  );
}

function me(overrides: Partial<Me> = {}): Me {
  return {
    id: 'u1',
    username: 'ali',
    fullName: 'Ali Ben',
    role: 'purchasing',
    workspace: 'production',
    isActive: true,
    mustChangePassword: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('useAuthRole', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to the token role before /auth/me resolves', () => {
    localStorage.setItem('bietmi_token', roleHarnessJwt('admin'));

    render(
      <AuthProvider>
        <RoleDisplay />
      </AuthProvider>,
    );

    expect(screen.getByTestId('role')).toHaveTextContent('admin');
  });

  it('shows the live role from /auth/me once it resolves, even though it differs from the token', async () => {
    localStorage.setItem('bietmi_token', roleHarnessJwt('admin'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => me({ role: 'purchasing' }),
      }),
    );

    render(
      <AuthProvider>
        <RoleDisplay />
      </AuthProvider>,
    );

    // Stale token role is shown first...
    expect(screen.getByTestId('role')).toHaveTextContent('admin');

    // ...and the live role replaces it without any re-login.
    fireEvent.click(screen.getByText('refresh'));

    await waitFor(() =>
      expect(screen.getByTestId('role')).toHaveTextContent('purchasing'),
    );
  });
});