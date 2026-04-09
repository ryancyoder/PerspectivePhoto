import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import { useProjectStore } from '../../store/useProjectStore';

/**
 * Plan view — shows the uploaded plan image for reference.
 * The actual perspective warp overlay is rendered on the photo view
 * via PlanOverlay with draggable corners.
 */
export function PlanViewCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  const canvasWidth = useProjectStore((s) => s.canvasWidth);
  const canvasHeight = useProjectStore((s) => s.canvasHeight);
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

  return (
    <div ref={containerRef} className="flex-1 bg-gray-50 relative overflow-hidden">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          Plan View — switch to Photo to see warped overlay
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
          width={canvasWidth || 1}
          height={canvasHeight || 1}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          draggable={false}
        >
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
        </Stage>
      )}
    </div>
  );
}
