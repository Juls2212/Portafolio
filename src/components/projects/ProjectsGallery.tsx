"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { ProjectDetails, projectLayout, projectTitleId } from "@/components/projects/ProjectDetails";
import { projects } from "@/data/projects";
import { useKeyboardMode } from "@/hooks/useKeyboardMode";
import { useT } from "@/i18n/language-context";
import { useActiveModule } from "@/lib/active-module";
import { keyboardApi } from "@/lib/keyboard-store";
import { useResetCount } from "@/lib/site-mode";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The full list is always rendered (server and no-JS get stacked cards). In 3D mode it becomes a
 * one-viewport stage whose project changes only through the arrows, the marks and Left/Right keys.
 */
export function ProjectsGallery({ missingImages }: { missingImages: readonly string[] }) {
  const mode = useKeyboardMode();
  const resetCount = useResetCount();
  const missing = new Set(missingImages);
  return (
    <section id="projects" className="projects" data-mode={mode} aria-labelledby="projects-title">
      {mode === "3d" ? <ProjectStage key={resetCount} missing={missing} /> : <ProjectCards missing={missing} />}
    </section>
  );
}

function Heading() {
  const t = useT();
  return (
    <header className="projects__head">
      <p className="screen__eyebrow">{t.projects.eyebrow}</p>
      <h2 id="projects-title" className="screen__title">
        {t.projects.title}
      </h2>
    </header>
  );
}

function ProjectCards({ missing }: { missing: ReadonlySet<string> }) {
  const t = useT();
  return (
    <div className="projects__cards">
      <Heading />
      <ol className="projects__list" aria-label={t.projects.listLabel}>
        {projects.map((project, index) => (
          <li key={project.id} className="project" style={{ "--accent": project.accent } as CSSProperties}>
            <article aria-labelledby={projectTitleId(project)}>
              <ProjectDetails
                project={project}
                index={index}
                imageMissing={missing.has(project.id)}
                priority={index === 0}
              />
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

function ProjectStage({ missing }: { missing: ReadonlySet<string> }) {
  const t = useT();
  const moduleId = useActiveModule();
  // The component stays mounted, so this also remembers the last viewed project.
  const [active, setActive] = useState(0);
  const inProjects = moduleId === "projects";

  const goTo = (index: number) => setActive(Math.max(0, Math.min(projects.length - 1, index)));

  // Keyboard state is a pure function of (is Projects active, current project): the raised set is
  // re-derived on every change, whatever the scroll position, and cleared when the section is left.
  useEffect(() => {
    const project = projects[active];
    keyboardApi.setRaised(inProjects && project ? project.techIds : []);
  }, [active, inProjects]);
  useEffect(() => () => keyboardApi.lowerAll(), []);

  // Left / Right keys, only while this module is active. Wheel and touch scrolling are untouched.
  useEffect(() => {
    if (!inProjects) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isEditable(event.target)) return;
      if (event.key === "ArrowRight") setActive((i) => Math.min(projects.length - 1, i + 1));
      else if (event.key === "ArrowLeft") setActive((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inProjects]);

  return (
    <div className="projects__stage">
      <div className="projects__col">
        <Heading />

        <div className="projects__exhibits">
          {projects.map((project, index) => (
            <article
              key={project.id}
              className="exhibit"
              data-active={index === active}
              data-layout={projectLayout(project)}
              inert={index !== active}
              aria-labelledby={projectTitleId(project)}
              style={{ "--accent": project.accent } as CSSProperties}
            >
              <ProjectDetails
                project={project}
                index={index}
                imageMissing={missing.has(project.id)}
                priority={index === 0}
              />
            </article>
          ))}
        </div>

        <div className="projects__controls">
          <p className="projects__counter" aria-live="polite">
            {pad(active + 1)} / {pad(projects.length)}
          </p>
          <div className="projects__arrows">
            <button
              type="button"
              className="arrow-btn"
              aria-label={t.projects.previous}
              disabled={active === 0}
              onClick={() => goTo(active - 1)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              className="arrow-btn"
              aria-label={t.projects.next}
              disabled={active === projects.length - 1}
              onClick={() => goTo(active + 1)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <nav aria-label={t.projects.progressLabel}>
            <ol className="projects__marks">
              {projects.map((project, index) => (
                <li key={project.id}>
                  <button
                    type="button"
                    className="mark"
                    aria-label={`${t.projects.goTo} ${index + 1}: ${project.name}`}
                    aria-current={index === active ? "true" : undefined}
                    onClick={() => goTo(index)}
                  />
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
    </div>
  );
}
