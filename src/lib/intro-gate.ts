/**
 * Runs before first paint (inline in <head>). Decides whether the rain plays and
 * flags <html data-intro="on"> so the room stays hidden until the canvas is up.
 * Also sets <html data-mode>: a module hash opens EXPLORE directly. Skipped for: URL hash, reload / back-forward, restored scroll, reduced motion.
 */
export const INTRO_GATE_SCRIPT = `(function(){try{var d=document.documentElement;try{var c=document.createElement("canvas");d.setAttribute("data-webgl",c.getContext("webgl2")||c.getContext("webgl")?"1":"0")}catch(x){d.setAttribute("data-webgl","0")}d.setAttribute("data-mode",/^#(stack|projects|experience|contact)$/.test(location.hash)?"explore":"home");var n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];var t=n?n.type:"navigate";var skip=location.hash.length>1||t==="reload"||t==="back_forward"||window.scrollY>0||window.matchMedia("(prefers-reduced-motion: reduce)").matches;if(!skip)d.setAttribute("data-intro","on")}catch(e){}})();`;
