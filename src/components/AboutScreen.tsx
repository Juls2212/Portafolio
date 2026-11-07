"use client";

import { useRef, useState } from "react";
import { ScreenFrame } from "@/components/ScreenFrame";
import { SideDialog } from "@/components/SideDialog";
import { useT } from "@/i18n/language-context";

export function AboutScreen() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <ScreenFrame titleId="screen-about-title" position="left" accent="teal" order={0}>
      <p className="screen__eyebrow">{t.about.eyebrow}</p>
      <h2 id="screen-about-title" className="screen__title">
        {t.about.title}
      </h2>
      <p className="screen__text">{t.about.text}</p>
      <div className="screen__actions">
        <button
          ref={triggerRef}
          type="button"
          className="btn btn--ghost"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          {t.about.openDialog}
        </button>
      </div>

      <SideDialog open={open} onClose={close} titleId="about-dialog-title">
        <div className="side-dialog__body">
          <h2 id="about-dialog-title" className="screen__title">
            {t.about.dialog.title}
          </h2>
          <div className="placeholder-box placeholder-box--photo">{t.about.dialog.photoPlaceholder}</div>
          <div className="placeholder-box">{t.about.dialog.extraPlaceholder}</div>
          <button type="button" className="btn btn--primary" onClick={close}>
            {t.about.dialog.close}
          </button>
        </div>
      </SideDialog>
    </ScreenFrame>
  );
}
