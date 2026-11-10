import React from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}) => {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-background/80 transition-opacity duration-150" />
        <Drawer.Content
          aria-describedby={description ? undefined : undefined}
          className="fixed inset-x-0 bottom-0 z-50 mt-12 flex max-h-[85vh] flex-col rounded-t-lg border-t border-border bg-surface text-text focus:outline-none"
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-sm bg-border-strong" />
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="min-w-0 flex-1">
              <Drawer.Title className="truncate text-lg font-semibold tracking-tight text-text">
                {title}
              </Drawer.Title>
              {description ? (
                <Drawer.Description className="mt-0.5 text-xs text-text-secondary">
                  {description}
                </Drawer.Description>
              ) : (
                <Drawer.Description className="sr-only">{title}</Drawer.Description>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar panel"
              className="ml-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-secondary transition-transform duration-150 hover:bg-surface-muted hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>

          <div className="scroll-container flex-1 min-h-0 overflow-y-auto px-4 py-4">
            {children}
          </div>

          {footer ? (
            <div className="border-t border-border bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
              {footer}
            </div>
          ) : (
            <div className="pb-[env(safe-area-inset-bottom,0px)]" />
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
