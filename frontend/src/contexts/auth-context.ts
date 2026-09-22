import { createContext } from 'react';
import type { Me } from '../api/me';

export interface AuthContextType {
  token: string | null;
  currentUser: Me | null;
  login: (token: string) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);