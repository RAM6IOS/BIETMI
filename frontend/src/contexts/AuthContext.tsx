import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './auth-context';
import { fetchMe } from '../api/me';
import type { Me } from '../api/me';
import { ApiError } from '../api/http';

const TOKEN_KEY = 'bietmi_token';

function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readToken());
  const [currentUser, setCurrentUser] = useState<Me | null>(null);

  const login = (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setCurrentUser(null);
  };

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setCurrentUser(null);
  }, []);

  /**
   * Fetches the live profile (role/isActive) for the current session.
   * A 401 means the session user was deactivated or deleted — the session
   * must end immediately rather than keep showing stale UI/access.
   */
  const refreshMe = useCallback(async () => {
    try {
      setCurrentUser(await fetchMe());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        setToken(null);
        setCurrentUser(null);
      }
    }
  }, []);

  const isAuthenticated = token !== null;

  return (
    <AuthContext.Provider
      value={{ token, currentUser, login, logout, refreshMe, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
}