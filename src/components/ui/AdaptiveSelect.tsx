'use client';

import { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import { useInsidePopover } from '@/components/ui/AdaptivePopover';

interface CommonProps<T extends string> {
  label: string;
  options: { value: T; label: string; indent?: boolean }[];
  variant?: 'dropdown' | 'inline';
  mixed?: boolean;
  size?: 'sm' | 'md';
  searchable?: boolean;
}

type SingleSelectProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  multiSelect?: false;
  values?: never;
  onChangeMulti?: never;
};

type MultiSelectProps<T extends string> = {
  values: T[];
  onChangeMulti: (values: T[]) => void;
  multiSelect: true;
  value?: never;
  onChange?: never;
};

type AdaptiveSelectProps<T extends string> = CommonProps<T> & (SingleSelectProps<T> | MultiSelectProps<T>);

export function AdaptiveSelect<T extends string>(props: AdaptiveSelectProps<T>) {
  const { label, options, variant = 'dropdown', mixed, size = 'md', searchable } = props;
  const isMobile = useIsMobile();
  const insidePopover = useInsidePopover();

  if (props.multiSelect) {
    const { values, onChangeMulti } = props;
    if (isMobile) {
      return <MobilePillsMulti label={label} options={options} values={values} onChangeMulti={onChangeMulti} mixed={mixed} />;
    }
    if (variant === 'inline' || insidePopover) {
      return <InlineSelectMulti label={label} options={options} values={values} onChangeMulti={onChangeMulti} mixed={mixed} />;
    }
    return <DropdownSelectMulti label={label} options={options} values={values} onChangeMulti={onChangeMulti} mixed={mixed} size={size} />;
  }

  const { value, onChange } = props;
  if (isMobile) {
    return <MobilePills label={label} options={options} value={value} onChange={onChange} mixed={mixed} />;
  }
  if (variant === 'inline' || insidePopover) {
    return <InlineSelect label={label} options={options} value={value} onChange={onChange} mixed={mixed} />;
  }
  return <DropdownSelect label={label} options={options} value={value} onChange={onChange} mixed={mixed} size={size} searchable={searchable} />;
}

/* ── helpers ─────────────────────────────────────────────────────── */

function multiTriggerText<T extends string>(
  values: T[],
  options: { value: T; label: string }[],
): string {
  if (values.length === options.length) return 'All';
  if (values.length === 1) return options.find(o => o.value === values[0])?.label ?? values[0];
  return `${values.length} of ${options.length}`;
}

/* ── Mobile: pill buttons (single) ──────────────────────────────── */

