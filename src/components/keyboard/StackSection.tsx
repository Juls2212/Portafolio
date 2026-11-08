"use client";

import { useEffect } from "react";
import { KeyGrid } from "@/components/keyboard/KeyGrid";
import { KeyPanel } from "@/components/keyboard/KeyPanel";
import { KeyboardOrb } from "@/components/keyboard/KeyboardOrb";
import { useKeyboardMode } from "@/hooks/useKeyboardMode";
import { useT } from "@/i18n/language-context";
import { useActiveModule } from "@/lib/active-module";
import { keyboardActions } from "@/lib/keyboard-store";

/** Module 02. In 3D mode the keyboard itself lives in the fixed canvas; here sit the text, panel and a11y layer. */
export function StackSection() {
  const t = useT();
  const mode = useKeyboardMode();
  const moduleId = useActiveModule();

  // Leaving Stack fully resets the interaction: no selection, no panel, no hover or focus highlight.
  useEffect(() => {
    if (moduleId !== "stack") keyboardActions.reset();
  }, [moduleId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") keyboardActions.select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section id="stack" className="stack" data-mode={mode} aria-labelledby="stack-title">
      <div className="stack__head" data-keyboard-ignore>
        <p className="screen__eyebrow">{t.stack.eyebrow}</p>
        <h2 id="stack-title" className="screen__title" tabIndex={-1}>
          {t.stack.title}
        </h2>
        <p className="screen__text">{t.stack.intro}</p>
        <p className="stack__hint">{t.stack.hint}</p>
      </div>

      {mode === "3d" ? (
        <KeyGrid variant="invisible" />
      ) : (
        <div className="stack__fallback">
          <KeyGrid variant="visual" />
        </div>
      )}

      <KeyPanel />
      {mode === "3d" && <KeyboardOrb />}
    </section>
  );
}
