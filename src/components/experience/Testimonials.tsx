"use client";

import type { CSSProperties } from "react";
import { DecodeText } from "@/components/DecodeText";
import { testimonials } from "@/data/experience";
import { useLang, useT } from "@/i18n/language-context";

const ACCENTS = ["neon", "teal", "lime"] as const;

/** Monogram: initials of the first two words; placeholders get a neutral mark. */
function initials(name: string): string {
  if (name.startsWith("[")) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

/** Three testimonial cards (depth reveal and tilt come from data-reveal / the shared ambient listener). */
export function Testimonials() {
  const t = useT();
  const { lang } = useLang();
  return (
    <>
      <h3 className="experience__sub">
        <DecodeText text={t.experience.testimonialsTitle} />
      </h3>
      <ul className="t-grid">
        {testimonials.map((item, i) => (
          <li
            key={item.id}
            className="t-card"
            data-reveal
            data-accent={ACCENTS[i % ACCENTS.length]}
            style={{ "--i": i } as CSSProperties}
          >
            <figure>
              <span className="t-card__mark" aria-hidden="true">
                “
              </span>
              {item.pendingApproval && <p className="testimonial__tag">{t.experience.pendingApproval}</p>}
              <blockquote className="t-card__quote">{item.quote[lang]}</blockquote>
              <figcaption className="t-card__who">
                <span className="t-card__avatar" aria-hidden="true">
                  {initials(item.author[lang])}
                </span>
                <span>
                  <span className="t-card__name">{item.author[lang]}</span>
                  <span className="t-card__role">{item.role[lang]}</span>
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </>
  );
}
