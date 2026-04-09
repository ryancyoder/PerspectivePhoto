import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { useProjectStore } from '../../store/useProjectStore';
import { usePlanSymbolStore } from '../../store/useCustomStampStore';
import { PlanStamp } from './PlanStamp';
import { DuplicateStampMode } from '../Canvas/EditorCanvas';
import type { Point2D } from '../../types';

export function PlanViewCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const canvasWidth = useProjectStore((s) => s.canvasWidth);
  const canvasHeight = useProjectStore((s) => s.canvasHeight);
  const planView = useProjectStore((s) => s.planView);
  const planStamps = useProjectStore((s) => s.planStamps);
  const selectedStampId = useProjectStore((s) => s.selectedStampId);
  const selectStamp = useProjectStore((s) => s.selectStamp);
  const addPlanStamp = useProjectStore((s) => s.addPlanStamp);
  const setCanvasSize = useProjectStore((s) => s.setCanvasSize);
  const setPlanSelection = useProjectStore((s) => s.setPlanSelection);

  const [planImage, setPlanImage] = useState<HTMLImageElement | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // Polygon selection state
  const [polygonMode, setPolygonMode] = useState(false);
  const [points, setPoints] = useState<Point2D[]>([]);
  const [isClosed, setIsClosed] = useState(false);

  // Track stamp being placed (press-drag-release)
  const placingStampId = useRef<string | null>(null);
  const placingPointerId = useRef<number | null>(null);
  // Cache the source stamp for stamp-gun mode so it doesn't change between taps
  const stampGunSource = useRef<{ assetId: string; manualScale: number; rotation: number; flipX: boolean; opacity: number } | null>(null);

  // Sort plan stamps by category render order:
  // ground-cover (bottom) → perennials → shrubs → grasses → columnar → ornamental → shade-trees (top)
  const CATEGORY_ORDER: Record<string, number> = {
    'ground-cover': 0,
    'perennials': 1,
    'shrubs': 2,
    'grasses': 3,
    'columnar': 4,
    'ornamental-trees': 5,
    'shade-trees': 6,
    'custom': 3,
    'textures': -1,
  };
  const planSymbolsStore = usePlanSymbolStore.getState();
  const sortedPlanStamps = [...planStamps].sort((a, b) => {
    const catA = planSymbolsStore.getSymbol(a.assetId)?.category ?? 'custom';
    const catB = planSymbolsStore.getSymbol(b.assetId)?.category ?? 'custom';
    return (CATEGORY_ORDER[catA] ?? 3) - (CATEGORY_ORDER[catB] ?? 3);
  });

  useEffect(() => {
    if (!planView.image) { setPlanImage(null); return; }
    const img = new window.Image();
    img.src = planView.image;
    img.onload = () => setPlanImage(img);
  }, [planView.image]);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setCanvasSize(clientWidth, clientHeight);
      if (planView.imageWidth && planView.imageHeight) {
        const s = Math.min(clientWidth / planView.imageWidth, clientHeight / planView.imageHeight, 1);
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

  const clientToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (clientX - rect.left - stagePos.x) / stageScale,
      y: (clientY - rect.top - stagePos.y) / stageScale,
    };
  }, [stagePos, stageScale]);

  // Press-drag-release placement for plan stamps
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isOverCanvas = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      return e.clientX >= rect.left && e.clientX <= rect.right &&
             e.clientY >= rect.top && e.clientY <= rect.bottom;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (!isOverCanvas(e)) return;
      const state = useProjectStore.getState();
      if (state.moveOnly) return;

      // Stamp-gun mode — duplicate selected plan stamp at tap position
      if (DuplicateStampMode.active) {
        // Cache source on first use
        if (!stampGunSource.current) {
          const src = state.planStamps.find((s) => s.id === state.selectedStampId);
          if (!src) return;
          stampGunSource.current = {
            assetId: src.assetId,
            manualScale: src.manualScale,
            rotation: src.rotation,
            flipX: src.flipX,
            opacity: src.opacity,
          };
        }

        const pos = clientToCanvas(e.clientX, e.clientY);
        if (!pos) return;

        e.preventDefault();
        e.stopPropagation();

        const src = stampGunSource.current;
        addPlanStamp(src.assetId, pos.x, pos.y);
        const newId = useProjectStore.getState().selectedStampId;
        if (newId) {
          useProjectStore.getState().updatePlanStamp(newId, {
            manualScale: src.manualScale,
            rotation: src.rotation,
            flipX: src.flipX,
            opacity: src.opacity,
          });
          placingStampId.current = newId;
          placingPointerId.current = e.pointerId;
        }
        return;
      }

      // Clear stamp-gun cache when not in stamp-gun mode
      stampGunSource.current = null;

      // Pending stamp placement
      if (!state.pendingStampAssetId) return;

      const pos = clientToCanvas(e.clientX, e.clientY);
      if (!pos) return;

      e.preventDefault();
      e.stopPropagation();

      addPlanStamp(state.pendingStampAssetId, pos.x, pos.y);
      const newId = useProjectStore.getState().selectedStampId;
      if (newId) {
        placingStampId.current = newId;
        placingPointerId.current = e.pointerId;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!placingStampId.current || e.pointerId !== placingPointerId.current) return;
      e.preventDefault();
      const pos = clientToCanvas(e.clientX, e.clientY);
      if (pos) {
        useProjectStore.getState().updatePlanStamp(placingStampId.current, { x: pos.x, y: pos.y });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!placingStampId.current || e.pointerId !== placingPointerId.current) return;
      const pos = clientToCanvas(e.clientX, e.clientY);
      if (pos) {
        useProjectStore.getState().updatePlanStamp(placingStampId.current, { x: pos.x, y: pos.y });
      }
      placingStampId.current = null;
      placingPointerId.current = null;
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('pointerup', handlePointerUp, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointermove', handlePointerMove, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
    };
  }, [clientToCanvas, addPlanStamp]);

  // Konva click — polygon selection or deselect
  const getPlanPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return { x: (pos.x - stagePos.x) / stageScale, y: (pos.y - stagePos.y) / stageScale };
  }, [stagePos, stageScale]);

  const handleTap = useCallback(() => {
    const state = useProjectStore.getState();
    if (state.pendingStampAssetId) return;

    // Only do polygon selection when polygon mode is active
    if (polygonMode && !isClosed && planView.image) {
      const pos = getPlanPos();
      if (!pos) return;
      if (points.length >= 3) {
        const first = points[0];
        const dist = Math.sqrt((pos.x - first.x) ** 2 + (pos.y - first.y) ** 2);
        if (dist < 25 / stageScale) { closeAndCrop(); return; }
      }
      setPoints((prev) => [...prev, pos]);
      return;
    }
  }, [polygonMode, isClosed, getPlanPos, points, stageScale, planView.image]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (useProjectStore.getState().pendingStampAssetId) return;
    if (polygonMode) return;
    if (e.target === e.target.getStage()) {
      selectStamp(null);
    }
  }, [selectStamp, polygonMode]);

  const closeAndCrop = useCallback(() => {
    if (points.length < 3 || !planImage) return;
    setIsClosed(true);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
    minX = Math.max(0, Math.floor(minX)); minY = Math.max(0, Math.floor(minY));
    maxX = Math.min(planView.imageWidth, Math.ceil(maxX)); maxY = Math.min(planView.imageHeight, Math.ceil(maxY));
    const w = maxX - minX, h = maxY - minY;
    if (w < 10 || h < 10) return;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = w; cropCanvas.height = h;
    const ctx = cropCanvas.getContext('2d')!;
    ctx.beginPath(); ctx.moveTo(points[0].x - minX, points[0].y - minY);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x - minX, points[i].y - minY);
    ctx.closePath(); ctx.clip();
    ctx.drawImage(planImage, minX, minY, w, h, 0, 0, w, h);
    setPlanSelection(cropCanvas.toDataURL('image/png'), w, h);
    setTimeout(() => { setPoints([]); setIsClosed(false); }, 300);
  }, [points, planImage, planView.imageWidth, planView.imageHeight, setPlanSelection]);

  const flatPoints = points.flatMap((p) => [p.x, p.y]);
  const hasPending = !!useProjectStore((s) => s.pendingStampAssetId);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-gray-50 overflow-hidden" style={{ touchAction: 'none' }}>
      {/* Top bar: instructions + polygon toggle */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex gap-2 items-center">
        {hasPending && (
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium pointer-events-none">
            Press and drag to place symbol
          </div>
        )}
        {!hasPending && !polygonMode && (
          <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium pointer-events-none">
            Plan View
          </div>
        )}
        {polygonMode && (
          <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-medium pointer-events-none">
            {points.length === 0 ? 'Tap to draw selection polygon'
              : points.length < 3 ? `Tap to add points (${points.length}/3 min)`
              : 'Tap first point to close, or keep adding'}
          </div>
        )}
        <button
          onClick={() => { setPolygonMode(!polygonMode); setPoints([]); setIsClosed(false); }}
          className={`px-3 py-1 rounded-full text-xs font-medium shadow transition-colors ${
            polygonMode ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border border-gray-300'
          }`}
        >
          {polygonMode ? 'Exit Polygon' : 'Polygon Select'}
        </button>
      </div>

      {polygonMode && points.length > 0 && !isClosed && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          <button onClick={() => { setPoints([]); setIsClosed(false); }} className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-medium shadow">Clear</button>
          <button onClick={() => setPoints((p) => p.slice(0, -1))} className="px-3 py-1 bg-gray-500 text-white rounded-full text-xs font-medium shadow">Undo Point</button>
          {points.length >= 3 && <button onClick={closeAndCrop} className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-medium shadow">Done</button>}
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
          onClick={(e) => { handleTap(); handleStageClick(e); }}
          onTap={(e) => { handleTap(); handleStageClick(e); }}
        >
          {/* Plan image */}
          <Layer listening={false}>
            {planImage && (
              <KonvaImage image={planImage} x={0} y={0} width={planView.imageWidth} height={planView.imageHeight} />
            )}
          </Layer>

          {/* Placed plan symbols — sorted by category layer order */}
          <Layer>
            {sortedPlanStamps.map((stamp) => (
              <PlanStamp key={stamp.id} stamp={stamp} isSelected={stamp.id === selectedStampId} />
            ))}
          </Layer>

          {/* Selection polygon overlay */}
          <Layer listening={false}>
            {points.length > 0 && (
              <Rect x={0} y={0} width={planView.imageWidth} height={planView.imageHeight} fill="rgba(0,0,0,0.25)" />
            )}
            {points.length >= 2 && (
              <Line points={flatPoints} stroke="#3b82f6" strokeWidth={3 / stageScale} closed={isClosed} fill={isClosed ? 'rgba(59,130,246,0.15)' : undefined} />
            )}
            {points.map((p, i) => (
              <Circle key={i} x={p.x} y={p.y} radius={i === 0 && points.length >= 3 ? 12 / stageScale : 6 / stageScale} fill={i === 0 ? '#22c55e' : '#3b82f6'} stroke="#fff" strokeWidth={2 / stageScale} />
            ))}
            {points.length >= 3 && !isClosed && (
              <Text x={points[0].x + 14 / stageScale} y={points[0].y - 8 / stageScale} text="Tap to close" fontSize={12 / stageScale} fill="#22c55e" fontStyle="bold" />
            )}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
