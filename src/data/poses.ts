import type { ModuleId } from "@/data/modules";

/**
 * Where the shared keyboard lives. Only Stack and Projects have a pose: in every other
 * module (Room, Experience, Contact) the keyboard does not exist.
 * position.x / position.y are fractions of the half viewport (-1..1), z is in world units.
 * fit is how much of the half viewport (NDC, 1 = edge to edge) the board may occupy around its
 * position, so each pose keeps clear of its module's text at every window size.
 */
export interface KeyboardPose {
  position: { x: number; y: number; z: number };
  /** Euler XYZ in radians: x tilts the face toward the camera, y yaws the board. */
  rotation: { x: number; y: number; z: number };
  fit: { x: number; y: number };
  /** Hover and selection are only live on interactive poses. */
  interactive: boolean;
}

export type PosedModule = "stack" | "projects";

export const keyboardPoses: Record<PosedModule, KeyboardPose> = {
  stack: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0.95, y: -0.62, z: 0 },
    fit: { x: 1.0, y: 1.02 },
    interactive: true,
  },
  // Large on the right; the gallery copy stays in the left half.
  projects: {
    position: { x: 0.6, y: -0.02, z: 0 },
    rotation: { x: 0.95, y: -0.7, z: 0 },
    fit: { x: 0.4, y: 0.8 },
    interactive: false,
  },
};

export const hasKeyboard = (id: ModuleId): id is PosedModule => id in keyboardPoses;
