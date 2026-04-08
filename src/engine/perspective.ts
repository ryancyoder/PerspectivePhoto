import type { PerspectiveConfig } from '../types';

/**
 * Calculate the perspective scale factor for a stamp based on its vertical
 * position relative to the horizon line.
 *
 * Objects at the ground line get scale 1.0 (full size).
 * Objects at the horizon line approach 0 (infinitely far away).
 * The relationship is linear in screen space, which matches single-point
 * perspective projection for objects on a ground plane.
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
  // Clamp to a minimum so stamps never fully disappear
  const ratio = Math.max(0.05, Math.min(1.5, distFromHorizon / range));
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
 * Create default perspective config for a given canvas size.
 * Places horizon at 1/3 from top, ground at bottom.
 */
export function createDefaultPerspective(canvasWidth: number, canvasHeight: number): PerspectiveConfig {
  return {
    horizonY: canvasHeight * 0.33,
    groundY: canvasHeight,
    vanishingPointX: canvasWidth / 2,
    baseScale: 1.0,
  };
}
