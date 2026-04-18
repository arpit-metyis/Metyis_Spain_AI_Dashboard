'use client';

import { useState, useEffect } from 'react';

const COMPACT_QUERY = '(max-width: 995px)';

export function useIsCompact(): boolean {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(COMPACT_QUERY);
    setIsCompact(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsCompact(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isCompact;
}
