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
