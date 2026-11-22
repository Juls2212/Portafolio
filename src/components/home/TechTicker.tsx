import type { CSSProperties } from "react";
import { technologies } from "@/data/technologies";

/**
 * Slow marquee of the technology names with their logos. Decorative (aria-hidden): the same list is
 * available as real content in the Stack module. The list is rendered twice so the loop is
 * seamless (the track moves by exactly -50%). Pauses on hover / focus; static under reduced motion.
 */
export function TechTicker() {
  const items = technologies.map((tech) => (
    <li key={tech.id} className="ticker__item">
      {tech.logo ? (
        <span className="ticker__logo" style={{ "--logo": `url(${tech.logo})` } as CSSProperties} />
      ) : (
        <span className="ticker__initials">{tech.initials}</span>
      )}
      {tech.name}
    </li>
  ));
  return (
    <div className="ticker" aria-hidden="true">
      <ul className="ticker__track">
        {items}
        {technologies.map((tech) => (
          <li key={`${tech.id}-copy`} className="ticker__item">
            {tech.logo ? (
              <span className="ticker__logo" style={{ "--logo": `url(${tech.logo})` } as CSSProperties} />
            ) : (
              <span className="ticker__initials">{tech.initials}</span>
            )}
            {tech.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
