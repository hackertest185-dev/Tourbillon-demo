export const ROTATION_SECONDS = 8;
export const TILT_DEG = 17;
export const FPS_CAP = 60;
export const MAX_DPR = 2;
export const PAUSE_ON_HOVER = true;
export const DRAG_SENSITIVITY = .012;
export const INERTIA = .91;
export const RESUME_DELAY_MS = 1500;
export const PRELOAD_MARGIN = '180px';

export type WatchControls = {
  rotation: number;
  velocity: number;
  dragging: boolean;
  hovered: boolean;
  reduced: boolean;
  resumeAt: number;
};
