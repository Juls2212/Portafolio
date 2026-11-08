"use client";

import { useEffect } from "react";
import { MODULE_HASH, openFromHash } from "@/lib/site-mode";

/** Transition flash overlay + deep-link handling for hash changes after load. */
export function SiteModeBridge() {
  // Deep link: the server markup (cards, sizes) differs from the hydrated layout, so re-align to the
  // target once hydrated (and once more after late layout shifts).
  useEffect(() => {
    const hash = window.location.hash;
    if (!MODULE_HASH.test(hash)) return;
    const align = () => document.querySelector(hash)?.scrollIntoView({ behavior: "instant", block: "start" });
    align();
    const id = setTimeout(align, 600);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const onHash = () => openFromHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return <div className="site-flash" aria-hidden="true" />;
}
