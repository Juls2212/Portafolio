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
      es: "Juliana se caracteriza por su creatividad, dedicación y capacidad para llevar los conocimientos adquiridos en clase a proyectos prácticos. Su interés por explorar nuevas tecnologías y mejorar continuamente sus desarrollos refleja una actitud proactiva frente a su formación profesional y los desafíos del desarrollo de software.",
      en: "Juliana is characterized by her creativity, dedication and ability to bring the knowledge acquired in class into practical projects. Her interest in exploring new technologies and continuously improving her developments reflects a proactive attitude toward her professional training and the challenges of software development.",
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
      es: "Juliana demuestra compromiso, iniciativa y una actitud constante de aprendizaje. Durante su participación en actividades de investigación y desarrollo tecnológico, ha mostrado interés por proponer soluciones, asumir nuevos retos y fortalecer sus habilidades. Destaco especialmente su disposición para aplicar sus conocimientos en proyectos que integran tecnología e innovación.",
      en: "Juliana shows commitment, initiative and a constant attitude of learning. During her participation in research and technological development activities, she has shown interest in proposing solutions, taking on new challenges and strengthening her skills. I especially highlight her willingness to apply her knowledge in projects that integrate technology and innovation.",
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
