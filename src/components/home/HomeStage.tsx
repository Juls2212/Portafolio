"use client";

import { useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { PanelFull, useTeaser } from "@/components/home/PanelContent";
import type { AssetAvailability } from "@/data/assets";
import { DEFAULT_PANEL, HOME_PANELS } from "@/data/home-panels";
import type { HomePanelId } from "@/data/home-panels";
import { profile } from "@/data/profile";
import { useT } from "@/i18n/language-context";

const COUNT = HOME_PANELS.length;
const wrap = (i: number) => ((i % COUNT) + COUNT) % COUNT;
const SWIPE_PX = 50;

/** Indicator order: P/01, P/02, P/03. */
const INDICATOR_ORDER = [...HOME_PANELS.keys()].sort((a, b) => HOME_PANELS[a]!.code.localeCompare(HOME_PANELS[b]!.code));

/**
 * Home: a three-panel focus carousel (desktop / tall tablet) and an accordion (mobile, short
 * tablets). Both are in the DOM; CSS shows one. They share the same active index.
 */
export function HomeStage({ assets }: { assets: AssetAvailability }) {
  const t = useT();
  const [active, setActive] = useState(DEFAULT_PANEL);
  const swipe = useRef<number | null>(null);

  const go = (index: number) => setActive(wrap(index));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "ArrowRight") go(active + 1);
    else if (event.key === "ArrowLeft") go(active - 1);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swipe.current = event.pointerType === "touch" ? event.clientX : null;
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (swipe.current === null) return;
    const dx = event.clientX - swipe.current;
    swipe.current = null;
    if (dx <= -SWIPE_PX) go(active + 1);
    else if (dx >= SWIPE_PX) go(active - 1);
  };

  return (
    <div className="home">
      <h1 className="sr-only">
        {profile.name} · {t.presentation.role}
      </h1>

      <div
        className="carousel"
        role="group"
        aria-roledescription="carousel"
        aria-label={t.home.carouselLabel}
        onKeyDown={onKeyDown}
      >
        <div className="carousel__stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
          {HOME_PANELS.map((panel, i) => (
            <CarouselPanel
              key={panel.id}
              id={panel.id}
              code={panel.code}
              accent={panel.accent}
              order={i}
              slot={i === active ? "center" : wrap(i - active) === 1 ? "right" : "left"}
              assets={assets}
              onOpen={() => go(i)}
            />
          ))}
        </div>

        <div className="carousel__controls">
          <button type="button" className="arrow-btn" aria-label={t.home.previous} onClick={() => go(active - 1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <nav aria-label={t.home.indicatorLabel}>
            <ol className="home-indicator">
              {INDICATOR_ORDER.map((i) => (
                <li key={HOME_PANELS[i]!.id}>
                  <button
                    type="button"
                    aria-current={i === active ? "true" : undefined}
                    onClick={() => go(i)}
                  >
                    {HOME_PANELS[i]!.code}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <button type="button" className="arrow-btn" aria-label={t.home.next} onClick={() => go(active + 1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <p className="sr-only" aria-live="polite">
            <ActiveName id={HOME_PANELS[active]!.id} />
          </p>
        </div>
      </div>

      <div className="accordion">
        {INDICATOR_ORDER.map((i) => (
          <AccordionItem
            key={HOME_PANELS[i]!.id}
            id={HOME_PANELS[i]!.id}
            code={HOME_PANELS[i]!.code}
            accent={HOME_PANELS[i]!.accent}
            open={i === active}
            assets={assets}
            onOpen={() => setActive(i)}
          />
        ))}
      </div>
    </div>
  );
}

function ActiveName({ id }: { id: HomePanelId }) {
  const t = useT();
  const { name } = useTeaser(id);
  return (
    <>
      {t.home.active} {name}
    </>
  );
}

interface CarouselPanelProps {
  id: HomePanelId;
  code: string;
  accent: "neon" | "teal" | "lime";
  order: number;
  slot: "left" | "center" | "right";
  assets: AssetAvailability;
  onOpen: () => void;
}

function CarouselPanel({ id, code, accent, order, slot, assets, onOpen }: CarouselPanelProps) {
  const t = useT();
  const teaser = useTeaser(id);
  const isActive = slot === "center";
  return (
    <div
      className="cpanel"
      data-slot={slot}
      role="group"
      aria-roledescription={t.home.slide}
      aria-label={teaser.name}
      style={{ "--i": order } as CSSProperties}
    >
      <div className="screen cpanel__glass" data-accent={accent}>
        <span className="corner corner--tl" aria-hidden="true" />
        <span className="corner corner--tr" aria-hidden="true" />
        <span className="corner corner--bl" aria-hidden="true" />
        <span className="corner corner--br" aria-hidden="true" />
        <div className="cpanel__full" inert={!isActive}>
          <PanelFull id={id} assets={assets} />
        </div>
        <button
          type="button"
          className="cpanel__teaser"
          inert={isActive}
          aria-label={`${t.home.open} ${teaser.name}`}
          onClick={onOpen}
        >
          <span className="cpanel__code">{code}</span>
          <span className="cpanel__title">{teaser.title}</span>
          <span className="cpanel__line">{teaser.line}</span>
          <span className="cpanel__hint" aria-hidden="true">
            {t.home.openHint}
          </span>
        </button>
      </div>
    </div>
  );
}

interface AccordionItemProps {
  id: HomePanelId;
  code: string;
  accent: "neon" | "teal" | "lime";
  open: boolean;
  assets: AssetAvailability;
  onOpen: () => void;
}

/** Mobile: exactly one panel open; tapping a header opens it and closes the others. */
function AccordionItem({ id, code, accent, open, assets, onOpen }: AccordionItemProps) {
  const { name } = useTeaser(id);
  return (
    <section className="acc" data-open={open} data-accent={accent}>
      <h2 className="acc__head">
        <button type="button" aria-expanded={open} aria-controls={`acc-${id}`} id={`acc-btn-${id}`} onClick={onOpen}>
          <span className="acc__code">{code}</span>
          <span className="acc__name">{name}</span>
          <span className="acc__chevron" aria-hidden="true" />
        </button>
      </h2>
      <div id={`acc-${id}`} role="region" aria-labelledby={`acc-btn-${id}`} className="acc__panel" inert={!open}>
        <div className="acc__inner">
          <PanelFull id={id} assets={assets} />
        </div>
      </div>
    </section>
  );
}
