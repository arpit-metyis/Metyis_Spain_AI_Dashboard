import clsx from 'clsx';

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
  subtitle?: string;
}

export function SectionTitle({ children, className, subtitle }: SectionTitleProps) {
  return (
    <div className={clsx('mb-3', className)}>
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
        {children}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-[11px] text-[var(--color-fg-subtle)]">{subtitle}</p>
      )}
    </div>
  );
}
