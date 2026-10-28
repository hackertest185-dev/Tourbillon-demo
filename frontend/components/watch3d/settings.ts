export const ROTATION_SECONDS = 8;
export const PHOTO_SECONDS = 6;
export const TILT_DEG = 17;
export const FPS_CAP = 60;
export const MAX_DPR = 2;
export const PRELOAD_MARGIN = '180px';

export type WatchControls = {
  rotation: number;
  initialRotation: number;
  photoReady: boolean;
  reduced: boolean;
};
