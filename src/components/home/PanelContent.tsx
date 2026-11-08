"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { cvPath, photo } from "@/data/assets";
import type { AssetAvailability } from "@/data/assets";
import { profile } from "@/data/profile";
import type { HomePanelId } from "@/data/home-panels";
import { useLang, useT } from "@/i18n/language-context";
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
      <p className="screen__eyebrow">{t.presentation.eyebrow}</p>
      <h2 className="screen__hero">
        {t.presentation.greeting}{" "}
        <span className="bg-linear-to-r from-neon via-neon-hi to-lime bg-clip-text text-transparent">
          {profile.name}
        </span>
      </h2>
      <p className="screen__role">{t.presentation.role}</p>
      <p className="screen__text">{t.presentation.tagline}</p>
      <div className="screen__actions">
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
    </div>
  );
}

function AboutFull({ photoAvailable }: { photoAvailable: boolean }) {
  const t = useT();
  return (
    <div className="pfull pfull--about">
      {/* The frame has the file's exact ratio (from the real size), so the photo is shown whole. */}
      <div className="about-photo" style={{ "--ar": photo.width / photo.height } as CSSProperties}>
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
      <div className="pfull__col">
        <p className="screen__eyebrow">{t.about.eyebrow}</p>
        <h2 className="screen__title">{t.about.title}</h2>
        <p className="screen__text about-text">{t.about.text}</p>
      </div>
    </div>
  );
}

function InterestsFull() {
  const t = useT();
  return (
    <div className="pfull pfull--interests">
      <p className="screen__eyebrow">{t.interests.eyebrow}</p>
      <h2 className="screen__title">{t.interests.title}</h2>
      <ul className="interest-grid">
        {t.interests.items.map((item, index) => (
          <li key={item.label} data-highlight={index === 0}>
            <h3>{item.label}</h3>
            <p>{item.detail}</p>
          </li>
        ))}
      </ul>
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
