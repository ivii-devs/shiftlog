import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-6 py-10 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface-muted text-text-secondary">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-text">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-text-secondary">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-md bg-action px-4 py-2.5 text-sm font-medium text-action-ink transition-transform duration-150 hover:bg-action-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
