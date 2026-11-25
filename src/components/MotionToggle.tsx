"use client";

import { useT } from "@/i18n/language-context";
import { setMotionChoice, useMotionState } from "@/lib/motion-pref";

/**
 * HUD control for animations. It shows which mode is active ("Animations: on / reduced") and lets the
 * visitor override the operating system preference for this site; the choice persists. When the mode
 * comes from the system and no choice was made, the label says so.
 */
export function MotionToggle() {
  const t = useT();
  const { reduced, source } = useMotionState();
  const label = reduced ? t.hud.motionReduced : t.hud.motionOn;
  const action = reduced ? t.hud.motionToOn : t.hud.motionToReduced;
  const origin = source === "os" ? t.hud.motionSystem : t.hud.motionSite;
  return (
    <button
      type="button"
      className="motion-toggle"
      data-reduced={reduced}
      aria-pressed={!reduced}
      aria-label={`${label}. ${action}.`}
      title={`${action} (${origin})`}
      onClick={() => setMotionChoice(reduced ? "on" : "reduced")}
    >
      <span className="motion-toggle__dot" aria-hidden="true" />
      {label}
    </button>
  );
}
