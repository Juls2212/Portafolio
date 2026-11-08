/** Reads a design token (CSS custom property) so canvas / WebGL code never hardcodes palette colors. */
export function readToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
