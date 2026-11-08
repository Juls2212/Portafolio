# Juliana Peñafiel – Portfolio

Immersive "hacker command center" portfolio. Phase 1 of 4: base environment (intro rain, holographic room, HUD, ES/EN).

Stack: Next.js (App Router), TypeScript (strict), Tailwind CSS v4. Fonts via npm (`@fontsource-variable`).

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

## Structure

- `src/app/` – layout, page, global styles and design tokens (`@theme`).
- `src/components/` – MatrixRain, Hud, LanguageToggle, HoloRoom, screens, SideDialog.
- `src/i18n/` – typed dictionaries (`es.ts`, `en.ts` satisfy `Dictionary`) and `useT()` / `useLang()`.
- `src/data/` – modules list and profile data (localized fields: `{ es, en }`).
- `src/lib/` – intro rain state and the pre-paint gate script.
- `src/hooks/` – pointer parallax (CSS variables only).

All real content other than the name, role and tagline is a bracketed placeholder.

## Phase 2: 3D keyboard

- `src/components/keyboard/` – lazy WebGL scene (one InstancedMesh for caps, logo atlas), DOM key grid, panel, orb.
- `src/data/technologies.ts` (keys + grid positions), `src/data/poses.ts` (pose per module).
- `src/lib/keyboard-store.ts` – selection state and the `keyboardApi.raiseKeys / lowerAll` hook for phase 3.
- Logos live in `public/logos/`, produced by `node scripts/sync-logos.mjs` (simple-icons, plus devicon for Java, C#, Azure and AWS).

## Phase 3 / 3.5: introduction, projects, experience, contact (6 modules)

- `src/data/projects.ts` – the six projects (localized fields, tech ids validated against the keyboard keys). Images live in `public/projects/`.
- `src/components/projects/` – pinned 3D gallery (scroll sentinels + `keyboardApi.raiseKeys`) and stacked cards (mobile, no-JS, reduced motion).
- `src/data/contact.ts` – `CONTACT_EMAIL` (empty until defined; the form's submit stays disabled).
