"use client";

import { useT } from "@/i18n/language-context";

/** Phase 3 replaces this with the projects gallery. */
export function ProjectsPlaceholder() {
  const t = useT();

  return (
    <section id="projects" className="projects-placeholder" aria-labelledby="projects-title">
      <p className="screen__eyebrow">{t.projects.eyebrow}</p>
      <h2 id="projects-title" className="screen__title">
        {t.projects.title}
      </h2>
      <p className="screen__text">{t.projects.body}</p>
    </section>
  );
}
