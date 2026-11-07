import type { CSSProperties, ReactNode } from "react";

export type ScreenAccent = "neon" | "teal" | "lime";
export type ScreenPosition = "left" | "center" | "right";

interface ScreenFrameProps {
  titleId: string;
  position: ScreenPosition;
  accent: ScreenAccent;
  /** Power-on order (0, 1, 2…). */
  order: number;
  children: ReactNode;
}

/** Glass screen with HUD corner marks. The slot carries the 3D placement, the screen the animation. */
export function ScreenFrame({ titleId, position, accent, order, children }: ScreenFrameProps) {
  return (
    <div className="slot" data-pos={position} style={{ "--i": order } as CSSProperties}>
      <section className="screen" data-accent={accent} aria-labelledby={titleId}>
        <span className="corner corner--tl" aria-hidden="true" />
        <span className="corner corner--tr" aria-hidden="true" />
        <span className="corner corner--bl" aria-hidden="true" />
        <span className="corner corner--br" aria-hidden="true" />
        {children}
      </section>
    </div>
  );
}
