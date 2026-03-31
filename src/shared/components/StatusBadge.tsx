import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface StatusBadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

const toneClassMap: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  success: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:ring-emerald-900',
  warning: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:ring-amber-900',
  danger: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:ring-rose-900',
  info: 'bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-400 dark:ring-cyan-900',
};

export function StatusBadge({ tone = 'neutral', children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tracking-wide',
        toneClassMap[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
