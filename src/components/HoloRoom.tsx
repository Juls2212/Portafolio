"use client";

import { LevelLabel } from "@/components/Hud";
import { HomeStage } from "@/components/home/HomeStage";
import type { AssetAvailability } from "@/data/assets";
import { GlobeFallback } from "@/components/globe/GlobeFallback";
import { GlobeLabels } from "@/components/globe/GlobeLabels";
import { useT } from "@/i18n/language-context";
import { useResetCount } from "@/lib/site-mode";

/** Level 01: holographic room with three floating glass screens. */
export function HoloRoom({ assets }: { assets: AssetAvailability }) {
  const t = useT();
  const resetCount = useResetCount();

  return (
    <section id="room" className="room" aria-label={t.a11y.roomRegion}>
      <div className="room__bg" aria-hidden="true">
        <div className="room__glow" />
        <GlobeFallback />
        <div className="floor-zone">
          <div className="horizon" />
          <div className="fog" />
          <div className="floor">
            <div className="floor__plane">
              <div className="floor__grid" />
            </div>
          </div>
        </div>
        <div className="scanlines" />
        <div className="scan-sweep" />
      </div>

      <GlobeLabels />
      <HomeStage key={resetCount} assets={assets} />
      <LevelLabel />
    </section>
  );
}
