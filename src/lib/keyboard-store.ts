import { useSyncExternalStore } from "react";
import { KEYBOARD_COLS, KEYBOARD_ROWS, keyboardKeys } from "@/data/technologies";
import type { ArrowDirection } from "@/data/technologies";

/**
 * Shared keyboard state. The 3D scene subscribes imperatively (and invalidates its
 * demand frameloop); the DOM grid, the panel and the orb subscribe through React.
 */
export interface KeyboardState {
  selectedId: string | null;
  focusedId: string | null;
  hoveredId: string | null;
  /** Latest arrow-key / transient press: the scene plays a short press animation. */
  pulse: { id: string; seq: number } | null;
  /** Keys raised through the phase-3 API. */
  raised: { ids: readonly string[]; seq: number };
}

let state: KeyboardState = {
  selectedId: null,
  focusedId: null,
  hoveredId: null,
  pulse: null,
  raised: { ids: [], seq: 0 },
};
const listeners = new Set<() => void>();

function set(patch: Partial<KeyboardState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeKeyboard(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getKeyboardState = (): KeyboardState => state;

export function useKeyboardState(): KeyboardState {
  return useSyncExternalStore(subscribeKeyboard, getKeyboardState, getKeyboardState);
}

const grid: (string | undefined)[][] = Array.from({ length: KEYBOARD_ROWS }, () =>
  Array<string | undefined>(KEYBOARD_COLS).fill(undefined),
);
for (const key of keyboardKeys) {
  const row = grid[key.row];
  if (row) row[key.col] = key.id;
}

/** Id at a grid cell, or undefined when outside the board. */
export const keyAtCell = (row: number, col: number): string | undefined => grid[row]?.[col];

const STEP: Record<ArrowDirection, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

/** Next technology key from `fromId` in a direction (arrow keys are skipped). */
export function neighborTech(fromId: string, direction: ArrowDirection): string | undefined {
  const from = keyboardKeys.find((k) => k.id === fromId);
  if (!from) return undefined;
  const { dr, dc } = STEP[direction];
  let r = from.row + dr;
  let c = from.col + dc;
  while (r >= 0 && r < KEYBOARD_ROWS && c >= 0 && c < KEYBOARD_COLS) {
    const id = keyAtCell(r, c);
    const def = keyboardKeys.find((k) => k.id === id);
    if (def?.kind === "tech") return def.id;
    r += dr;
    c += dc;
  }
  return undefined;
}

let pulseSeq = 0;

export const keyboardActions = {
  select(id: string | null) {
    if (state.selectedId !== id) set({ selectedId: id });
  },
  setHovered(id: string | null) {
    if (state.hoveredId !== id) set({ hoveredId: id });
  },
  setFocused(id: string | null) {
    if (state.focusedId !== id) set({ focusedId: id });
  },
  /** Clears selection, hover, focus highlight and any pending press. Used when leaving Stack. */
  reset() {
    if (state.selectedId || state.hoveredId || state.focusedId || state.pulse) {
      set({ selectedId: null, hoveredId: null, focusedId: null, pulse: null });
    }
  },
  /**
   * Press a key from any input (mouse, touch, Enter/Space). Tech keys toggle selection;
   * arrow keys move the selection to the neighbouring technology.
   */
  activate(id: string) {
    const key = keyboardKeys.find((k) => k.id === id);
    if (!key) return;
    if (key.kind === "tech") {
      set({ selectedId: state.selectedId === id ? null : id });
      return;
    }
    const direction = key.direction;
    if (!direction) return;
    const origin = state.selectedId ?? keyboardKeys.find((k) => k.kind === "tech")?.id;
    const target = state.selectedId && origin ? neighborTech(origin, direction) : origin;
    set({
      pulse: { id, seq: ++pulseSeq },
      ...(target ? { selectedId: target } : {}),
    });
  },
};

/**
 * Phase-3 API. Ask the keyboard to raise a set of keys (back-to-front cascade),
 * dim the rest, and keep keys that are already up when they are in both sets.
 */
export const keyboardApi = {
  /** Sets the raised set (replacing any previous one). Identical consecutive sets are ignored. */
  setRaised(ids: readonly string[]) {
    const same = ids.length === state.raised.ids.length && ids.every((id) => state.raised.ids.includes(id));
    if (!same) set({ raised: { ids: [...ids], seq: state.raised.seq + 1 } });
  },
  raiseKeys(ids: readonly string[]) {
    keyboardApi.setRaised(ids);
  },
  lowerAll() {
    keyboardApi.setRaised([]);
  },
};
