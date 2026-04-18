'use client';

import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';

export function usePersistedState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const hydrated = useRef(false);

  const [value, setValue] = useState<T>(fallback);

  // Hydrate from localStorage once after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored) as T);
      }
    } catch { /* corrupt or missing — keep fallback */ }
    hydrated.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage on every change after hydration
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* quota exceeded — silently skip */ }
  }, [key, value]);

  return [value, setValue];
}
