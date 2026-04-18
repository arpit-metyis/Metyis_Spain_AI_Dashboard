'use client';

import { createContext, useContext, useCallback, ReactNode, createElement } from 'react';
import { usePersistedState } from '@/lib/use-persisted-state';

interface User { name: string; email: string; avatar: string; }
interface AuthState { user: User | null; signIn: () => void; signOut: () => void; }

const AuthContext = createContext<AuthState | null>(null);
const MOCK_USER: User = { name: 'Metyis Spain User', email: 'user@metyis.com', avatar: 'MS' };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = usePersistedState<User | null>('metyis:user', null);
  const signIn = useCallback(() => setUser(MOCK_USER), [setUser]);
  const signOut = useCallback(() => setUser(null), [setUser]);
  return createElement(AuthContext.Provider, { value: { user, signIn, signOut }, children });
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
