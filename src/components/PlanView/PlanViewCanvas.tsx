import { useRef, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { useProjectStore } from '../../store/useProjectStore';
import { photoToPlan, planToPhoto, computeCanopyRadius, computePlanBounds, DEFAULT_PLAN_SCALE } from '../../engine/planMapping';
import { getAssetById } from '../../engine/stampAssets';
import { PlanGrid } from './PlanGrid';
import { PlanStampCircle } from './PlanStampCircle';

export function PlanViewCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const canvasWidth = useProjectStore((s) => s.canvasWidth);
  const canvasHeight = useProjectStore((s) => s.canvasHeight);
  const stamps = useProjectStore((s) => s.stamps);
  const perspective = useProjectStore((s) => s.perspective);
  const selectedStampId = useProjectStore((s) => s.selectedStampId);
  const selectStamp = useProjectStore((s) => s.selectStamp);
  const addStamp = useProjectStore((s) => s.addStamp);
  const pendingStampAssetId = useProjectStore((s) => s.pendingStampAssetId);
  const scaleReference = useProjectStore((s) => s.scaleReference);
  const setCanvasSize = useProjectStore((s) => s.setCanvasSize);

  // Compute plan positions for all stamps
  const planStamps = useMemo(() => {
    return stamps.map((stamp) => {
      const { planX, planY } = photoToPlan(stamp.x, stamp.y, perspective, DEFAULT_PLAN_SCALE);
      const isCustom = stamp.assetId.startsWith('custom-');
      const asset = isCustom ? null : getAssetById(stamp.assetId);
      const defaultWidth = asset?.defaultWidth ?? 100;
      const radius = computeCanopyRadius(defaultWidth, stamp.manualScale);
      return { stamp, planX, planY, radius, defaultWidth };
    });
  }, [stamps, perspective]);

  // Compute bounds to fit all stamps
  const bounds = useMemo(() => {
    const stampData = stamps.map((s) => {
      const isCustom = s.assetId.startsWith('custom-');
      const asset = isCustom ? null : getAssetById(s.assetId);
      return { x: s.x, y: s.y, manualScale: s.manualScale, defaultWidth: asset?.defaultWidth ?? 100 };
    });
    return computePlanBounds(stampData, perspective, DEFAULT_PLAN_SCALE);
  }, [stamps, perspective]);

  // Fit plan view to show all stamps
  const planTransform = useMemo(() => {
    const rangeX = bounds.maxX - bounds.minX;
    const rangeY = bounds.maxY - bounds.minY;
    if (rangeX <= 0 || rangeY <= 0) return { scale: 1, x: canvasWidth / 2, y: canvasHeight / 2 };

    const scaleX = canvasWidth / rangeX;
    const scaleY = canvasHeight / rangeY;
    const scale = Math.min(scaleX, scaleY) * 0.9;

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    return {
      scale,
      x: canvasWidth / 2 - centerX * scale,
      y: canvasHeight / 2 - centerY * scale,
    };
  }, [bounds, canvasWidth, canvasHeight]);

  // Fit canvas to container
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setCanvasSize(clientWidth, clientHeight);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [setCanvasSize]);

  // Handle tap to place stamp or deselect
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const pending = useProjectStore.getState().pendingStampAssetId;

      if (pending) {
        const stage = stageRef.current;
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;
        // Convert screen → plan → photo
        const planX = (pos.x - planTransform.x) / planTransform.scale;
        const planY = (pos.y - planTransform.y) / planTransform.scale;
        const { photoX, photoY } = planToPhoto(planX, planY, perspective, DEFAULT_PLAN_SCALE);
        addStamp(pending, photoX, photoY);
        return;
      }

      if (e.target === e.target.getStage()) {
        selectStamp(null);
      }
    },
    [planTransform, perspective, addStamp, selectStamp]
  );

  // Sort by planY for correct depth rendering (further = behind)
  const sortedPlanStamps = [...planStamps].sort((a, b) => a.planY - b.planY);

  return (
    <div ref={containerRef} className="flex-1 bg-white relative overflow-hidden">
      {/* View label */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium z-10 pointer-events-none">
        Plan View — Bird's Eye
      </div>

      {/* Pending stamp hint */}
      {pendingStampAssetId && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium z-10 pointer-events-none">
          Tap to place plant
        </div>
      )}

      {/* Scale info */}
      {!scaleReference && stamps.length > 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-medium z-10 pointer-events-none">
          Grid shows relative spacing — set scale in toolbar for feet
        </div>
      )}

      <Stage
        ref={stageRef}
        width={canvasWidth || 1}
        height={canvasHeight || 1}
        scaleX={planTransform.scale}
        scaleY={planTransform.scale}
        x={planTransform.x}
        y={planTransform.y}
        draggable={false}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        {/* Background + Grid */}
        <Layer listening={false}>
          <Rect
            x={bounds.minX}
            y={bounds.minY}
            width={bounds.maxX - bounds.minX}
            height={bounds.maxY - bounds.minY}
            fill="#fafafa"
          />
          <PlanGrid bounds={bounds} scaleReference={scaleReference} />

          {/* Direction labels */}
          <Text
            x={-30}
            y={bounds.minY + 5}
            text="← FARTHER"
            fontSize={11}
            fill="#aaa"
            fontStyle="bold"
            rotation={90}
            listening={false}
          />
          <Text
            x={-30}
            y={bounds.maxY - 60}
            text="← CLOSER"
            fontSize={11}
            fill="#aaa"
            fontStyle="bold"
            rotation={90}
            listening={false}
          />
        </Layer>

        {/* Stamp circles */}
        <Layer>
          {sortedPlanStamps.map(({ stamp, planX, planY, radius }) => (
            <PlanStampCircle
              key={stamp.id}
              stamp={stamp}
              planX={planX}
              planY={planY}
              radius={radius}
              isSelected={stamp.id === selectedStampId}
              planScale={DEFAULT_PLAN_SCALE}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
