import { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Text, Group } from 'react-konva';
import Konva from 'konva';
import { useProjectStore } from '../../store/useProjectStore';
import { applyHomography } from '../../engine/homography';
import { getAssetById } from '../../engine/stampAssets';
import { useCustomStampStore } from '../../store/useCustomStampStore';
import { PointMatcher } from './PointMatcher';

export function PlanViewCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const canvasWidth = useProjectStore((s) => s.canvasWidth);
  const canvasHeight = useProjectStore((s) => s.canvasHeight);
  const stamps = useProjectStore((s) => s.stamps);
  const selectedStampId = useProjectStore((s) => s.selectedStampId);
  const selectStamp = useProjectStore((s) => s.selectStamp);
  const updateStamp = useProjectStore((s) => s.updateStamp);
  const addStamp = useProjectStore((s) => s.addStamp);
  const pushHistory = useProjectStore((s) => s.pushHistory);
  const pendingStampAssetId = useProjectStore((s) => s.pendingStampAssetId);
  const planView = useProjectStore((s) => s.planView);
  const setCanvasSize = useProjectStore((s) => s.setCanvasSize);

  const [planImage, setPlanImage] = useState<HTMLImageElement | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

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

  // Map photo stamps to plan coordinates via homography
  const mappedStamps = stamps.map((stamp) => {
    if (!planView.homography) return null;
    const planPos = applyHomography(planView.homography, stamp.x, stamp.y);
    const isCustom = stamp.assetId.startsWith('custom-');
    const asset = isCustom ? null : getAssetById(stamp.assetId);
    const customStamp = isCustom ? useCustomStampStore.getState().getStamp(stamp.assetId) : null;
    const name = asset?.name ?? customStamp?.name ?? '?';
    const color = asset?.colors[0] ?? '#4a90d9';
    const radius = Math.max(8, (asset?.defaultWidth ?? 50) * stamp.manualScale * 0.4);
    return { stamp, planX: planPos.x, planY: planPos.y, name, color, radius };
  }).filter(Boolean) as { stamp: typeof stamps[0]; planX: number; planY: number; name: string; color: string; radius: number }[];

  // Handle tap — point matching, place stamp, or deselect
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const planX = (pos.x - stagePos.x) / stageScale;
      const planY = (pos.y - stagePos.y) / stageScale;

      // Point matching takes priority
      if (PointMatcher.activeStep === 'plan') {
        PointMatcher.onCanvasTap(planX, planY);
        return;
      }

      const pending = useProjectStore.getState().pendingStampAssetId;
      const pv = useProjectStore.getState().planView;

      if (pending && pv.inverseHomography) {
        const photoPos = applyHomography(pv.inverseHomography, planX, planY);
        addStamp(pending, photoPos.x, photoPos.y);
        return;
      }

      if (e.target === e.target.getStage()) {
        selectStamp(null);
      }
    },
    [stagePos, stageScale, addStamp, selectStamp]
  );

  // Handle circle drag in plan view → convert back to photo coords
  const handleCircleDrag = useCallback(
    (stampId: string, newPlanX: number, newPlanY: number) => {
      const pv = useProjectStore.getState().planView;
      if (!pv.inverseHomography) return;
      const photoPos = applyHomography(pv.inverseHomography, newPlanX, newPlanY);
      updateStamp(stampId, { x: photoPos.x, y: photoPos.y });
    },
    [updateStamp]
  );

  const hasHomography = !!planView.homography;
  const pointCount = planView.matchedPoints.length;

  return (
    <div ref={containerRef} className="flex-1 bg-gray-50 relative overflow-hidden">
      {/* Status badges */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex gap-2 pointer-events-none">
        <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          Plan View
        </div>
        {!planView.image && (
          <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-medium">
            Upload a plan image in toolbar
          </div>
        )}
        {planView.image && pointCount < 2 && (
          <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-medium">
            Match {2 - pointCount} more point{2 - pointCount > 1 ? 's' : ''} to link views
          </div>
        )}
      </div>

      {pendingStampAssetId && hasHomography && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium z-10 pointer-events-none">
          Tap to place plant
        </div>
      )}

      {!planView.image ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p className="text-lg font-medium">No plan image yet</p>
            <p className="text-sm mt-1">Upload a site plan, aerial photo, or drawing in the toolbar</p>
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
          onClick={handleStageClick}
          onTap={handleStageClick}
        >
          {/* Plan image background */}
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

          {/* Matched point indicators */}
          <Layer listening={false}>
            {planView.matchedPoints.map((pt, i) => (
              <Group key={pt.id}>
                <Circle x={pt.planX} y={pt.planY} radius={8} fill="#f43f5e" stroke="#fff" strokeWidth={2} />
                <Text x={pt.planX + 10} y={pt.planY - 6} text={`${i + 1}`} fontSize={12} fill="#f43f5e" fontStyle="bold" />
              </Group>
            ))}
          </Layer>

          {/* Stamp circles (only shown when homography is available) */}
          <Layer>
            {mappedStamps.map(({ stamp, planX, planY, name, color, radius }) => (
              <Group
                key={stamp.id}
                x={planX}
                y={planY}
                draggable={hasHomography}
                onClick={() => selectStamp(stamp.id)}
                onTap={() => selectStamp(stamp.id)}
                onDragStart={() => pushHistory()}
                onDragEnd={(e) => handleCircleDrag(stamp.id, e.target.x(), e.target.y())}
              >
                <Circle
                  radius={radius}
                  fill={color}
                  opacity={stamp.id === selectedStampId ? 0.6 : 0.35}
                  stroke={stamp.id === selectedStampId ? '#2196f3' : color}
                  strokeWidth={stamp.id === selectedStampId ? 3 : 1.5}
                />
                <Text
                  text={name}
                  fontSize={Math.min(11, radius * 0.6)}
                  fill="#333"
                  align="center"
                  verticalAlign="middle"
                  width={radius * 2}
                  height={radius * 2}
                  offsetX={radius}
                  offsetY={radius}
                  listening={false}
                />
              </Group>
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
