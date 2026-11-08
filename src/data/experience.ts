import type { Localized } from "@/i18n/types";

/**
 * Experience module content. The technical-work timeline is built from src/data/projects.ts
 * (single source of truth), so only academic cards and testimonials live here.
 */

export interface AcademicCard {
  id: string;
  /** Wide cards span two columns. */
  size: "wide" | "small";
  icon: "cap" | "globe" | "board" | "flask";
  title: Localized;
  subtitle?: Localized;
  /** Free text line. */
  detail?: Localized;
  /** Mono status line. */
  status?: Localized;
}

export const academicCards: readonly AcademicCard[] = [
  {
    id: "software-engineering",
    size: "wide",
    icon: "cap",
    title: { es: "Ingeniería de Software", en: "Software Engineering" },
    subtitle: {
      es: "Universidad Cooperativa de Colombia · Campus Pasto",
      en: "Universidad Cooperativa de Colombia · Campus Pasto",
    },
    status: { es: "En curso", en: "In progress" },
  },
  {
    id: "english",
    size: "small",
    icon: "globe",
    title: { es: "Inglés", en: "English" },
    status: { es: "Nivel B2", en: "B2 level" },
  },
  {
    id: "teaching-assistant",
    size: "small",
    icon: "board",
    title: { es: "Monitora académica", en: "Academic teaching assistant" },
    subtitle: { es: "2025-2", en: "2025-2" },
    detail: { es: "Apoyo a la facultad.", en: "Support for the faculty." },
  },
  {
    id: "research-seedbed",
    size: "small",
    icon: "flask",
    title: { es: "Semillero de investigación", en: "Research seedbed" },
    detail: {
      es: "Desde 2026-1 · participación en encuentros semilleristas.",
      en: "Since 2026-1 · took part in seedbed meetings.",
    },
  },
];

export interface Testimonial {
  id: string;
  /** Proper name (never translated) or a placeholder. */
  author: Localized;
  role: Localized;
  quote: Localized;
  /**
   * DRAFT FLAG. While true the testimonial shows a visible "pending approval" tag. The people quoted
   * review and edit these texts before they are final: never flip it to false without their approval.
   */
  pendingApproval: boolean;
}

export const testimonials: readonly Testimonial[] = [
  {
    id: "revelo",
    author: { es: "Luis Carlos Revelo Tovar", en: "Luis Carlos Revelo Tovar" },
    role: { es: "Docente · Magíster en Software Libre", en: "Professor · Master in Free Software" },
    quote: {
      es: "Juliana se distingue por su curiosidad y por la claridad con la que plantea sus dudas. Mantiene una comunicación constante y se nota su interés por aprender y mejorar cada proyecto.",
      en: "Juliana stands out for her curiosity and for how clearly she raises her questions. She keeps in constant communication, and her drive to learn and improve every project shows.",
    },
    pendingApproval: true,
  },
  {
    id: "arteaga",
    author: { es: "Daniel Fernando Arteaga", en: "Daniel Fernando Arteaga" },
    role: {
      es: "Docente y asesor de semillero · Ingeniero de Sistemas, Magíster en Ingeniería Computacional, Especialista en Seguridad de la Información",
      en: "Professor and seedbed advisor · Systems Engineer, MSc in Computational Engineering, Specialist in Information Security",
    },
    quote: {
      es: "He trabajado con Juliana en proyectos del semillero. Es responsable, aporta ideas y se nota su interés por la ciberseguridad y por construir soluciones bien pensadas.",
      en: "I have worked with Juliana on seedbed projects. She is responsible, contributes ideas, and her interest in cybersecurity and in building well-thought-out solutions is clear.",
    },
    pendingApproval: true,
  },
  {
    // Still a placeholder: not a draft of real words, so no approval tag.
    id: "pending",
    author: { es: "[Nombre por definir]", en: "[Name to be defined]" },
    role: { es: "[Cargo por definir]", en: "[Role to be defined]" },
    quote: { es: "[Testimonio por definir]", en: "[Testimonial to be defined]" },
    pendingApproval: false,
  },
];
