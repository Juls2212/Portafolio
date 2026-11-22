"use client";

import { useT } from "@/i18n/language-context";
import { GLOBE_LABEL_COUNT, registerGlobeLabel } from "@/lib/globe-store";

/**
 * Three decorative labels with leader lines. The globe scene moves them (transform + opacity,
 * written imperatively each frame) so they stay attached to their nodes. Language changes only
 * swap the text; nothing here touches the canvas.
 */
export function GlobeLabels() {
  const t = useT();
  return (
    <div className="glabels" aria-hidden="true">
      {Array.from({ length: GLOBE_LABEL_COUNT }, (_, i) => (
        <div
          key={i}
          className="glabel"
          data-side="r"
          data-hot="false"
          ref={(el) => registerGlobeLabel(i, el)}
        >
          <span className="glabel__dot" />
          <span className="glabel__line" />
          <span className="glabel__text">{t.globe.nodes[i]}</span>
        </div>
      ))}
    </div>
  );
}
