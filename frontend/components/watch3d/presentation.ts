import { PHOTO_SECONDS, ROTATION_SECONDS } from './settings';

// Advance by visible animation time, so hidden/offscreen cards resume their
// current turn. A late or failed image must never produce an empty photo slot.
export function advancePresentation(elapsedMs: number, deltaMs: number, photoReady: boolean) {
  const turn = ROTATION_SECONDS * 1000;
  const duration = turn + (photoReady ? PHOTO_SECONDS * 1000 : 0);
  const elapsed = (elapsedMs + deltaMs) % duration;
  return {
    elapsed,
    progress: Math.min(elapsed / turn, 1),
    showPhoto: photoReady && elapsed >= turn,
  };
}
