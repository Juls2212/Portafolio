"use client";

import { useRef } from "react";
import { LevelLabel } from "@/components/Hud";
import { AboutScreen } from "@/components/AboutScreen";
import { InterestsScreen } from "@/components/InterestsScreen";
import { PresentationScreen } from "@/components/PresentationScreen";
import { useParallax } from "@/hooks/useParallax";
import { useT } from "@/i18n/language-context";

/** Level 01: holographic room with three floating glass screens. */
export function HoloRoom() {
  const t = useT();
  const roomRef = useRef<HTMLElement>(null);
  useParallax(roomRef);

  return (
    <section id="room" ref={roomRef} className="room" aria-label={t.a11y.roomRegion}>
      <div className="room__bg" aria-hidden="true">
        <div className="room__glow" />
        <div className="floor-zone">
          <div className="horizon" />
          <div className="floor">
            <div className="floor__plane">
              <div className="floor__grid" />
            </div>
          </div>
        </div>
        <div className="scanlines" />
        <div className="scan-sweep" />
      </div>

      <div className="stage-wrap">
        <div className="stage">
          {/* DOM order = reading order; desktop placement is set in CSS via data-pos. */}
          <PresentationScreen />
          <AboutScreen />
          <InterestsScreen />
        </div>
      </div>
      <LevelLabel />
    </section>
  );
}
