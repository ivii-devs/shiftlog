import React from 'react';

export const ShiftListSkeleton: React.FC = () => {
  return (
    <div
      aria-label="Cargando registros"
      className="divide-y divide-border rounded-lg border border-border bg-surface"
    >
      {[0, 1, 2].map((idx) => (
        <div key={idx} className="flex items-center justify-between p-4">
          <div className="space-y-2">
            <div className="h-4 w-36 animate-pulse rounded-sm bg-surface-muted" />
            <div className="h-3 w-24 animate-pulse rounded-sm bg-surface-muted" />
          </div>
          <div className="space-y-2 text-right">
            <div className="h-5 w-20 animate-pulse rounded-sm bg-surface-muted" />
            <div className="h-3 w-14 animate-pulse rounded-sm bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  );
};
