"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent } from "react";
import { useT } from "@/i18n/language-context";

const noop = () => () => {};
/** False on the server and during hydration, true afterwards (no effect, no extra render pass). */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/**
 * About as four facets: an accessible tablist (arrow keys, Home/End, roving tabindex, automatic
 * activation) that shows one approved sentence at a time. Without JavaScript, and before hydration,
 * every sentence is visible; afterwards only the selected tabpanel is.
 */
export function AboutFacets() {
  const t = useT();
  const id = useId();
  const hydrated = useHydrated();
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const facets = t.about.facets;

  const move = (to: number) => {
    const next = (to + facets.length) % facets.length;
    setSelected(next);
    tabs.current[next]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    // The carousel listens for arrows too: keep these keys inside the tablist.
    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) event.stopPropagation();
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(selected + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(selected - 1);
        break;
      case "Home":
        event.preventDefault();
        move(0);
        break;
      case "End":
        event.preventDefault();
        move(facets.length - 1);
        break;
    }
  };

  return (
    <div className="facets">
      <div role="tablist" aria-label={t.about.facetsLabel} className="facets__tabs" onKeyDown={onKeyDown}>
        {facets.map((facet, i) => (
          <button
            key={facet.label}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${i}`}
            aria-selected={i === selected}
            aria-controls={`${id}-panel-${i}`}
            tabIndex={i === selected ? 0 : -1}
            className="facet-tab"
            onClick={() => setSelected(i)}
          >
            {facet.label}
          </button>
        ))}
      </div>
      {facets.map((facet, i) => (
        <div
          key={facet.label}
          role="tabpanel"
          id={`${id}-panel-${i}`}
          aria-labelledby={`${id}-tab-${i}`}
          hidden={hydrated && i !== selected}
          className="facet-panel"
        >
          <p className="screen__text facet-text">{facet.text}</p>
        </div>
      ))}
    </div>
  );
}
