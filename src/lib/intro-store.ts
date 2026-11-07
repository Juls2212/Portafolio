import { useSyncExternalStore } from "react";

/**
 * Shared state of the intro rain. "done" means the intro finished, was skipped,
 * or never needed to play. The server and the first client render are "pending".
 */
let done = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function finishIntro() {
  if (done) return;
  done = true;
  const root = document.documentElement;
  root.removeAttribute("data-intro");
  root.setAttribute("data-ready", "true");
  listeners.forEach((l) => l());
}

export function useIntroDone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => done,
    () => false,
  );
}
