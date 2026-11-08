import type { Localized } from "@/i18n/types";

export const KEYBOARD_ROWS = 7;
export const KEYBOARD_COLS = 6;

export type TechCategoryId = "framework" | "language" | "cloud" | "database" | "tool";

export const techCategories: Record<TechCategoryId, Localized> = {
  framework: { es: "Frameworks y librerías", en: "Frameworks and libraries" },
  language: { es: "Lenguajes", en: "Languages" },
  cloud: { es: "Nube y DevOps", en: "Cloud and DevOps" },
  database: { es: "Bases de datos", en: "Databases" },
  tool: { es: "Herramientas y motores", en: "Tools and engines" },
};

export interface Technology {
  id: string;
  /** Proper name: never translated. */
  name: string;
  categoryId: TechCategoryId;
  category: Localized;
  /** One factual sentence. Says nothing about proficiency. */
  description: Localized;
  keyColor: string;
  /** Flat engraving color, chosen for contrast against keyColor. */
  logoColor: string;
  /** Local SVG, or null when no usable logo exists (initials are shown instead). */
  logo: string | null;
  initials: string;
}

/** Ids whose logo is unavailable. Rendered as clearly marked initials, never as an invented logo. */
const MISSING_LOGOS: ReadonlySet<string> = new Set<string>();

const LIGHT = "#FFFFFF";
const DARK = "#08140F";

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** White or dark, whichever has the higher contrast ratio on the key color. */
function pickLogoColor(keyColor: string): string {
  const l = luminance(keyColor);
  const onLight = 1.05 / (l + 0.05);
  const onDark = (l + 0.05) / (luminance(DARK) + 0.05);
  return onLight >= onDark ? LIGHT : DARK;
}

function initialsOf(name: string): string {
  const words = name.replace(/\./g, "").split(/\s+/);
  return (words.length > 1 ? words.map((w) => w[0]).join("") : name.slice(0, 2)).slice(0, 3);
}

function tech(
  id: string,
  name: string,
  categoryId: TechCategoryId,
  keyColor: string,
  es: string,
  en: string,
): Technology {
  return {
    id,
    name,
    categoryId,
    category: techCategories[categoryId],
    description: { es, en },
    keyColor,
    logoColor: pickLogoColor(keyColor),
    logo: MISSING_LOGOS.has(id) ? null : `/logos/${id}.svg`,
    initials: initialsOf(name),
  };
}

