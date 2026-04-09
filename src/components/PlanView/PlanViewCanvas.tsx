import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva';
import Konva from 'konva';
import { useProjectStore } from '../../store/useProjectStore';

/**
 * Plan view — shows the uploaded plan image.
 * User draws a selection rectangle, which gets cropped and sent
 * to the photo view as a warpable overlay.
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

  // Selection rectangle state
  const [selecting, setSelecting] = useState(false);
  const [selStart, setSelStart] = useState({ x: 0, y: 0 });
  const [selEnd, setSelEnd] = useState({ x: 0, y: 0 });

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

  // Convert screen position to plan image coordinates
  const screenToPlan = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - stagePos.x) / stageScale,
      y: (screenY - stagePos.y) / stageScale,
    };
  }, [stagePos, stageScale]);

  // Selection handlers
  const handleMouseDown = useCallback((_e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const planPos = screenToPlan(pos.x, pos.y);
    setSelStart(planPos);
    setSelEnd(planPos);
    setSelecting(true);
  }, [screenToPlan]);

  const handleMouseMove = useCallback((_e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!selecting) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    setSelEnd(screenToPlan(pos.x, pos.y));
  }, [selecting, screenToPlan]);

  const handleMouseUp = useCallback(() => {
    if (!selecting || !planImage) return;
    setSelecting(false);

    // Compute the selection rectangle (normalize for negative drag directions)
    const x = Math.max(0, Math.min(selStart.x, selEnd.x));
    const y = Math.max(0, Math.min(selStart.y, selEnd.y));
    const w = Math.min(Math.abs(selEnd.x - selStart.x), planView.imageWidth - x);
    const h = Math.min(Math.abs(selEnd.y - selStart.y), planView.imageHeight - y);

    // Ignore tiny selections (accidental taps)
    if (w < 20 || h < 20) return;

    // Crop the selection to a canvas and store it
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = w;
    cropCanvas.height = h;
    const ctx = cropCanvas.getContext('2d')!;
    ctx.drawImage(planImage, x, y, w, h, 0, 0, w, h);

    const dataUrl = cropCanvas.toDataURL('image/png');
    setPlanSelection(dataUrl, w, h);
  }, [selecting, selStart, selEnd, planImage, planView.imageWidth, planView.imageHeight, setPlanSelection]);

  // Selection rect dimensions for rendering
  const selX = Math.min(selStart.x, selEnd.x);
  const selY = Math.min(selStart.y, selEnd.y);
  const selW = Math.abs(selEnd.x - selStart.x);
  const selH = Math.abs(selEnd.y - selStart.y);

  return (
    <div ref={containerRef} className="flex-1 bg-gray-50 relative overflow-hidden">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          Draw a rectangle to select an area to overlay on the photo
        </div>
      </div>

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
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
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

          {/* Selection overlay */}
          <Layer listening={false}>
            {/* Dim the non-selected area */}
            {selecting && selW > 5 && selH > 5 && (
              <>
                <Rect x={0} y={0} width={planView.imageWidth} height={planView.imageHeight} fill="rgba(0,0,0,0.3)" />
                {/* Clear the selected area */}
                <Rect x={selX} y={selY} width={selW} height={selH} fill="#fafafa" />
                {/* Re-draw the plan image in the selected area via clip (simulated by overlay) */}
              </>
            )}

            {/* Selection rectangle border */}
            {selecting && selW > 5 && selH > 5 && (
              <Rect
                x={selX}
                y={selY}
                width={selW}
                height={selH}
                stroke="#3b82f6"
                strokeWidth={3}
                dash={[8, 4]}
                fill="transparent"
              />
            )}

            {/* Previous selection indicator */}
            {planView.selectionImage && !selecting && (
              <Rect
                x={0}
                y={0}
                width={planView.imageWidth}
                height={planView.imageHeight}
                fill="transparent"
              />
            )}
          </Layer>
        </Stage>
      )}

      {planView.selectionImage && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium z-10 pointer-events-none">
          Selection sent to Photo view — switch to Photo to position it
        </div>
      )}
    </div>
  );
}
