"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface SideDialogProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: ReactNode;
}

/**
 * Modal side screen built on the native <dialog>: Esc closes it, focus is
 * trapped while open and the rest of the page is inert.
 */
export function SideDialog({ open, onClose, titleId, children }: SideDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="side-dialog"
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        // Keep Tab / Shift+Tab cycling inside the dialog (browsers may otherwise escape to their UI).
        const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onClick={(event) => {
        // Clicks on the backdrop are dispatched to the dialog element itself.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