/** Order = reading order on the keyboard (arrow cells are skipped). */
export const technologies: readonly Technology[] = [
  tech("react", "React", "framework", "#61DAFB",
    "Biblioteca de JavaScript para construir interfaces de usuario a partir de componentes reutilizables.",
    "A JavaScript library for building user interfaces from reusable components."),
  tech("nextjs", "Next.js", "framework", "#111111",
    "Framework de React para aplicaciones web con renderizado en servidor y generación estática.",
    "A React framework for server-rendered and statically generated web applications."),
  tech("spring-boot", "Spring Boot", "framework", "#6DB33F",
    "Framework de Java para crear aplicaciones Spring listas para producción con configuración mínima.",
    "A Java framework for creating production-ready Spring applications with minimal configuration."),
  tech("nestjs", "NestJS", "framework", "#E0234E",
    "Framework progresivo de Node.js para construir aplicaciones de servidor escalables con TypeScript.",
    "A progressive Node.js framework for building scalable server-side applications with TypeScript."),
  tech("fastapi", "FastAPI", "framework", "#009688",
    "Framework web moderno de Python para construir APIs a partir de anotaciones de tipos.",
    "A modern Python web framework for building APIs from type hints."),
  tech("django", "Django", "framework", "#092E20",
    "Framework web de alto nivel en Python que favorece un desarrollo rápido y limpio.",
    "A high-level Python web framework that encourages rapid, clean development."),
  tech("react-native", "React Native", "framework", "#20232A",
    "Framework para crear aplicaciones móviles nativas usando React.",
    "A framework for building native mobile apps using React."),
  tech("expo", "Expo", "framework", "#1C2024",
    "Plataforma y herramientas para desarrollar, compilar y publicar aplicaciones de React Native.",
    "A platform and set of tools for developing, building and deploying React Native apps."),
  tech("tailwindcss", "Tailwind CSS", "framework", "#06B6D4",
    "Framework de CSS basado en clases utilitarias para crear diseños a medida directamente en el marcado.",
    "A utility-first CSS framework for building custom designs directly in markup."),
  tech("electron", "Electron", "framework", "#47848F",
    "Framework para crear aplicaciones de escritorio multiplataforma con tecnologías web.",
    "A framework for building cross-platform desktop apps with web technologies."),
  tech("nodejs", "Node.js", "framework", "#5FA04E",
    "Entorno de ejecución de JavaScript basado en el motor V8 de Chrome para ejecutar código fuera del navegador.",
    "A JavaScript runtime built on the V8 engine of Chrome for running code outside the browser."),
  tech("dotnet", ".NET", "framework", "#512BD4",
    "Plataforma de desarrollo gratuita y multiplataforma para crear distintos tipos de aplicaciones.",
    "A free, cross-platform developer platform for building many kinds of applications."),
  tech("android", "Android", "framework", "#3DDC84",
    "Sistema operativo móvil de código abierto de Google y plataforma de aplicaciones.",
    "The open-source mobile operating system and app platform from Google."),
  tech("jetpack-compose", "Jetpack Compose", "framework", "#4285F4",
    "Kit de herramientas declarativo de Android para crear interfaces de usuario nativas.",
    "A modern declarative toolkit from Android for building native user interfaces."),
  tech("typescript", "TypeScript", "language", "#3178C6",
    "Superconjunto tipado de JavaScript que se compila a JavaScript estándar.",
    "A typed superset of JavaScript that compiles to plain JavaScript."),
  tech("javascript", "JavaScript", "language", "#F7DF1E",
    "El lenguaje de programación de la web, usado en páginas interactivas y en código de servidor.",
    "The programming language of the web, used for interactive pages and server-side code."),
  tech("python", "Python", "language", "#3776AB",
    "Lenguaje de propósito general conocido por su sintaxis legible y su amplio ecosistema.",
    "A general-purpose language known for its readable syntax and broad ecosystem."),
  tech("java", "Java", "language", "#ED8B00",
    "Lenguaje orientado a objetos de propósito general que se ejecuta en la máquina virtual de Java.",
    "A general-purpose, object-oriented language that runs on the Java Virtual Machine."),
  tech("kotlin", "Kotlin", "language", "#7F52FF",
    "Lenguaje moderno de tipado estático que corre en la JVM y es oficial para el desarrollo en Android.",
    "A modern, statically typed language that runs on the JVM and is official for Android development."),
  tech("csharp", "C#", "language", "#239120",
    "Lenguaje moderno orientado a objetos desarrollado por Microsoft para la plataforma .NET.",
    "A modern, object-oriented language developed by Microsoft for the .NET platform."),
  tech("html", "HTML", "language", "#E34F26",
    "El lenguaje de marcado estándar para estructurar contenido en la web.",
    "The standard markup language for structuring content on the web."),
  tech("css", "CSS", "language", "#663399",
    "El lenguaje de hojas de estilo usado para describir la presentación de documentos web.",
    "The style sheet language used to describe the presentation of web documents."),
  tech("aws", "AWS", "cloud", "#FF9900",
    "Plataforma en la nube de Amazon que ofrece servicios de cómputo, almacenamiento, bases de datos y redes.",
    "The cloud platform from Amazon offering computing, storage, database and networking services."),
  tech("azure", "Microsoft Azure", "cloud", "#0078D4",
    "Plataforma en la nube de Microsoft para crear, ejecutar y administrar aplicaciones y servicios.",
    "The cloud platform from Microsoft for building, running and managing applications and services."),
  tech("docker", "Docker", "cloud", "#2496ED",
    "Plataforma para empaquetar y ejecutar aplicaciones en contenedores ligeros.",
    "A platform for packaging and running applications in lightweight containers."),
  tech("linux", "Linux", "cloud", "#FCC624",
    "Núcleo de sistema operativo de código abierto tipo Unix, muy usado en servidores y dispositivos.",
    "An open-source, Unix-like operating system kernel widely used on servers and devices."),
  tech("git", "Git", "cloud", "#F05032",
    "Sistema de control de versiones distribuido para seguir los cambios en el código fuente.",
    "A distributed version control system for tracking changes in source code."),
  tech("postgresql", "PostgreSQL", "database", "#4169E1",
    "Base de datos relacional de código abierto conocida por su cumplimiento de estándares y su extensibilidad.",
    "An open-source relational database known for its standards compliance and extensibility."),
  tech("mysql", "MySQL", "database", "#4479A1",
    "Sistema de gestión de bases de datos relacionales de código abierto muy extendido.",
    "A widely used open-source relational database management system."),
  tech("supabase", "Supabase", "database", "#3FCF8E",
    "Plataforma backend de código abierto basada en PostgreSQL, con autenticación y almacenamiento.",
    "An open-source backend platform built around PostgreSQL, with authentication and storage."),
  tech("sqlite", "SQLite", "database", "#003B57",
    "Motor de base de datos SQL ligero y sin servidor que se guarda en un único archivo.",
    "A lightweight, serverless SQL database engine stored in a single file."),
  tech("drizzle-orm", "Drizzle ORM", "database", "#C5F74F",
    "ORM de TypeScript para bases de datos SQL con un constructor de consultas de tipado seguro.",
    "A TypeScript ORM for SQL databases with a type-safe query builder."),
  tech("postman", "Postman", "tool", "#FF6C37",
    "Plataforma para diseñar, probar y documentar APIs.",
    "A platform for designing, testing and documenting APIs."),
  tech("swagger", "Swagger", "tool", "#85EA2D",
    "Conjunto de herramientas para diseñar y documentar APIs basado en la especificación OpenAPI.",
    "A set of tools for designing and documenting APIs based on the OpenAPI Specification."),
  tech("unity", "Unity", "tool", "#F2F2F2",
    "Motor de videojuegos multiplataforma para crear experiencias 2D, 3D, AR y VR.",
    "A cross-platform game engine for building 2D, 3D, AR and VR experiences."),
  tech("godot", "Godot", "tool", "#478CBF",
    "Motor de videojuegos libre y de código abierto para juegos 2D y 3D.",
    "A free, open-source game engine for 2D and 3D games."),
  tech("blender", "Blender", "tool", "#E87D0D",
    "Suite libre y de código abierto de creación 3D para modelado, animación y renderizado.",
    "A free, open-source 3D creation suite for modeling, animation and rendering."),
  tech("vite", "Vite", "tool", "#9135FF",
    "Herramienta de compilación y servidor de desarrollo frontend rápidos.",
    "A fast frontend build tool and development server."),
];

