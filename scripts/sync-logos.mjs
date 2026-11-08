// Setup script: copies technology logos into public/logos (run once, outputs are committed).
//   node scripts/sync-logos.mjs
// Sources: simple-icons (npm devDependency) for most logos; devicon (MIT, pinned version,
// fetched once from jsDelivr and stored locally) for the four that simple-icons no longer ships.
import { mkdir, writeFile } from "node:fs/promises";
import * as si from "simple-icons";

const SIMPLE_ICONS = {
  react: "react", "react-native": "react", nextjs: "nextdotjs", "spring-boot": "springboot",
  nestjs: "nestjs", fastapi: "fastapi", django: "django", expo: "expo", tailwindcss: "tailwindcss",
  electron: "electron", nodejs: "nodedotjs", dotnet: "dotnet", android: "android",
  "jetpack-compose": "jetpackcompose", typescript: "typescript", javascript: "javascript",
  python: "python", kotlin: "kotlin", html: "html5", css: "css", docker: "docker", linux: "linux",
  git: "git", postgresql: "postgresql", mysql: "mysql", supabase: "supabase", sqlite: "sqlite",
  "drizzle-orm": "drizzle", postman: "postman", swagger: "swagger", unity: "unity",
  godot: "godotengine", blender: "blender", vite: "vite",
};

const DEVICON_VERSION = "2.16.0";
const DEVICON = {
  java: "java/java-plain",
  csharp: "csharp/csharp-plain",
  azure: "azure/azure-plain",
  aws: "amazonwebservices/amazonwebservices-plain-wordmark",
};

await mkdir("public/logos", { recursive: true });

for (const [id, slug] of Object.entries(SIMPLE_ICONS)) {
  const icon = si["si" + slug[0].toUpperCase() + slug.slice(1)];
  if (!icon) throw new Error(`simple-icons has no "${slug}"`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="256" height="256"><path d="${icon.path}"/></svg>\n`;
  await writeFile(`public/logos/${id}.svg`, svg);
  console.log(id.padEnd(16), "simple-icons", icon.hex);
}

for (const [id, path] of Object.entries(DEVICON)) {
  const res = await fetch(`https://cdn.jsdelivr.net/npm/devicon@${DEVICON_VERSION}/icons/${path}.svg`);
  if (!res.ok) throw new Error(`devicon ${path}: ${res.status}`);
  const svg = (await res.text()).replace(/<svg /, '<svg width="256" height="256" ');
  await writeFile(`public/logos/${id}.svg`, svg);
  console.log(id.padEnd(16), "devicon", DEVICON_VERSION);
}
