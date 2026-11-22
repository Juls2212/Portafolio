const COUNT = 520;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Front hemisphere of a Fibonacci sphere, projected orthographically. Deterministic (SSR-safe). */
const dots = (() => {
  const tilt = 0.38;
  const out: { x: number; y: number; r: number; o: number }[] = [];
  for (let i = 0; i < COUNT; i++) {
    const y0 = 1 - (2 * (i + 0.5)) / COUNT;
    const rad = Math.sqrt(1 - y0 * y0);
    const theta = i * GOLDEN;
    const x = Math.cos(theta) * rad;
    const z0 = Math.sin(theta) * rad;
    const y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
    const z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
    if (z < 0) continue;
    out.push({ x: +(x * 96).toFixed(1), y: +(-y * 96).toFixed(1), r: +(0.45 + z * 0.55).toFixed(2), o: +(0.25 + z * 0.65).toFixed(2) });
  }
  return out;
})();

/** Static dotted globe used when WebGL is unavailable (hidden by CSS whenever WebGL works). */
export function GlobeFallback() {
  return (
    <svg className="globe-fallback" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">
      <circle r="97" fill="none" stroke="currentColor" strokeOpacity="0.18" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="currentColor" fillOpacity={d.o} />
      ))}
    </svg>
  );
}