function MobilePills<T extends string>({
  label,
  options,
  value,
  onChange,
  mixed,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  mixed?: boolean;
}) {
  return (
    <div className="pb-3">
      <p className="pb-1.5 text-[12px] font-medium text-[var(--color-fg-muted)]">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => {
          const isSelected = !mixed && value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                isSelected
                  ? 'bg-[var(--color-accent)]/12 text-[var(--color-accent)] font-medium'
                  : 'bg-[var(--color-bg-input)] text-[var(--color-fg-default)]'
              }`}
            >
              {isSelected && (
                <span className="material-symbols-rounded text-[12px]">check</span>
              )}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Mobile: pill buttons (multi) ───────────────────────────────── */

function MobilePillsMulti<T extends string>({
  label,
  options,
  values,
  onChangeMulti,
  mixed,
}: {
  label: string;
  options: { value: T; label: string }[];
  values: T[];
  onChangeMulti: (values: T[]) => void;
  mixed?: boolean;
}) {
  const toggle = (v: T) => {
    const next = values.includes(v) ? values.filter(x => x !== v) : [...values, v];
    if (next.length > 0) onChangeMulti(next);
  };

  return (
    <div className="pb-3">
      <p className="pb-1.5 text-[12px] font-medium text-[var(--color-fg-muted)]">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => {
          const isSelected = !mixed && values.includes(o.value);
          return (
            <button
              key={o.value}
              onClick={() => toggle(o.value)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                isSelected
                  ? 'bg-[var(--color-accent)]/12 text-[var(--color-accent)] font-medium'
                  : 'bg-[var(--color-bg-input)] text-[var(--color-fg-default)]'
              }`}
            >
              {isSelected && (
                <span className="material-symbols-rounded text-[12px]">check</span>
              )}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Desktop inline: native <select> (single) ────────────────────── */

function InlineSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  mixed,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  mixed?: boolean;
}) {
  return (
    <div className="px-3 py-1">
      <p className="pb-1 text-[11px] font-medium text-[var(--color-fg-muted)]">{label}</p>
      <select
        value={mixed ? '' : value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`w-full rounded bg-[var(--color-bg-input)] border border-[var(--color-stroke-subtle)] px-2 py-1 text-[12px] ${mixed ? 'text-[var(--color-fg-subtle)] italic' : 'text-[var(--color-fg-default)]'}`}
      >
        {mixed && <option value="" disabled>Mixed</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ── Desktop inline: checkboxes (multi) ──────────────────────────── */

function InlineSelectMulti<T extends string>({
  label,
  options,
  values,
  onChangeMulti,
  mixed,
}: {
  label: string;
  options: { value: T; label: string }[];
  values: T[];
  onChangeMulti: (values: T[]) => void;
  mixed?: boolean;
}) {
  const toggle = (v: T) => {
    const next = values.includes(v) ? values.filter(x => x !== v) : [...values, v];
    if (next.length > 0) onChangeMulti(next);
  };

  return (
    <div className="px-3 py-1">
      <p className="pb-1 text-[11px] font-medium text-[var(--color-fg-muted)]">{label}</p>
      <div className="flex flex-col gap-0.5">
        {options.map(o => {
          const checked = !mixed && values.includes(o.value);
          return (
            <label key={o.value} className="flex items-center gap-2 rounded-[var(--radii-button)] px-1 py-1 text-[12px] text-[var(--color-fg-default)] hover:bg-[var(--color-bg-menu-hover)] cursor-pointer">
              <span className={`material-symbols-rounded text-[16px] ${checked ? 'text-[var(--color-accent)]' : 'text-[var(--color-fg-subtle)]'}`}>
                {checked ? 'check_box' : 'check_box_outline_blank'}
              </span>
              <span onClick={() => toggle(o.value)}>{o.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/* ── Desktop dropdown: trigger button + portalled option list (single) */

function DropdownSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  mixed,
  size = 'md',
  searchable,
}: {
  label: string;
  options: { value: T; label: string; indent?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  mixed?: boolean;
  size?: 'sm' | 'md';
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchStr, setSearchStr] = useState('');
  const selected = options.find(o => o.value === value);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const dropdownWidth = searchable ? 200 : 160;

  const visibleOptions = useMemo(() => {
    if (!searchable || !searchStr.trim()) return options;
    const lower = searchStr.toLowerCase();
    const matchedIndices = new Set<number>();
    options.forEach((opt, i) => {
      if (opt.label.toLowerCase().includes(lower)) {
        matchedIndices.add(i);
        if (opt.indent) {
          for (let j = i - 1; j >= 0; j--) {
            if (!options[j].indent) { matchedIndices.add(j); break; }
          }
        }
      }
    });
    return options.filter((_, i) => matchedIndices.has(i));
  }, [options, searchable, searchStr]);

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;

    let x = rect.left;
    x = Math.max(pad, Math.min(x, vw - dropdownWidth - pad));

    let y = rect.bottom + 4;

    if (dropdownRef.current) {
      const h = dropdownRef.current.offsetHeight;
      if (y + h > vh - pad) y = rect.top - h - 4;
      if (y < pad) y = pad;
    }

    setCoords({ x, y });
  }, [dropdownWidth]);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (open && dropdownRef.current) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (open) reposition();
  }, [searchStr, open, reposition]);

  useEffect(() => {
    if (!open) setSearchStr('');
  }, [open]);

  useEffect(() => {
    if (open && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  return (
    <div ref={triggerRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radii-button)] border border-[var(--color-stroke-subtle)] bg-[var(--color-bg-input)] text-[var(--color-fg-default)] transition-colors hover:bg-[var(--color-bg-elevated)] ${
          size === 'sm'
            ? 'h-6 px-1.5 text-[11px]'
            : 'h-8 px-2.5 text-[12px]'
        }`}
      >
        {label && <span className="text-[var(--color-fg-muted)]">{label}:</span>}
        <span className={mixed ? 'text-[var(--color-fg-subtle)] italic' : 'font-medium'}>{mixed ? 'Mixed' : selected?.label}</span>
        <span className={`material-symbols-rounded text-[var(--color-fg-subtle)] ${size === 'sm' ? 'text-[12px]' : 'text-[14px]'}`}>expand_more</span>
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ top: coords.y, left: coords.x }}
              className={`fixed z-[9999] rounded-[var(--radii-widget)] bg-[var(--color-bg-menu)] py-1 shadow-[var(--shadow-elevated)] backdrop-blur-xl backdrop-saturate-150 ${searchable ? 'min-w-[200px]' : 'min-w-[160px]'}`}
            >
              {searchable && (
                <div className="px-2 pb-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchStr}
                    onChange={e => setSearchStr(e.target.value)}
                    placeholder="Search..."
                    className="w-full rounded-[var(--radii-button)] border border-[var(--color-stroke-subtle)] bg-[var(--color-bg-input)] px-2 py-1 text-[12px] text-[var(--color-fg-default)] outline-none placeholder:text-[var(--color-fg-subtle)]"
                  />
                </div>
              )}
              {visibleOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className={`block mx-1 rounded-[var(--radii-button)] py-1.5 text-left text-[12px] transition-colors hover:bg-[var(--color-bg-menu-hover)] ${
                    option.value === value ? 'text-[var(--color-accent)] font-medium' : 'text-[var(--color-fg-default)]'
                  } ${option.indent ? 'pl-5 pr-2' : 'px-2'}`}
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

/* ── Desktop dropdown (multi) ─────────────────────────────────────── */

function DropdownSelectMulti<T extends string>({
  label,
  options,
  values,
  onChangeMulti,
  mixed,
  size = 'md',
}: {
  label: string;
  options: { value: T; label: string }[];
  values: T[];
  onChangeMulti: (values: T[]) => void;
  mixed?: boolean;
  size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const toggle = (v: T) => {
    const next = values.includes(v) ? values.filter(x => x !== v) : [...values, v];
    if (next.length > 0) onChangeMulti(next);
  };

  const triggerText = mixed ? 'Mixed' : multiTriggerText(values, options);

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;
    const dropdownWidth = 180;

    let x = rect.left;
    x = Math.max(pad, Math.min(x, vw - dropdownWidth - pad));

    let y = rect.bottom + 4;

    if (dropdownRef.current) {
      const h = dropdownRef.current.offsetHeight;
      if (y + h > vh - pad) y = rect.top - h - 4;
      if (y < pad) y = pad;
    }

    setCoords({ x, y });
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (open && dropdownRef.current) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  return (
    <div ref={triggerRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radii-button)] border border-[var(--color-stroke-subtle)] bg-[var(--color-bg-input)] text-[var(--color-fg-default)] transition-colors hover:bg-[var(--color-bg-elevated)] ${
          size === 'sm'
            ? 'h-6 px-1.5 text-[11px]'
            : 'h-8 px-2.5 text-[12px]'
        }`}
      >
        {label && <span className="text-[var(--color-fg-muted)]">{label}:</span>}
        <span className={mixed ? 'text-[var(--color-fg-subtle)] italic' : 'font-medium'}>{triggerText}</span>
        <span className={`material-symbols-rounded text-[var(--color-fg-subtle)] ${size === 'sm' ? 'text-[12px]' : 'text-[14px]'}`}>expand_more</span>
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ top: coords.y, left: coords.x }}
              className="fixed z-[9999] min-w-[180px] rounded-[var(--radii-widget)] bg-[var(--color-bg-menu)] py-1 shadow-[var(--shadow-elevated)] backdrop-blur-xl backdrop-saturate-150"
            >
              {options.map(option => {
                const checked = values.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggle(option.value)}
                    className={`flex items-center gap-2 mx-1 rounded-[var(--radii-button)] px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-[var(--color-bg-menu-hover)] ${
                      checked ? 'text-[var(--color-fg-default)] font-medium' : 'text-[var(--color-fg-default)]'
                    }`}
                    style={{ width: 'calc(100% - 8px)' }}
                  >
                    <span className={`material-symbols-rounded text-[16px] ${checked ? 'text-[var(--color-accent)]' : 'text-[var(--color-fg-subtle)]'}`}>
                      {checked ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    {option.label}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
