import { existsSync } from "node:fs";
import path from "node:path";
import { ProjectsGallery } from "@/components/projects/ProjectsGallery";
import { projects } from "@/data/projects";

/**
 * Server component: checks at build time which project images exist in /public so a
 * missing file becomes a labeled placeholder frame instead of a broken image.
 */
export function ProjectsSection() {
  const missing = projects
    .filter((p) => !existsSync(path.join(process.cwd(), "public", p.image.src)))
    .map((p) => p.id);
  return <ProjectsGallery missingImages={missing} />;
}
