import { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { useProjectStore } from '../../store/useProjectStore';
import { BackgroundImage } from './BackgroundImage';
import { PerspectiveGuides } from './PerspectiveGuides';
import { PlantStamp } from './PlantStamp';
import { CalibrationOverlay } from './CalibrationOverlay';
import { PlanOverlay } from './PlanOverlay';

interface EditorCanvasProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function EditorCanvas({ stageRef }: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const canvasWidth = useProjectStore((s) => s.canvasWidth);
  const canvasHeight = useProjectStore((s) => s.canvasHeight);
  const backgroundImage = useProjectStore((s) => s.backgroundImage);
  const backgroundWidth = useProjectStore((s) => s.backgroundWidth);
  const backgroundHeight = useProjectStore((s) => s.backgroundHeight);
  const stamps = useProjectStore((s) => s.stamps);
  const selectedStampId = useProjectStore((s) => s.selectedStampId);
  const selectStamp = useProjectStore((s) => s.selectStamp);
  const stageScale = useProjectStore((s) => s.stageScale);
  const stageX = useProjectStore((s) => s.stageX);
  const stageY = useProjectStore((s) => s.stageY);
  const setStageTransform = useProjectStore((s) => s.setStageTransform);
  const setCanvasSize = useProjectStore((s) => s.setCanvasSize);
  const addStamp = useProjectStore((s) => s.addStamp);
  const toolMode = useProjectStore((s) => s.toolMode);
  const pendingStampAssetId = useProjectStore((s) => s.pendingStampAssetId);
  const hasOverlay = !!useProjectStore((s) => s.planView.selectionImage);
  const eraserActive = useRef(false);

  // Fit canvas to container — photo stays locked in place
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setCanvasSize(clientWidth, clientHeight);

      if (backgroundWidth && backgroundHeight) {
        const scaleX = clientWidth / backgroundWidth;
        const scaleY = clientHeight / backgroundHeight;
        let scale = Math.min(scaleX, scaleY, 1);
        // Shrink to 2/3 when overlay is active so corners can extend past edges
        if (hasOverlay) scale *= 0.66;
        const x = (clientWidth - backgroundWidth * scale) / 2;
        const y = (clientHeight - backgroundHeight * scale) / 2;
        setStageTransform(scale, x, y);
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [backgroundWidth, backgroundHeight, hasOverlay, setCanvasSize, setStageTransform]);

  // Handle click/tap on stage — either place pending stamp or deselect
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const pending = useProjectStore.getState().pendingStampAssetId;

      // Convert pointer to canvas coords
      const stage = stageRef.current;
      if (stage) {
        const pos = stage.getPointerPosition();
        if (pos) {
          const currentScale = useProjectStore.getState().stageScale;
          const currentX = useProjectStore.getState().stageX;
          const currentY = useProjectStore.getState().stageY;
          const canvasPos = {
            x: (pos.x - currentX) / currentScale,
            y: (pos.y - currentY) / currentScale,
          };

          // Place pending stamp
          if (pending && backgroundImage) {
            addStamp(pending, canvasPos.x, canvasPos.y);
            return;
          }
        }
      }

      // Clicked on empty stage area — deselect
      if (e.target === e.target.getStage()) {
        selectStamp(null);
      }
    },
    [backgroundImage, stageRef, addStamp, selectStamp]
  );

  // Scroll-wheel zoom (desktop only, intentional)
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.08;
      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.max(0.1, Math.min(5, newScale));

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      const newX = pointer.x - mousePointTo.x * clampedScale;
      const newY = pointer.y - mousePointTo.y * clampedScale;

      setStageTransform(clampedScale, newX, newY);
    },
    [stageRef, setStageTransform]
  );

  // Handle drop from stamp library (desktop)
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const assetId = e.dataTransfer.getData('stamp-asset-id');
      if (!assetId) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const currentScale = useProjectStore.getState().stageScale;
      const currentX = useProjectStore.getState().stageX;
      const currentY = useProjectStore.getState().stageY;
      const x = (e.clientX - rect.left - currentX) / currentScale;
      const y = (e.clientY - rect.top - currentY) / currentScale;
      addStamp(assetId, x, y);
    },
    [addStamp]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Eraser handlers
  const getCanvasPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    const s = useProjectStore.getState();
    return {
      x: (pos.x - s.stageX) / s.stageScale,
      y: (pos.y - s.stageY) / s.stageScale,
    };
  }, [stageRef]);

  const handleMouseDown = useCallback((_e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (useProjectStore.getState().toolMode !== 'eraser') return;
    eraserActive.current = true;
    PlanOverlay.onEraseStart();
    const pos = getCanvasPos();
    if (pos) PlanOverlay.onEraseMove(pos.x, pos.y);
  }, [getCanvasPos]);

  const handleMouseMove = useCallback((_e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!eraserActive.current) return;
    const pos = getCanvasPos();
    if (pos) PlanOverlay.onEraseMove(pos.x, pos.y);
  }, [getCanvasPos]);

  const handleMouseUp = useCallback(() => {
    if (!eraserActive.current) return;
    eraserActive.current = false;
    PlanOverlay.onEraseEnd();
  }, []);

  // Sort stamps by Y position for natural depth ordering:
  // stamps closer to horizon (smaller Y) render behind,
  // stamps closer to foreground (larger Y) render in front
  const sortedStamps = [...stamps].sort((a, b) => a.y - b.y);

  // Show placement cursor when there's a pending stamp
  const cursorClass = toolMode === 'eraser' ? 'cursor-crosshair' : pendingStampAssetId ? 'cursor-crosshair' : '';

  return (
    <div
      ref={containerRef}
      className={`flex-1 bg-gray-100 relative overflow-hidden ${cursorClass}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {!backgroundImage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center text-gray-400">
            <p className="text-lg font-medium">Upload a photo to get started</p>
            <p className="text-sm mt-1">Use the Upload button in the toolbar</p>
          </div>
        </div>
      )}

      {/* Eraser mode indicator */}
      {toolMode === 'eraser' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-3 py-1 rounded-full text-xs font-medium z-10 pointer-events-none">
          Draw to erase overlay
        </div>
      )}

      {/* Pending stamp indicator */}
      {pendingStampAssetId && backgroundImage && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium z-10 pointer-events-none">
          Tap on photo to place plant
        </div>
      )}

      <Stage
        ref={stageRef}
        width={canvasWidth || 1}
        height={canvasHeight || 1}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stageX}
        y={stageY}
        draggable={false}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Background photo layer */}
        <Layer listening={false}>
          <BackgroundImage />
        </Layer>

        {/* Plan overlay layer (warped plan image) */}
        <Layer>
          <PlanOverlay />
        </Layer>

        {/* Stamps layer */}
        <Layer>
          {sortedStamps.map((stamp) => (
            <PlantStamp
              key={stamp.id}
              stamp={stamp}
              isSelected={stamp.id === selectedStampId}
            />
          ))}
        </Layer>

        {/* Perspective guides + calibration layer (on top) */}
        <Layer>
          {backgroundImage && <PerspectiveGuides />}
          {backgroundImage && <CalibrationOverlay />}
        </Layer>
      </Stage>
    </div>
  );
}
