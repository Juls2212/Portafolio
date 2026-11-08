"use client";

import { useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { KEYBOARD_COLS, KEYBOARD_ROWS, keyboardKeys } from "@/data/technologies";
import type { KeyDef } from "@/data/technologies";
import { useLang, useT } from "@/i18n/language-context";
import { getActiveModule } from "@/lib/active-module";
import { keyAtCell, keyboardActions, useKeyboardState } from "@/lib/keyboard-store";

interface KeyGridProps {
  /** "visual" is the DOM fallback keyboard; "invisible" is the accessible layer over the 3D canvas. */
  variant: "visual" | "invisible";
}

/**
 * Every key as a real button with a single tab stop (roving tabindex) and arrow-key navigation.
 * Enter / Space press the key.
 */
export function KeyGrid({ variant }: KeyGridProps) {
  const t = useT();
  const { lang } = useLang();
  const { selectedId } = useKeyboardState();
  const [roving, setRoving] = useState<string>(keyboardKeys[0]?.id ?? "");
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const labelOf = (key: KeyDef): string =>
    key.kind === "tech" && key.tech
      ? `${key.tech.name}, ${key.tech.category[lang]}`
      : t.stack.arrows[key.direction ?? "up"];

  const moveFocus = (id: string | undefined) => {
    if (!id) return;
    setRoving(id);
    buttons.current.get(id)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, key: KeyDef) => {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      moveFocus(keyAtCell(key.row + move[0], key.col + move[1]));
    } else if (event.key === "Home") {
      event.preventDefault();
      moveFocus(keyAtCell(key.row, 0));
    } else if (event.key === "End") {
      event.preventDefault();
      moveFocus(keyAtCell(key.row, KEYBOARD_COLS - 1));
    }
  };

  return (
    <div
      role="group"
      aria-label={t.stack.keyboardLabel}
      className={`key-grid key-grid--${variant}`}
      style={{ "--rows": KEYBOARD_ROWS, "--cols": KEYBOARD_COLS } as CSSProperties}
    >
      {keyboardKeys.map((key) => {
        const tech = key.tech;
        const selected = key.id === selectedId;
        return (
          <button
            key={key.id}
            ref={(el) => {
              if (el) buttons.current.set(key.id, el);
              else buttons.current.delete(key.id);
            }}
            type="button"
            className="keycap"
            data-key-id={key.id}
            data-kind={key.kind}
            data-selected={selected}
            data-fallback={tech && !tech.logo ? true : undefined}
            aria-label={labelOf(key)}
            aria-pressed={key.kind === "tech" ? selected : undefined}
            tabIndex={roving === key.id ? 0 : -1}
            style={
              {
                gridRow: key.row + 1,
                gridColumn: key.col + 1,
                "--key": tech?.keyColor,
                "--engrave": tech?.logoColor,
                "--logo": tech?.logo ? `url(${tech.logo})` : undefined,
              } as CSSProperties
            }
            onClick={() => keyboardActions.activate(key.id)}
            onFocus={() => {
              // Keyboard users can Tab here from anywhere: bring the Stack module (and the board) into view.
              if (variant === "invisible" && getActiveModule() !== "stack") {
                document.getElementById("stack")?.scrollIntoView({ block: "start" });
              }
              setRoving(key.id);
              keyboardActions.setFocused(key.id);
            }}
            onBlur={() => keyboardActions.setFocused(null)}
            onKeyDown={(event) => onKeyDown(event, key)}
          >
            {variant === "visual" && <KeyFace keyDef={key} />}
          </button>
        );
      })}
    </div>
  );
}

function KeyFace({ keyDef }: { keyDef: KeyDef }) {
  if (keyDef.kind === "arrow") {
    return <span className="keycap__arrow" data-direction={keyDef.direction} aria-hidden="true" />;
  }
  const tech = keyDef.tech;
  if (tech && !tech.logo) {
    return (
      <span className="keycap__initials" aria-hidden="true">
        {tech.initials}
      </span>
    );
  }
  return <span className="keycap__logo" aria-hidden="true" />;
}
