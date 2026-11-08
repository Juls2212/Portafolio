"use client";

import { academicCards } from "@/data/experience";
import { modules } from "@/data/modules";
import { useLang, useT } from "@/i18n/language-context";
import { Testimonials } from "@/components/experience/Testimonials";

const pad = (n: number) => String(n).padStart(2, "0");
const moduleNumber = pad(modules.find((m) => m.id === "experience")?.number ?? 0);

function CardIcon({ kind }: { kind: "cap" | "globe" | "board" | "flask" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="academic__icon">
      {kind === "cap" && <path d="M2 9l10-5 10 5-10 5L2 9zm4 3.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-3.5M22 9v6" />}
      {kind === "globe" && (
        <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3zM3.5 9h17M3.5 15h17" />
      )}
      {kind === "board" && <path d="M3 4h18v12H3zM8 20l4-4 4 4M7 8h10M7 12h6" />}
      {kind === "flask" && <path d="M9 3h6M10 3v6L4.5 18.5A1.5 1.5 0 005.8 21h12.4a1.5 1.5 0 001.3-2.5L14 9V3M7.5 15h9" />}
    </svg>
  );
}

/** Module 04: academic background (four cards) and testimonials. */
export function ExperienceSection() {
  const t = useT();
  const { lang } = useLang();

  return (
    <section id="experience" className="experience" aria-labelledby="experience-title">
      <div className="experience__inner">
        <header className="exp-head">
          <span className="exp-head__numeral" aria-hidden="true">
            {moduleNumber}
          </span>
          <div className="exp-head__titles">
            <p className="exp-head__label">{moduleNumber} —</p>
            <h2 id="experience-title" className="exp-head__title">
              {t.experience.title}
            </h2>
          </div>
        </header>
        <hr className="exp-rule" />

        <ul className="academic-grid">
          {academicCards.map((card) => (
            <li key={card.id} className="academic" data-size={card.size}>
              <span className="academic__tile">
                <CardIcon kind={card.icon} />
              </span>
              <div>
                <h3 className="academic__title">{card.title[lang]}</h3>
                {card.subtitle && <p className="academic__sub">{card.subtitle[lang]}</p>}
                {card.detail && <p className="academic__detail">{card.detail[lang]}</p>}
                {card.status && <p className="academic__status">{card.status[lang]}</p>}
              </div>
            </li>
          ))}
        </ul>

        <Testimonials />
      </div>
    </section>
  );
}
