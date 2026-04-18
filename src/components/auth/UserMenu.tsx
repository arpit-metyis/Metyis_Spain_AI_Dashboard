'use client';

import { useState } from 'react';
import { useAuth } from '@/stores/auth-store';
import { useUI } from '@/stores/ui-store';
import { AdaptivePopover } from '@/components/ui/AdaptivePopover';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useUI();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <AdaptivePopover
      open={open}
      onOpenChange={setOpen}
      width={240}
      mobileTitle="Account"
      trigger={
        <button
          onClick={() => setOpen(!open)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
          title={user.name}
        >
          {initials}
        </button>
      }
    >
      {/* User info */}
      <div className="px-3 py-2.5">
        <p className="text-[13px] font-semibold text-[var(--color-fg-default)] leading-tight">
          {user.name}
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)]">
          {user.email}
        </p>
      </div>

      <div className="mx-2 my-1 border-t border-[var(--color-stroke-subtle)]" />

      {/* Appearance */}
      <button
        onClick={() => { toggleTheme(); setOpen(false); }}
        className="flex items-center gap-2.5 mx-1 rounded-[var(--radii-button)] px-2 py-2 text-[12px] text-[var(--color-fg-default)] hover:bg-[var(--color-bg-menu-hover)]"
        style={{ width: 'calc(100% - 8px)' }}
      >
        <span className="material-symbols-rounded text-[16px] text-[var(--color-fg-muted)]">
          {theme === 'dark' ? 'light_mode' : 'dark_mode'}
        </span>
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>

      {/* Notifications stub */}
      <button
        className="flex items-center gap-2.5 mx-1 rounded-[var(--radii-button)] px-2 py-2 text-[12px] text-[var(--color-fg-muted)] cursor-default"
        style={{ width: 'calc(100% - 8px)' }}
      >
        <span className="material-symbols-rounded text-[16px]">notifications</span>
        Notifications
      </button>

      {/* Help & Support stub */}
      <button
        className="flex items-center gap-2.5 mx-1 rounded-[var(--radii-button)] px-2 py-2 text-[12px] text-[var(--color-fg-muted)] cursor-default"
        style={{ width: 'calc(100% - 8px)' }}
      >
        <span className="material-symbols-rounded text-[16px]">help</span>
        Help & Support
      </button>

      <div className="mx-2 my-1 border-t border-[var(--color-stroke-subtle)]" />

      {/* Sign Out */}
      <button
        onClick={() => { signOut(); setOpen(false); }}
        className="flex items-center gap-2.5 mx-1 rounded-[var(--radii-button)] px-2 py-2 text-[12px] text-[var(--color-fg-default)] hover:bg-[var(--color-bg-menu-hover)]"
        style={{ width: 'calc(100% - 8px)' }}
      >
        <span className="material-symbols-rounded text-[16px] text-[var(--color-fg-muted)]">logout</span>
        Sign Out
      </button>
    </AdaptivePopover>
  );
}
