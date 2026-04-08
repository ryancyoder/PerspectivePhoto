import { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { useProjectStore } from '../../store/useProjectStore';
import { BackgroundImage } from './BackgroundImage';
import { PerspectiveGuides } from './PerspectiveGuides';
import { PlantStamp } from './PlantStamp';
import { CalibrationOverlay } from './CalibrationOverlay';

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
  const toolMode = useProjectStore((s) => s.toolMode);
  const stageScale = useProjectStore((s) => s.stageScale);
  const stageX = useProjectStore((s) => s.stageX);
  const stageY = useProjectStore((s) => s.stageY);
  const setStageTransform = useProjectStore((s) => s.setStageTransform);
  const setCanvasSize = useProjectStore((s) => s.setCanvasSize);
  const addStamp = useProjectStore((s) => s.addStamp);
  const pendingStampAssetId = useProjectStore((s) => s.pendingStampAssetId);

  // Fit canvas to container
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setCanvasSize(clientWidth, clientHeight);

      // If we have a background, fit it to view
      if (backgroundWidth && backgroundHeight) {
        const scaleX = clientWidth / backgroundWidth;
        const scaleY = clientHeight / backgroundHeight;
        const scale = Math.min(scaleX, scaleY, 1);
        const x = (clientWidth - backgroundWidth * scale) / 2;
        const y = (clientHeight - backgroundHeight * scale) / 2;
        setStageTransform(scale, x, y);
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [backgroundWidth, backgroundHeight, setCanvasSize, setStageTransform]);

  // Convert a screen point to canvas (stage) coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const currentScale = useProjectStore.getState().stageScale;
      const currentX = useProjectStore.getState().stageX;
      const currentY = useProjectStore.getState().stageY;
      return {
        x: (screenX - rect.left - currentX) / currentScale,
        y: (screenY - rect.top - currentY) / currentScale,
      };
    },
    []
  );

  // Handle click/tap on stage — either place pending stamp or deselect
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const pending = useProjectStore.getState().pendingStampAssetId;

      if (pending && backgroundImage) {
        // Place the pending stamp at the click position
        const stage = stageRef.current;
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;
        // Convert from screen to canvas coordinates
        const currentScale = useProjectStore.getState().stageScale;
        const currentX = useProjectStore.getState().stageX;
        const currentY = useProjectStore.getState().stageY;
        const canvasPos = {
          x: (pos.x - currentX) / currentScale,
          y: (pos.y - currentY) / currentScale,
        };
        addStamp(pending, canvasPos.x, canvasPos.y);
        return;
      }

      // If we clicked on the stage background (not a stamp), deselect
      if (e.target === e.target.getStage()) {
        selectStamp(null);
      }
    },
    [backgroundImage, stageRef, addStamp, selectStamp]
  );

  // Handle pinch-to-zoom and scroll-to-zoom
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

  // Handle touch pinch zoom
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number>(0);

  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];
      if (!touch1 || !touch2) return;

      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const p1 = { x: touch1.clientX, y: touch1.clientY };
      const p2 = { x: touch2.clientX, y: touch2.clientY };

      const center = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };
      const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);

      if (!lastCenter.current) {
        lastCenter.current = center;
        lastDist.current = dist;
        return;
      }

      const scale = stage.scaleX() * (dist / lastDist.current);
      const clampedScale = Math.max(0.1, Math.min(5, scale));

      const dx = center.x - lastCenter.current.x;
      const dy = center.y - lastCenter.current.y;

      setStageTransform(clampedScale, stage.x() + dx, stage.y() + dy);

      lastCenter.current = center;
      lastDist.current = dist;
    },
    [stageRef, setStageTransform]
  );

  const handleTouchEnd = useCallback(() => {
    lastCenter.current = null;
    lastDist.current = 0;
  }, []);

  // Handle drop from stamp library (desktop drag-and-drop)
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const assetId = e.dataTransfer.getData('stamp-asset-id');
      if (!assetId) return;

      const pos = screenToCanvas(e.clientX, e.clientY);
      addStamp(assetId, pos.x, pos.y);
    },
    [screenToCanvas, addStamp]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Sort stamps by zIndex for rendering order
  const sortedStamps = [...stamps].sort((a, b) => a.zIndex - b.zIndex);

  // Determine if stage should be draggable (pan mode)
  const isDraggable = toolMode === 'pan';

  // Show placement cursor when there's a pending stamp
  const cursorClass = pendingStampAssetId ? 'cursor-crosshair' : '';

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

      {/* Pending stamp indicator */}
      {pendingStampAssetId && backgroundImage && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium z-10 pointer-events-none">
          Tap on photo to place plant
        </div>
      )}

      <Stage
        ref={stageRef}
        width={canvasWidth}
        height={canvasHeight}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stageX}
        y={stageY}
        draggable={isDraggable}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDragEnd={(e) => {
          if (isDraggable) {
            setStageTransform(stageScale, e.target.x(), e.target.y());
          }
        }}
      >
        {/* Background photo layer */}
        <Layer>
          <BackgroundImage />
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
