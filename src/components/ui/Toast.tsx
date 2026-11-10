import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useShiftStore } from '../../store/useShiftStore';

export const Toast: React.FC = () => {
  const toast = useShiftStore((s) => s.toast);
  const clearToast = useShiftStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      clearToast();
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  const toneStyles = {
    success: 'border-success-line bg-success-quiet text-emerald-500',
    warning: 'border-warning-line bg-warning-quiet text-amber-500',
    danger: 'border-danger-line bg-danger-quiet text-red-500',
    info: 'border-info-line bg-info-quiet text-blue-500',
  }[toast.tone];

  const Icon = {
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: AlertCircle,
    info: Info,
  }[toast.tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4"
    >
      <div
        className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-sm font-medium shadow-lg ${toneStyles}`}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span className="flex-1 text-text">{toast.text}</span>
        <button
          type="button"
          onClick={clearToast}
          aria-label="Cerrar aviso"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
};
