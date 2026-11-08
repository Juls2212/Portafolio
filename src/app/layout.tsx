import type { Metadata } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { MatrixRain } from "@/components/MatrixRain";
import { SiteModeBridge } from "@/components/SiteModeBridge";
import { LanguageProvider } from "@/i18n/language-context";
import { es } from "@/i18n/es";
import { INTRO_GATE_SCRIPT } from "@/lib/intro-gate";

export const metadata: Metadata = {
  title: es.meta.title,
  description: es.meta.description,
  openGraph: {
    title: es.meta.title,
    description: es.meta.description,
    type: "website",
    locale: "es",
    alternateLocale: ["en"],
  },
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
          <style>{`.screen{opacity:1!important}.matrix-layer{display:none!important}.acc__panel{grid-template-rows:1fr!important;opacity:1!important}.t-card{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <LanguageProvider>
          <MatrixRain />
          <SiteModeBridge />
          <div id="app-root">{children}</div>
        </LanguageProvider>
      </body>
    </html>
  );
}
