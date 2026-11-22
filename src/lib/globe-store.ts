import { useSyncExternalStore } from "react";

/**
 * Bridge between the globe scene (inside the WebGL canvas) and the DOM. The scene writes label
 * positions straight to the registered elements each frame (no React state); the only React-visible
 * value is `visible`, which flips a handful of times per session (it fades the canvas layer in/out).
 */
export const GLOBE_LABEL_COUNT = 3;

let visible = false;
const listeners = new Set<() => void>();
const labels: (HTMLElement | null)[] = Array.from({ length: GLOBE_LABEL_COUNT }, () => null);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setGlobeVisible(next: boolean) {
  if (visible === next) return;
  visible = next;
  listeners.forEach((l) => l());
}

export function useGlobeVisible(): boolean {
  return useSyncExternalStore(subscribe, () => visible, () => false);
}

export function registerGlobeLabel(index: number, el: HTMLElement | null) {
  labels[index] = el;
}

export const getGlobeLabels = () => labels;
