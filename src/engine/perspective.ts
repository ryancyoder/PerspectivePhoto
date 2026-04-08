import type { PerspectiveConfig } from '../types';

/**
 * Calculate the perspective scale factor for a stamp based on its vertical
 * position relative to the horizon line.
 *
 * Objects at the ground line get scale = baseScale (full foreground size).
 * Objects at the horizon line get very small.
 * The relationship is linear in screen space, which matches single-point
 * perspective projection for objects on a ground plane.
 *
 * baseScale is calibrated so that a stamp at the ground line appears at
 * a reasonable size relative to the background image (roughly 20% of
 * image height for a standard tree).
 */
export function calculateScale(
  stampBottomY: number,
  config: PerspectiveConfig
): number {
  const { horizonY, groundY, baseScale } = config;
  const range = groundY - horizonY;

  // Avoid division by zero if horizon and ground are at the same Y
  if (range <= 0) return baseScale;

  const distFromHorizon = stampBottomY - horizonY;
  // Clamp: minimum 8% so stamps near horizon are still visible,
  // max 1.5 so stamps below ground don't get absurdly large
  const ratio = Math.max(0.08, Math.min(1.5, distFromHorizon / range));
  return ratio * baseScale;
}

/**
 * Given a stamp's center Y position and its unscaled height,
 * compute the bottom Y (anchor point for perspective).
 */
export function getStampBottomY(centerY: number, unscaledHeight: number, currentScale: number): number {
  return centerY + (unscaledHeight * currentScale) / 2;
}

/**
 * Create default perspective config for a given canvas/image size.
 * Places horizon at 1/3 from top, ground at bottom.
 *
 * baseScale is calculated so that a stamp with defaultHeight ~100px
 * renders at about 20% of the image height when placed at the ground line.
 * This makes stamps immediately visible and proportional to the photo.
 */
export function createDefaultPerspective(canvasWidth: number, canvasHeight: number): PerspectiveConfig {
  // A stamp's defaultHeight is ~100px. We want it to appear as ~20% of image height
  // at ground level. So baseScale = (0.20 * canvasHeight) / 100
  const baseScale = Math.max(1, (canvasHeight * 0.20) / 100);

  return {
    horizonY: canvasHeight * 0.33,
    groundY: canvasHeight,
    vanishingPointX: canvasWidth / 2,
    baseScale,
  };
}
