"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
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

/** Three testimonial cards. They reveal once, with a small stagger, when the block enters the viewport. */
export function Testimonials() {
  const t = useT();
  const { lang } = useLang();
  const ref = useRef<HTMLUListElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <h3 className="experience__sub">{t.experience.testimonialsTitle}</h3>
      <ul ref={ref} className="t-grid" data-revealed={revealed}>
        {testimonials.map((item, i) => (
          <li
            key={item.id}
            className="t-card"
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
