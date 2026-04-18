'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/stores/auth-store';

const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'metyis2026';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(0);

  function handleSignIn() {
    if (password === DEMO_PASSWORD) signIn();
    else { setError(true); setShake(s => s + 1); setPassword(''); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-screen)]"><motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="mx-4 w-full max-w-[400px]"><motion.div key={shake} animate={shake > 0 ? { x: [0, -10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4, ease: 'easeInOut' }} className="flex flex-col items-center rounded-2xl bg-[var(--color-bg-card)] p-10 shadow-[var(--shadow-elevated)]"><div className="mb-6 flex flex-col items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded bg-[var(--color-accent)] text-[16px] font-bold text-white">MS</div><div className="text-center"><h1 className="text-[18px] font-bold leading-tight text-[var(--color-fg-default)]">Metyis Spain</h1><p className="text-[12px] text-[var(--color-fg-muted)]">Control Tower</p></div></div><p className="mb-8 max-w-[280px] text-center text-[13px] leading-relaxed text-[var(--color-fg-muted)]">Generic consulting and business analytics dashboard for executive performance monitoring.</p><div className="mb-4 w-full"><input type="password" value={password} placeholder="Access code" onChange={e => { setPassword(e.target.value); setError(false); }} onKeyDown={e => e.key === 'Enter' && handleSignIn()} className="w-full rounded-lg border border-[var(--color-stroke-default)] bg-[var(--color-bg-elevated)] px-4 py-2.5 text-[14px] text-[var(--color-fg-default)] outline-none transition-colors placeholder:text-[var(--color-fg-placeholder)] focus:border-[var(--color-brand)]" />{error && <p className="mt-1.5 text-[12px] text-red-500">Incorrect access code</p>}</div><button onClick={handleSignIn} className="flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--color-stroke-default)] bg-[var(--color-bg-elevated)] px-4 py-2.5 text-[14px] font-medium text-[var(--color-fg-default)] transition-colors hover:bg-[var(--color-bg-hover)] active:scale-[0.98]"><MicrosoftLogo />Sign in with Microsoft</button><p className="mt-6 text-[11px] text-[var(--color-fg-muted)]">Demo access code: metyis2026</p></motion.div></motion.div></div>;
}

function MicrosoftLogo() { return <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="9" height="9" fill="#F25022" /><rect x="11" y="1" width="9" height="9" fill="#7FBA00" /><rect x="1" y="11" width="9" height="9" fill="#00A4EF" /><rect x="11" y="11" width="9" height="9" fill="#FFB900" /></svg>; }
