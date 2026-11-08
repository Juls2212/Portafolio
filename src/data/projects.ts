import { imageMeta } from "@/data/generated/image-meta";
import { keyById } from "@/data/technologies";
import type { Localized } from "@/i18n/types";

export interface ProjectImage {
  /** Path under /public. */
  src: string;
  /** Natural size of the original file: the frame uses exactly this aspect ratio. */
  width: number;
  height: number;
}

export interface Project {
  id: string;
  /** Proper name: never translated. */
  name: string;
  type: Localized;
  phrase: Localized;
  /** Written only from the facts supplied for the project. */
  description: Localized;
  image: ProjectImage;
  /** Technology ids; every id has a key on the keyboard. */
  techIds: readonly string[];
  repoUrl: string;
  credits?: readonly string[];
  /** Softened accent, used only for glow and small details over the green base. */
  accent: string;
  /** Internal flag: copy that still needs the owner's review. */
  reviewNote?: string;
}

/** Real file size comes from the generated sync data. A missing source falls back to a placeholder frame. */
function imageOf(file: string): ProjectImage {
  return imageMeta[file] ?? { src: `/projects/${file}`, width: 16, height: 9 };
}

export const projects: readonly Project[] = [
  {
    id: "bookshelf",
    name: "Bookshelf",
    type: { es: "Aplicación móvil", en: "Mobile app" },
    phrase: { es: "Biblioteca virtual con IA implementada", en: "Virtual library with built-in AI" },
    description: {
      es: "Aplicación móvil hecha con React Native y Expo, con base de datos en Supabase.",
      en: "A mobile app built with React Native and Expo, with a Supabase database.",
    },
    image: imageOf("bookshelf.jpeg"),
    techIds: ["react-native", "expo", "typescript", "supabase"],
    repoUrl: "https://github.com/Juls2212/Bookshelf",
    accent: "#C58B63",
  },
  {
    id: "ares",
    name: "Ares",
    type: { es: "Aplicación de escritorio", en: "Desktop app" },
    phrase: {
      es: "Asistente virtual minicerebro virtual",
      en: "Virtual assistant, a virtual mini-brain",
    },
    description: {
      es: "Asistente de escritorio hecho con Electron, con una interfaz de vidrio y un orbe. Usa PostgreSQL con Drizzle.",
      en: "A desktop assistant built with Electron, with a glass interface and an orb. It uses PostgreSQL with Drizzle.",
    },
    image: imageOf("ares.jpeg"),
    techIds: [
      "electron",
      "nodejs",
      "react",
      "typescript",
      "css",
      "postgresql",
      "docker",
      "vite",
      "drizzle-orm",
    ],
    repoUrl: "https://github.com/Juls2212/Ares",
    accent: "#7ED9C0",
    reviewNote: "Spanish phrase supplied as-is and pending review; the English version is a literal translation.",
  },
  {
    id: "presenta",
    name: "Presenta",
    type: { es: "Aplicación para smartwatch", en: "Smartwatch app" },
    phrase: {
      es: "Control de presentaciones por medio de Wear OS",
      en: "Presentation control through Wear OS",
    },
    description: {
      es: "Aplicación de reloj Wear OS que controla las diapositivas de un computador, con una aplicación complementaria para Windows.",
      en: "A Wear OS watch app that controls the slides on a computer, with a Windows companion app.",
    },
    image: imageOf("presenta.jpeg"),
    techIds: ["kotlin", "csharp", "android", "jetpack-compose", "dotnet", "sqlite"],
    repoUrl: "https://github.com/Juls2212/Presenta",
    accent: "#BCD7E6",
    reviewNote: "The 'Wear OS' wording in the phrase is pending review.",
  },
  {
    id: "quacktaclysm",
    name: "Quacktaclysm",
    type: { es: "Videojuego", en: "Video game" },
    phrase: { es: "Videojuego de patos", en: "A game about ducks" },
    description: {
      es: "Videojuego hecho en Godot, con un servicio de IA opcional en Python y FastAPI.",
      en: "A game built in Godot, with an optional AI service in Python and FastAPI.",
    },
    image: imageOf("juego.jpeg"),
    techIds: ["godot", "python", "fastapi", "git"],
    repoUrl: "https://github.com/Juls2212/Quacktaclysm",
    credits: ["Laura Sofia Escobar Cardenas"],
    accent: "#7C8FBF",
  },
  {
    id: "roast-vr",
    name: "Roast Coffee · VR Simulator",
    type: { es: "Simulador de realidad virtual", en: "Virtual reality simulator" },
    phrase: {
      es: "Simulador de VR para la enseñanza de tostado de café",
      en: "VR simulator for teaching coffee roasting",
    },
    description: {
      es: "Simulador hecho en Unity para Meta Quest 3.",
      en: "A simulator built in Unity for Meta Quest 3.",
    },
    image: imageOf("simulador.jpeg"),
    techIds: ["unity", "csharp"],
    repoUrl: "https://github.com/AlejandroEspana/TostadoCafe",
    credits: ["Daniers Alexander Solarte Limas"],
    accent: "#A9785A",
  },
  {
    id: "roast-web",
    name: "Roast Coffee · Web Platform",
    type: { es: "Plataforma web", en: "Web platform" },
    phrase: {
      es: "Plataforma web y servicios de Roast Coffee",
      en: "Roast Coffee web platform and services",
    },
    description: {
      es: "Panel web de tostado con autenticación, perfiles, roles y un tutor de IA.",
      en: "A roasting web panel with authentication, profiles, roles and an AI tutor.",
    },
    image: imageOf("cafeweb.jpeg"),
    techIds: [
      "react",
      "javascript",
      "html",
      "css",
      "java",
      "spring-boot",
      "postgresql",
      "python",
      "fastapi",
      "docker",
      "aws",
    ],
    repoUrl: "https://github.com/solartedaniers/Coffee_Roast_In_VR",
    credits: ["Daniers Alexander Solarte Limas"],
    accent: "#A9785A",
  },
];

for (const project of projects) {
  for (const id of project.techIds) {
    if (!keyById.has(id)) throw new Error(`Project "${project.id}" references unknown technology "${id}"`);
  }
}