export type ArrowDirection = "up" | "down" | "left" | "right";

export interface KeyDef {
  id: string;
  kind: "tech" | "arrow";
  row: number;
  col: number;
  /** Present for kind "tech". */
  tech?: Technology;
  /** Present for kind "arrow". */
  direction?: ArrowDirection;
}

/** Inverted-T arrow cluster at the bottom right. */
const ARROW_CELLS: readonly { direction: ArrowDirection; row: number; col: number }[] = [
  { direction: "up", row: 5, col: 4 },
  { direction: "left", row: 6, col: 3 },
  { direction: "down", row: 6, col: 4 },
  { direction: "right", row: 6, col: 5 },
];

function buildKeys(): KeyDef[] {
  const keys: KeyDef[] = ARROW_CELLS.map((a) => ({
    id: `arrow-${a.direction}`,
    kind: "arrow",
    row: a.row,
    col: a.col,
    direction: a.direction,
  }));
  const taken = new Set(keys.map((k) => `${k.row}:${k.col}`));
  let next = 0;
  for (let row = 0; row < KEYBOARD_ROWS; row++) {
    for (let col = 0; col < KEYBOARD_COLS; col++) {
      if (taken.has(`${row}:${col}`)) continue;
      const t = technologies[next++];
      if (t) keys.push({ id: t.id, kind: "tech", row, col, tech: t });
    }
  }
  if (next !== technologies.length || keys.length !== KEYBOARD_ROWS * KEYBOARD_COLS) {
    throw new Error("Keyboard layout does not match the technologies list");
  }
  return keys.sort((a, b) => a.row - b.row || a.col - b.col);
}

/** All 42 keys (38 technologies + 4 arrows), sorted row-major. Scene and DOM both read this. */
export const keyboardKeys: readonly KeyDef[] = buildKeys();

export const keyById: ReadonlyMap<string, KeyDef> = new Map(keyboardKeys.map((k) => [k.id, k]));
