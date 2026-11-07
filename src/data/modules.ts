import type { Localized } from "@/i18n/types";

export interface RoomModule {
  /** Matches the DOM id of the section that represents the module. */
  id: string;
  number: number;
  label: Localized;
}

export const modules = [
  { id: "room", number: 1, label: { es: "Sala", en: "Room" } },
  { id: "stack", number: 2, label: { es: "Stack", en: "Stack" } },
  { id: "projects", number: 3, label: { es: "Proyectos", en: "Projects" } },
  { id: "experience", number: 4, label: { es: "Experiencia", en: "Experience" } },
  { id: "contact", number: 5, label: { es: "Contacto", en: "Contact" } },
] as const satisfies readonly RoomModule[];

export type ModuleId = (typeof modules)[number]["id"];
