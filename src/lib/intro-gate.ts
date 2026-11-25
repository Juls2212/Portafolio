/**
 * Runs before first paint (inline in <head>); must never throw. It publishes, on <html>:
 *  - data-motion: "reduced" or "on" (site override in localStorage wins over the OS setting),
 *  - data-webgl: a first, forgiving WebGL probe (src/lib/capabilities.ts refines it after mount),
 *  - data-mode: a module hash opens EXPLORE directly,
 *  - data-intro="on" + data-intro-mode: whether the rain plays, or why it is skipped (hash, reload,
 *    back_forward, scrolled, reduced).
 * A CSS failsafe in globals.css reveals the page if the app never starts.
 */
export const INTRO_GATE_SCRIPT = `(function(){try{var d=document.documentElement;var o=null;try{o=localStorage.getItem("portfolio.motion")}catch(e){}var os=false;try{os=matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}var red=o==="reduced"?true:o==="on"?false:os;d.setAttribute("data-motion",red?"reduced":"on");d.setAttribute("data-motion-source",o?"site":"os");try{var c=document.createElement("canvas");var g=c.getContext("webgl2")||c.getContext("webgl");d.setAttribute("data-webgl",g?"1":"0");var x=g&&g.getExtension("WEBGL_lose_context");if(x)x.loseContext()}catch(e){d.setAttribute("data-webgl","0")}d.setAttribute("data-mode",/^#(stack|projects|experience|contact)$/.test(location.hash)?"explore":"home");var n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];var t=n?n.type:"navigate";var why=location.hash.length>1?"hash":t==="reload"?"reload":t==="back_forward"?"back_forward":window.scrollY>0?"scrolled":red?"reduced":"";d.setAttribute("data-intro-mode",why?"skipped:"+why:"played");if(!why)d.setAttribute("data-intro","on")}catch(e){}})();`;
