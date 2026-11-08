"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { keyById } from "@/data/technologies";
import type { Project } from "@/data/projects";
import { useLang, useT } from "@/i18n/language-context";

/** Wide images sit above their details; square and portrait ones sit beside them. */
export const projectLayout = (p: Project): "wide" | "side" =>
  p.image.width / p.image.height >= 1.5 ? "wide" : "side";

export function projectTitleId(project: Project) {
  return `project-${project.id}-title`;
}

const pad = (n: number) => String(n).padStart(2, "0");

interface ProjectDetailsProps {
  project: Project;
  /** Zero-based position in the list (shown as a large faint numeral). */
  index: number;
  /** The image file is not in /public: show a labeled placeholder frame instead. */
  imageMissing: boolean;
  /** Only the first project's image is eager. */
  priority?: boolean;
}

/** Shared by the 3D gallery and by the stacked cards (mobile, no-JS, reduced motion). */
export function ProjectDetails({ project, index, imageMissing, priority = false }: ProjectDetailsProps) {
  const t = useT();
  const { lang } = useLang();
  const { image } = project;
  const alt = `${t.projects.imageAlt} ${project.name}`;

  return (
    <>
      {/* The frame has exactly the image's natural aspect ratio: nothing is cropped. */}
      <div className="project__image" style={{ "--ar": image.width / image.height } as CSSProperties}>
        {imageMissing ? (
          <div role="img" aria-label={alt} className="project__image-missing">
            {t.projects.imageMissing}
          </div>
        ) : (
          <Image
            src={image.src}
            width={image.width}
            height={image.height}
            alt={alt}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            sizes="(min-width: 1100px) 36vw, (min-width: 640px) 50vw, 100vw"
            className="project__img"
          />
        )}
      </div>

      <div className="project__body">
        <div className="project__main">
          <span className="project__index" aria-hidden="true">
            {pad(index + 1)}
          </span>
          <p className="project__meta">
            <span>{project.type[lang]}</span>
            <span aria-hidden="true"> · </span>
            <span>
              {project.techIds.length} {t.projects.technologies}
            </span>
          </p>
          <h3 id={projectTitleId(project)} className="project__name">
            {project.name}
          </h3>
          <p className="project__phrase">{project.phrase[lang]}</p>
          <p className="project__desc">{project.description[lang]}</p>
        </div>

        <div className="project__side">
          <h4 className="project__techs-title">{t.projects.technologies}</h4>
          <ul className="project__techs">
            {project.techIds.map((id) => {
              const tech = keyById.get(id)?.tech;
              if (!tech) return null;
              return (
                <li key={id} className="tech-chip">
                  {tech.logo ? (
                    <span
                      className="tech-chip__logo"
                      aria-hidden="true"
                      style={{ "--logo": `url(${tech.logo})` } as CSSProperties}
                    />
                  ) : (
                    <span className="tech-chip__initials" aria-hidden="true">
                      {tech.initials}
                    </span>
                  )}
                  {tech.name}
                </li>
              );
            })}
          </ul>

          <div className="project__foot">
            <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="project__link">
              {t.projects.viewRepo}
              <span aria-hidden="true"> ↗</span>
              <span className="sr-only"> {t.projects.newTab}</span>
            </a>
            {project.credits && project.credits.length > 0 && (
              <p className="project__credits">
                <span className="project__credits-label">{t.projects.credits}</span>
                {project.credits.join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
