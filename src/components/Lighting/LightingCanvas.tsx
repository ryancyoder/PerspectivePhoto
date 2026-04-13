import { useRef, useCallback, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import { useProjectStore } from '../../store/useProjectStore';
import { LightingOverlay } from './LightingOverlay';
import { LightMarker } from './LightMarker';
import { LightPropertiesPanel } from './LightPropertiesPanel';

export function LightingCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundImage = useProjectStore((s) => s.backgroundImage);
  const bgWidth = useProjectStore((s) => s.backgroundWidth);
  const bgHeight = useProjectStore((s) => s.backgroundHeight);
  const canvasWidth = useProjectStore((s) => s.canvasWidth);
  const canvasHeight = useProjectStore((s) => s.canvasHeight);
  const setCanvasSize = useProjectStore((s) => s.setCanvasSize);
  const stageScale = useProjectStore((s) => s.stageScale);
  const stageX = useProjectStore((s) => s.stageX);
  const stageY = useProjectStore((s) => s.stageY);
  const setStageTransform = useProjectStore((s) => s.setStageTransform);

  const lightingConfig = useProjectStore((s) => s.lightingConfig);
  const selectedLightId = useProjectStore((s) => s.selectedLightId);
  const selectLight = useProjectStore((s) => s.selectLight);
  const updateLight = useProjectStore((s) => s.updateLight);
  const addLight = useProjectStore((s) => s.addLight);
  const toolMode = useProjectStore((s) => s.toolMode);
  const pendingLightType = useProjectStore((s) => s.pendingLightType);

  // Resize to fill container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setCanvasSize(Math.round(entry.contentRect.width), Math.round(entry.contentRect.height));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [setCanvasSize]);

  // Fit image to canvas on load
  useEffect(() => {
    if (!bgWidth || !bgHeight || !canvasWidth || !canvasHeight) return;
    const scale = Math.min(canvasWidth / bgWidth, canvasHeight / bgHeight, 1);
    const x = (canvasWidth - bgWidth * scale) / 2;
    const y = (canvasHeight - bgHeight * scale) / 2;
    setStageTransform(scale, x, y);
  }, [bgWidth, bgHeight, canvasWidth, canvasHeight, setStageTransform]);

  // Zoom via scroll wheel
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const oldScale = stageScale;
    const factor = e.evt.deltaY < 0 ? 1.08 : 1 / 1.08;
    const newScale = Math.max(0.1, Math.min(5, oldScale * factor));
    const mouseX = (pointer.x - stageX) / oldScale;
    const mouseY = (pointer.y - stageY) / oldScale;
    setStageTransform(newScale, pointer.x - mouseX * newScale, pointer.y - mouseY * newScale);
  }, [stageScale, stageX, stageY, setStageTransform]);

  // Click to place light or deselect
  const handleStageClick = useCallback((e: any) => {
    const stage = e.target.getStage();
    // Only handle clicks directly on the stage (empty area) or the overlay image
    if (e.target !== stage && e.target.getLayer()?.listening()) {
      // Clicked on an interactive element (like a LightMarker) — let it handle
      return;
    }

    if (toolMode === 'placeLight' && pendingLightType && stage) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      // Convert to image-space normalized coords
      const imgX = (pointer.x - stageX) / stageScale;
      const imgY = (pointer.y - stageY) / stageScale;
      const normX = imgX / bgWidth;
      const normY = imgY / bgHeight;
      if (normX >= 0 && normX <= 1 && normY >= 0 && normY <= 1) {
        addLight(normX, normY, pendingLightType);
      }
    } else {
      selectLight(null);
    }
  }, [toolMode, pendingLightType, stageX, stageY, stageScale, bgWidth, bgHeight, addLight, selectLight]);

  const isPlacing = toolMode === 'placeLight' && !!pendingLightType;

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ cursor: isPlacing ? 'crosshair' : 'default' }}>
      <Stage
        width={canvasWidth}
        height={canvasHeight}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stageX}
        y={stageY}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        {/* Layer 0: Composited night scene */}
        <Layer listening={false}>
          {backgroundImage && bgWidth > 0 && bgHeight > 0 && (
            <LightingOverlay
              backgroundImage={backgroundImage}
              bgWidth={bgWidth}
              bgHeight={bgHeight}
              lights={lightingConfig.lights}
              overlayColor={lightingConfig.overlayColor}
              overlayOpacity={lightingConfig.overlayOpacity}
            />
          )}
        </Layer>

        {/* Layer 1: Interactive light markers */}
        <Layer>
          {lightingConfig.lights.map((light) => (
            <LightMarker
              key={light.id}
              light={light}
              bgWidth={bgWidth}
              bgHeight={bgHeight}
              isSelected={selectedLightId === light.id}
              onSelect={() => selectLight(light.id)}
              onMove={(x, y) => updateLight(light.id, { x, y })}
            />
          ))}
        </Layer>
      </Stage>

      {/* Placement mode indicator */}
      {isPlacing && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg pointer-events-none">
          Tap to place {pendingLightType}
        </div>
      )}

      {/* No image prompt */}
      {!backgroundImage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-400 text-lg">Upload a photo first, then switch to Lighting view</p>
        </div>
      )}

      {/* Properties panel */}
      <LightPropertiesPanel />
    </div>
  );
}
