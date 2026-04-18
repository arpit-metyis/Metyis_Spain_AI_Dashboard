'use client';

import { useRef, useState, useLayoutEffect } from 'react';

export type WidgetSize = 'xs' | 'sm' | 'md' | 'lg';

export interface WidgetSizeResult {
  ref: React.RefObject<HTMLDivElement | null>;
  width: number;
  height: number;
  size: WidgetSize;
}

function toSizeClass(width: number): WidgetSize {
  if (width < 200) return 'xs';
  if (width < 350) return 'sm';
  if (width < 550) return 'md';
  return 'lg';
}

/**
 * Shared hook for widget responsiveness.
 * Attach `ref` to the content area; get back pixel dimensions and a t-shirt size class.
 * Uses a single ResizeObserver, RAF-debounced to avoid layout thrash.
 */
export function useWidgetSize(): WidgetSizeResult {
  const ref = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 350, height: 200 });
  const rafRef = useRef<number>(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Initial measurement
    setDims({ width: el.clientWidth, height: el.clientHeight });

    const ro = new ResizeObserver((entries) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        setDims(prev =>
          prev.width === Math.round(width) && prev.height === Math.round(height)
            ? prev
            : { width: Math.round(width), height: Math.round(height) },
        );
      });
    });

    ro.observe(el);
    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    ref,
    width: dims.width,
    height: dims.height,
    size: toSizeClass(dims.width),
  };
}
