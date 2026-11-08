"use client";

import { useRef } from "react";
import { LevelLabel } from "@/components/Hud";
import { HomeStage } from "@/components/home/HomeStage";
import type { AssetAvailability } from "@/data/assets";
import { useParallax } from "@/hooks/useParallax";
import { useT } from "@/i18n/language-context";
import { useResetCount } from "@/lib/site-mode";

/** Level 01: holographic room with three floating glass screens. */
export function HoloRoom({ assets }: { assets: AssetAvailability }) {
  const t = useT();
  const roomRef = useRef<HTMLElement>(null);
  useParallax(roomRef);
  const resetCount = useResetCount();

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

      <HomeStage key={resetCount} assets={assets} />
      <LevelLabel />
    </section>
  );
}
