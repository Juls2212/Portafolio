/**
 * Runs before first paint (inline in <head>). Decides whether the rain plays and
 * flags <html data-intro="on"> so the room stays hidden until the canvas is up.
 * Skipped for: URL hash, reload / back-forward, restored scroll, reduced motion.
 */
export const INTRO_GATE_SCRIPT = `(function(){try{var d=document.documentElement;var n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];var t=n?n.type:"navigate";var skip=location.hash.length>1||t==="reload"||t==="back_forward"||window.scrollY>0||window.matchMedia("(prefers-reduced-motion: reduce)").matches;if(!skip)d.setAttribute("data-intro","on")}catch(e){}})();`;
