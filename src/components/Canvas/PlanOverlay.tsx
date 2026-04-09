import { useEffect, useRef, useState, useCallback } from 'react';
import { Image as KonvaImage, Circle, Line, Group } from 'react-konva';
import { useProjectStore } from '../../store/useProjectStore';
import type { Point2D } from '../../types';

const SUBDIVISIONS = 8; // Grid subdivisions for warp quality

/**
 * Renders the plan image warped onto the perspective photo via 4 draggable corners.
 * Uses subdivided triangle mesh for smooth perspective distortion.
 */
export function PlanOverlay() {
  const planView = useProjectStore((s) => s.planView);
  const setPlanCorners = useProjectStore((s) => s.setPlanCorners);
  const toolMode = useProjectStore((s) => s.toolMode);
  const viewMode = useProjectStore((s) => s.viewMode);

  const [planImg, setPlanImg] = useState<HTMLImageElement | null>(null);
  const [warpedCanvas, setWarpedCanvas] = useState<HTMLCanvasElement & { _offsetX?: number; _offsetY?: number } | null>(null);
  const warpCanvasRef = useRef<HTMLCanvasElement & { _offsetX?: number; _offsetY?: number } | null>(null);

  // Load plan image
  useEffect(() => {
    if (!planView.image) { setPlanImg(null); return; }
    const img = new window.Image();
    img.src = planView.image;
    img.onload = () => setPlanImg(img);
  }, [planView.image]);

  // Create offscreen canvas for warping
  useEffect(() => {
    if (!warpCanvasRef.current) {
      warpCanvasRef.current = document.createElement('canvas');
    }
  }, []);

  // Re-render warped image whenever corners or plan image change
  useEffect(() => {
    if (!planImg || !planView.corners || !warpCanvasRef.current) {
      setWarpedCanvas(null);
      return;
    }

    const canvas = warpCanvasRef.current;
    const corners = planView.corners;

    // Compute bounding box of the 4 corners
    const minX = Math.min(corners[0].x, corners[1].x, corners[2].x, corners[3].x);
    const maxX = Math.max(corners[0].x, corners[1].x, corners[2].x, corners[3].x);
    const minY = Math.min(corners[0].y, corners[1].y, corners[2].y, corners[3].y);
    const maxY = Math.max(corners[0].y, corners[1].y, corners[2].y, corners[3].y);

    const w = Math.ceil(maxX - minX) || 1;
    const h = Math.ceil(maxY - minY) || 1;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);

    // Offset corners relative to bounding box
    const c = corners.map((p) => ({ x: p.x - minX, y: p.y - minY }));

    // Source image dimensions
    const sw = planImg.naturalWidth;
    const sh = planImg.naturalHeight;

    // Render warped image using subdivided quads
    for (let row = 0; row < SUBDIVISIONS; row++) {
      for (let col = 0; col < SUBDIVISIONS; col++) {
        const u0 = col / SUBDIVISIONS;
        const u1 = (col + 1) / SUBDIVISIONS;
        const v0 = row / SUBDIVISIONS;
        const v1 = (row + 1) / SUBDIVISIONS;

        // Bilinear interpolation of corner positions for this sub-quad
        const tl = bilerp(c[0], c[1], c[3], c[2], u0, v0);
        const tr = bilerp(c[0], c[1], c[3], c[2], u1, v0);
        const br = bilerp(c[0], c[1], c[3], c[2], u1, v1);
        const bl = bilerp(c[0], c[1], c[3], c[2], u0, v1);

        // Source rectangle in the plan image
        const sx = u0 * sw;
        const sy = v0 * sh;
        const sWidth = (u1 - u0) * sw;
        const sHeight = (v1 - v0) * sh;

        // Draw two triangles for this sub-quad
        drawTriangle(ctx, planImg, sx, sy, sWidth, sHeight, tl, tr, bl);
        drawTriangle(ctx, planImg, sx + sWidth, sy + sHeight, -sWidth, -sHeight, br, bl, tr);
      }
    }

    // Store reference for Konva to use
    canvas._offsetX = minX;
    canvas._offsetY = minY;
    setWarpedCanvas(canvas);
  }, [planImg, planView.corners]);

  const handleCornerDrag = useCallback(
    (index: number, x: number, y: number) => {
      if (!planView.corners) return;
      const newCorners = [...planView.corners] as [Point2D, Point2D, Point2D, Point2D];
      newCorners[index] = { x, y };
      setPlanCorners(newCorners);
    },
    [planView.corners, setPlanCorners]
  );

  if (viewMode !== 'photo' || !planView.image || !planView.corners || !planView.visible) return null;

  const corners = planView.corners;
  const cornerColors = ['#ef4444', '#f97316', '#22c55e', '#3b82f6'];

  // Compute the bounding box offset stored on the canvas
  const offsetX = (warpedCanvas as any)?._offsetX ?? 0;
  const offsetY = (warpedCanvas as any)?._offsetY ?? 0;

  return (
    <Group>
      {/* Warped plan image */}
      {warpedCanvas && (
        <KonvaImage
          image={warpedCanvas}
          x={offsetX}
          y={offsetY}
          opacity={planView.opacity}
          listening={false}
        />
      )}

      {/* Corner outline */}
      <Line
        points={[
          corners[0].x, corners[0].y,
          corners[1].x, corners[1].y,
          corners[2].x, corners[2].y,
          corners[3].x, corners[3].y,
        ]}
        closed
        stroke="#fff"
        strokeWidth={2}
        dash={[6, 4]}
        listening={false}
        opacity={0.7}
      />

      {/* Draggable corner handles */}
      {corners.map((corner, i) => (
        <Circle
          key={i}
          x={corner.x}
          y={corner.y}
          radius={14}
          fill={cornerColors[i]}
          stroke="#fff"
          strokeWidth={2}
          draggable={toolMode === 'select'}
          onDragMove={(e) => handleCornerDrag(i, e.target.x(), e.target.y())}
          opacity={0.9}
        />
      ))}
    </Group>
  );
}

/** Bilinear interpolation between 4 corner points */
function bilerp(
  tl: Point2D, tr: Point2D, bl: Point2D, br: Point2D,
  u: number, v: number
): Point2D {
  return {
    x: (1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + (1 - u) * v * bl.x + u * v * br.x,
    y: (1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + (1 - u) * v * bl.y + u * v * br.y,
  };
}

/** Draw a textured triangle using affine transform */
function drawTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx: number, sy: number,
  sWidth: number, sHeight: number,
  p0: Point2D, p1: Point2D, p2: Point2D
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.clip();

  // Compute affine transform that maps the source triangle to destination
  // Source triangle: (0,0), (sWidth,0), (0,sHeight) → p0, p1, p2
  const denom = sWidth * sHeight;
  if (Math.abs(denom) < 0.001) { ctx.restore(); return; }

  const a = (p1.x - p0.x) / sWidth;
  const b = (p2.x - p0.x) / sHeight;
  const c = p0.x;
  const d = (p1.y - p0.y) / sWidth;
  const e = (p2.y - p0.y) / sHeight;
  const f = p0.y;

  ctx.setTransform(a, d, b, e, c, f);
  ctx.drawImage(img, sx, sy, Math.abs(sWidth), Math.abs(sHeight), 0, 0, Math.abs(sWidth), Math.abs(sHeight));
  ctx.restore();
}
