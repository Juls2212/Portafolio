import { AmbientBridge } from "@/components/atmosphere/AmbientBridge";
import { SpaceBackground } from "@/components/atmosphere/SpaceBackground";

/**
 * Site-wide atmosphere. Everything is fixed, non-interactive and aria-hidden. `Back` sits under the
 * WebGL canvas (tint, parallax dots); `Front` sits over it (light shafts, spotlight, grain + vignette).
 * Layer count is kept low on purpose (three compositor-faded tints, two dot layers, one shafts layer, one veil): every
 * full-viewport layer costs a composite per frame, and profiling showed their number dominated scroll cost.
 */
export function AtmosphereBack() {
  return (
    <div className="atmo atmo--back" aria-hidden="true">
      <div className="atmo__tint atmo__tint--neon" />
      <div className="atmo__tint atmo__tint--teal" />
      <div className="atmo__tint atmo__tint--lime" />
      <SpaceBackground />
      <div className="atmo__dots atmo__dots--1" />
      <div className="atmo__dots atmo__dots--2" />
    </div>
  );
}

export function AtmosphereFront() {
  return (
    <>
      <AmbientBridge />
      <div className="atmo atmo--front" aria-hidden="true">
        <div className="atmo__shafts" />
        <div className="atmo__spot" />
        <div className="atmo__veil" />
      </div>
      <div className="scan-wipe" aria-hidden="true" />
    </>
  );
}
