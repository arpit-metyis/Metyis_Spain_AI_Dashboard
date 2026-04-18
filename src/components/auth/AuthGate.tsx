'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/stores/auth-store';
import { LoginScreen } from './LoginScreen';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (!user) return <LoginScreen />;
  return <>{children}</>;
}
