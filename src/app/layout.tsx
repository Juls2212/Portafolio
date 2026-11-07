import type { Metadata } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { MatrixRain } from "@/components/MatrixRain";
import { LanguageProvider } from "@/i18n/language-context";
import { es } from "@/i18n/es";
import { INTRO_GATE_SCRIPT } from "@/lib/intro-gate";

export const metadata: Metadata = {
  title: es.meta.title,
  description: es.meta.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the gate script and the language store set <html> attributes before hydration.
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE_SCRIPT }} />
      </head>
      <body>
        <noscript>
          <style>{`.screen{opacity:1!important}.matrix-layer{display:none!important}`}</style>
        </noscript>
        <LanguageProvider>
          <MatrixRain />
          <div id="app-root">{children}</div>
        </LanguageProvider>
      </body>
    </html>
  );
}
