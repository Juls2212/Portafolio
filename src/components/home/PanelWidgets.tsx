import type { CSSProperties } from "react";
import { useT } from "@/i18n/language-context";

/**
 * Four small decorative tags that straddle the edges of the active panel (desktop only, CSS hides
 * them elsewhere): bars, a hex string, a ring gauge and a leader line with a short label.
 * They display nothing real: purely ornamental, aria-hidden, transform/opacity animations only.
 */
const HEX = "7F3A 9C1E B204 5D68 E1F7 03AC 48D2 96B5 ";

export function PanelWidgets() {
  const t = useT();
  return (
    <div className="pwidgets" aria-hidden="true">
      <div className="pw pw--bars">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} style={{ "--k": i } as CSSProperties} />
        ))}
      </div>
      <div className="pw pw--hex">
        <span className="pw__hex-track">
          {HEX}
          {HEX}
        </span>
      </div>
      <div className="pw pw--ring">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" className="pw__ring-base" />
          <circle cx="12" cy="12" r="9" className="pw__ring-arc" />
        </svg>
      </div>
      <div className="pw pw--leader">
        <span className="pw__line" />
        <span className="pw__label">{t.home.widgetLabel}</span>
      </div>
    </div>
  );
}
