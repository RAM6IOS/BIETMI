import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import type { Me } from '../api/me';

function Harness() {
  const { token, currentUser, isAuthenticated, login, logout, refreshMe } =
    useAuth();
  return (
    <div>
      <button onClick={() => login('jwt-token')}>login</button>
      <button onClick={logout}>logout</button>
      <button onClick={() => void refreshMe()}>refresh</button>
      <span data-testid="token">{token ?? 'null'}</span>
      <span data-testid="role">{currentUser?.role ?? 'null'}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
    </div>
  );
}

function me(overrides: Partial<Me> = {}): Me {
  return {
    id: 'u1',
    username: 'ali',
    fullName: 'Ali Ben',
    role: 'commercial',
    workspace: 'production',
    isActive: true,
    mustChangePassword: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('login stores the token and authenticates; logout clears session', () => {
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByText('login'));

    expect(screen.getByTestId('token')).toHaveTextContent('jwt-token');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(localStorage.getItem('bietmi_token')).toBe('jwt-token');

    fireEvent.click(screen.getByText('logout'));

    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(localStorage.getItem('bietmi_token')).toBeNull();
  });

  it('refreshMe updates currentUser with the live role', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => me({ role: 'accountant' }),
      }),
    );

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByText('login'));
    fireEvent.click(screen.getByText('refresh'));

    await waitFor(() =>
      expect(screen.getByTestId('role')).toHaveTextContent('accountant'),
    );
  });

  it('refreshMe on 401 logs the user out immediately (disabled/deleted session)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      }),
    );

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByText('login'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');

    fireEvent.click(screen.getByText('refresh'));

    await waitFor(() =>
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false'),
    );
    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(screen.getByTestId('role')).toHaveTextContent('null');
    expect(localStorage.getItem('bietmi_token')).toBeNull();
  });
});