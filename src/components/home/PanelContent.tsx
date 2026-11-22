"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { cvPath, photo } from "@/data/assets";
import type { AssetAvailability } from "@/data/assets";
import { profile } from "@/data/profile";
import type { HomePanelId } from "@/data/home-panels";
import { useLang, useT } from "@/i18n/language-context";
import { AboutFacets } from "@/components/home/AboutFacets";
import { InterestsOrbit } from "@/components/home/InterestsOrbit";
import { TechTicker } from "@/components/home/TechTicker";
import { DecodeText } from "@/components/DecodeText";
import { enterExplore } from "@/lib/site-mode";

/** Full content of each home panel. Shown inline: there are no side dialogs. */
export function PanelFull({ id, assets }: { id: HomePanelId; assets: AssetAvailability }) {
  if (id === "presentation") return <PresentationFull cvAvailable={assets.cv} />;
  if (id === "about") return <AboutFull photoAvailable={assets.photo} />;
  return <InterestsFull />;
}

function PresentationFull({ cvAvailable }: { cvAvailable: AssetAvailability["cv"] }) {
  const t = useT();
  const { lang } = useLang();
  return (
    <div className="pfull pfull--presentation">
      {/* Decorative shell prompt: types itself when the panel becomes active (CSS). */}
      <p className="term-line depth-2" aria-hidden="true">
        <span className="term-line__ps1">juliana@portfolio:~$</span>
        <span className="term-line__cmd">whoami</span>
      </p>
      <p className="screen__eyebrow term-out depth-2">{t.presentation.eyebrow}</p>
      <h2 className="screen__hero hero term-out depth-1">
        <span className="hero__greeting">{t.presentation.greeting}</span>{" "}
        <span className="hero__name bg-linear-to-r from-neon via-neon-hi to-lime bg-clip-text text-transparent">
          <DecodeText text={profile.name} />
        </span>
      </h2>
      <p className="screen__role term-out depth-2">
        {t.presentation.role}
        <span className="scan-underline" aria-hidden="true" />
      </p>
      <p className="screen__text term-out depth-2">{t.presentation.tagline}</p>
      <div className="screen__actions term-out depth-1">
        {/* Anchor to #stack: without JS it simply scrolls there; with JS it plays the gate transition. */}
        <a
          href="#stack"
          data-start-button
          className="btn btn--primary"
          onClick={(event) => {
            event.preventDefault();
            enterExplore();
          }}
        >
          {t.presentation.start}
        </a>
        {/* The CV follows the active language; without the file the button stays disabled and tagged. */}
        {cvAvailable[lang] ? (
          <a href={cvPath(lang)} download className="btn btn--ghost">
            {t.presentation.downloadCv}
          </a>
        ) : (
          <button
            type="button"
            className="btn btn--ghost"
            aria-disabled="true"
            onClick={(event) => event.preventDefault()}
          >
            {t.presentation.downloadCv}
            <span className="btn__tbd">{t.common.tbd}</span>
          </button>
        )}
      </div>
      <div className="term-out depth-2">
        <TechTicker />
      </div>
    </div>
  );
}

function AboutFull({ photoAvailable }: { photoAvailable: boolean }) {
  const t = useT();
  return (
    <div className="pfull pfull--about">
      {/* The frame has the file's exact ratio (from the real size), so the photo is shown whole. */}
      <div className="about-frame depth-1">
        <p className="about-frame__label" aria-hidden="true">
          {t.about.profileLabel}
        </p>
        <span className="xhair xhair--tl" aria-hidden="true" />
        <span className="xhair xhair--tr" aria-hidden="true" />
        <span className="xhair xhair--bl" aria-hidden="true" />
        <span className="xhair xhair--br" aria-hidden="true" />
        <span className="about-frame__scan" aria-hidden="true" />
        <div className="about-photo" style={{ "--ar": photo.width / photo.height } as CSSProperties}>
          <div className="about-photo__inner">
            {photoAvailable ? (
              <Image
                src={photo.src}
                width={photo.width}
                height={photo.height}
                alt={t.about.photoAlt}
                sizes="(min-width: 768px) 16rem, 60vw"
                className="about-photo__img"
              />
            ) : (
              <div role="img" aria-label={t.about.photoAlt} className="placeholder-box about-photo__missing">
                {t.about.photoPlaceholder}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="pfull__col depth-2">
        <p className="screen__eyebrow">{t.about.eyebrow}</p>
        <h2 className="screen__title">{t.about.title}</h2>
        <AboutFacets />
      </div>
    </div>
  );
}

function InterestsFull() {
  const t = useT();
  return (
    <div className="pfull pfull--interests">
      <p className="screen__eyebrow depth-2">{t.interests.eyebrow}</p>
      <h2 className="screen__title depth-2">{t.interests.title}</h2>
      <div className="depth-1">
        <InterestsOrbit />
      </div>
    </div>
  );
}

/** Short teaser shown by inactive carousel panels. */
export function useTeaser(id: HomePanelId): { title: string; line: string; name: string } {
  const t = useT();
  if (id === "about") return { title: t.about.teaserTitle, line: t.about.teaserLine, name: t.about.title };
  if (id === "interests") {
    return { title: t.interests.teaserTitle, line: t.interests.teaserLine, name: t.interests.name };
  }
  return { title: profile.name, line: t.presentation.role, name: t.presentation.name };
}
