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
  const stageScale = useProjectStore((s) => s.stageScale);
  const stageX = useProjectStore((s) => s.stageX);
  const stageY = useProjectStore((s) => s.stageY);
  const setStageTransform = useProjectStore((s) => s.setStageTransform);
  const setCanvasSize = useProjectStore((s) => s.setCanvasSize);
  const addStamp = useProjectStore((s) => s.addStamp);
  const pendingStampAssetId = useProjectStore((s) => s.pendingStampAssetId);

  // Fit canvas to container — photo stays locked in place
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setCanvasSize(clientWidth, clientHeight);

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

  // Handle click/tap on stage — either place pending stamp or deselect
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const pending = useProjectStore.getState().pendingStampAssetId;

      if (pending && backgroundImage) {
        const stage = stageRef.current;
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;
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

  // Sort stamps by zIndex for rendering order
  const sortedStamps = [...stamps].sort((a, b) => a.zIndex - b.zIndex);

  // Show placement cursor when there's a pending stamp
  const cursorClass = pendingStampAssetId ? 'cursor-crosshair' : '';

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 bg-gray-100 overflow-hidden ${cursorClass}`}
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
        draggable={false}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
      >
        {/* Background photo layer */}
        <Layer listening={false}>
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
