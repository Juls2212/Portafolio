"use client";

import { useT } from "@/i18n/language-context";

export function SkipLink() {
  const t = useT();
  return (
    <a href="#content" className="skip-link">
      {t.a11y.skipToContent}
    </a>
  );
}
