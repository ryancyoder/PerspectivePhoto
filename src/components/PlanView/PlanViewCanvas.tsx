import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { useProjectStore } from '../../store/useProjectStore';
import type { Point2D } from '../../types';

/**
 * Plan view — user taps to draw a multi-point polygon selection,
 * then the selected region gets cropped (with transparency outside)
 * and sent to the photo view as a warpable overlay.
 */
export function PlanViewCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const canvasWidth = useProjectStore((s) => s.canvasWidth);
  const canvasHeight = useProjectStore((s) => s.canvasHeight);
  const planView = useProjectStore((s) => s.planView);
  const setCanvasSize = useProjectStore((s) => s.setCanvasSize);
  const setPlanSelection = useProjectStore((s) => s.setPlanSelection);

  const [planImage, setPlanImage] = useState<HTMLImageElement | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // Polygon points (plan image coordinates)
  const [points, setPoints] = useState<Point2D[]>([]);
  const [isClosed, setIsClosed] = useState(false);

  // Load plan image
  useEffect(() => {
    if (!planView.image) { setPlanImage(null); return; }
    const img = new window.Image();
    img.src = planView.image;
    img.onload = () => setPlanImage(img);
  }, [planView.image]);

  // Fit to container
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setCanvasSize(clientWidth, clientHeight);

      if (planView.imageWidth && planView.imageHeight) {
        const scaleX = clientWidth / planView.imageWidth;
        const scaleY = clientHeight / planView.imageHeight;
        const s = Math.min(scaleX, scaleY, 1);
        setStageScale(s);
        setStagePos({
          x: (clientWidth - planView.imageWidth * s) / 2,
          y: (clientHeight - planView.imageHeight * s) / 2,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [planView.imageWidth, planView.imageHeight, setCanvasSize]);

  // Get plan coordinates from pointer
  const getPlanPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return {
      x: (pos.x - stagePos.x) / stageScale,
      y: (pos.y - stagePos.y) / stageScale,
    };
  }, [stagePos, stageScale]);

  // Tap to add polygon point
  const handleTap = useCallback(() => {
    if (isClosed) return;
    const pos = getPlanPos();
    if (!pos) return;

    // If tapping near the first point and we have 3+ points, close the polygon
    if (points.length >= 3) {
      const first = points[0];
      const dist = Math.sqrt((pos.x - first.x) ** 2 + (pos.y - first.y) ** 2);
      if (dist < 25 / stageScale) {
        closeAndCrop();
        return;
      }
    }

    setPoints((prev) => [...prev, pos]);
  }, [isClosed, getPlanPos, points, stageScale]);

  // Close the polygon and crop the selection
  const closeAndCrop = useCallback(() => {
    if (points.length < 3 || !planImage) return;
    setIsClosed(true);

    // Compute bounding box of the polygon
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    // Clamp to image bounds
    minX = Math.max(0, Math.floor(minX));
    minY = Math.max(0, Math.floor(minY));
    maxX = Math.min(planView.imageWidth, Math.ceil(maxX));
    maxY = Math.min(planView.imageHeight, Math.ceil(maxY));

    const w = maxX - minX;
    const h = maxY - minY;
    if (w < 10 || h < 10) return;

    // Crop with polygon mask — only the inside is visible, outside is transparent
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = w;
    cropCanvas.height = h;
    const ctx = cropCanvas.getContext('2d')!;

    // Draw polygon clip path (offset by bounding box origin)
    ctx.beginPath();
    ctx.moveTo(points[0].x - minX, points[0].y - minY);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x - minX, points[i].y - minY);
    }
    ctx.closePath();
    ctx.clip();

    // Draw the plan image within the clip
    ctx.drawImage(planImage, minX, minY, w, h, 0, 0, w, h);

    const dataUrl = cropCanvas.toDataURL('image/png');
    setPlanSelection(dataUrl, w, h);

    // Reset for next selection
    setTimeout(() => {
      setPoints([]);
      setIsClosed(false);
    }, 300);
  }, [points, planImage, planView.imageWidth, planView.imageHeight, setPlanSelection]);

  // Clear selection to start over
  const handleClear = useCallback(() => {
    setPoints([]);
    setIsClosed(false);
  }, []);

  // Flatten points array for Konva Line
  const flatPoints = points.flatMap((p) => [p.x, p.y]);

  return (
    <div ref={containerRef} className="flex-1 bg-gray-50 relative overflow-hidden">
      {/* Instructions */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          {points.length === 0
            ? 'Tap to draw a selection polygon'
            : points.length < 3
            ? `Tap to add points (${points.length}/3 minimum)`
            : 'Tap first point to close, or keep adding points'}
        </div>
      </div>

      {/* Clear / Undo buttons */}
      {points.length > 0 && !isClosed && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          <button
            onClick={handleClear}
            className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-medium shadow"
          >
            Clear
          </button>
          <button
            onClick={() => setPoints((p) => p.slice(0, -1))}
            className="px-3 py-1 bg-gray-500 text-white rounded-full text-xs font-medium shadow"
          >
            Undo Point
          </button>
          {points.length >= 3 && (
            <button
              onClick={closeAndCrop}
              className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-medium shadow"
            >
              Done
            </button>
          )}
        </div>
      )}

      {!planView.image ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p className="text-lg font-medium">No plan image yet</p>
            <p className="text-sm mt-1">Upload a site plan using the grid icon in the toolbar</p>
          </div>
        </div>
      ) : (
        <Stage
          ref={stageRef}
          width={canvasWidth || 1}
          height={canvasHeight || 1}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          draggable={false}
          onClick={handleTap}
          onTap={handleTap}
        >
          {/* Plan image */}
          <Layer listening={false}>
            {planImage && (
              <KonvaImage
                image={planImage}
                x={0}
                y={0}
                width={planView.imageWidth}
                height={planView.imageHeight}
              />
            )}
          </Layer>

          {/* Selection polygon overlay */}
          <Layer listening={false}>
            {/* Dim overlay when polygon has points */}
            {points.length > 0 && (
              <Rect
                x={0}
                y={0}
                width={planView.imageWidth}
                height={planView.imageHeight}
                fill="rgba(0,0,0,0.25)"
              />
            )}

            {/* Polygon lines */}
            {points.length >= 2 && (
              <Line
                points={flatPoints}
                stroke="#3b82f6"
                strokeWidth={3 / stageScale}
                closed={isClosed}
                fill={isClosed ? 'rgba(59,130,246,0.15)' : undefined}
              />
            )}

            {/* Point markers */}
            {points.map((p, i) => (
              <Circle
                key={i}
                x={p.x}
                y={p.y}
                radius={i === 0 && points.length >= 3 ? 12 / stageScale : 6 / stageScale}
                fill={i === 0 ? '#22c55e' : '#3b82f6'}
                stroke="#fff"
                strokeWidth={2 / stageScale}
              />
            ))}

            {/* "Close here" label on first point */}
            {points.length >= 3 && !isClosed && (
              <Text
                x={points[0].x + 14 / stageScale}
                y={points[0].y - 8 / stageScale}
                text="Tap to close"
                fontSize={12 / stageScale}
                fill="#22c55e"
                fontStyle="bold"
              />
            )}
          </Layer>
        </Stage>
      )}

      {planView.selectionImage && points.length === 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium z-10 pointer-events-none">
          Selection sent to Photo view — switch to Photo to position it
        </div>
      )}
    </div>
  );
}
