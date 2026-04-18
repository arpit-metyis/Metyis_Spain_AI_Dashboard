'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/stores/auth-store';
import { UIProvider } from '@/stores/ui-store';
import { FilterProvider } from '@/stores/filter-store';
import { DashboardProvider } from '@/stores/dashboard-store';
import { SelectionProvider } from '@/stores/selection-store';
import { AuthGate } from '@/components/auth/AuthGate';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <UIProvider>
        <FilterProvider>
          <DashboardProvider>
            <SelectionProvider>
              <AuthGate>
                {children}
              </AuthGate>
            </SelectionProvider>
          </DashboardProvider>
        </FilterProvider>
      </UIProvider>
    </AuthProvider>
  );
}
