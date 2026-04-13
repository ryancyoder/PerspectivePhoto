import { useRef, useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import type { LightSource } from '../../types';

interface Props {
  backgroundImage: string;
  bgWidth: number;
  bgHeight: number;
  lights: LightSource[];
  overlayColor: string;
  overlayOpacity: number;
  penMask: string | null;
  /** Exposed so LightingCanvas can draw strokes directly during a drag */
  penMaskCanvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
  /** Incremented by LightingCanvas on each pen stroke to trigger re-render */
  penMaskVersion?: number;
}

export function LightingOverlay({
  backgroundImage,
  bgWidth,
  bgHeight,
  lights,
  overlayColor,
  overlayOpacity,
  penMask,
  penMaskCanvasRef,
  penMaskVersion,
}: Props) {
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const internalMaskRef = useRef<HTMLCanvasElement | null>(null);
  const [displayCanvas, setDisplayCanvas] = useState<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);

  // Expose the internal mask canvas so LightingCanvas can paint on it
  useEffect(() => {
    if (penMaskCanvasRef) {
      if (!internalMaskRef.current && bgWidth && bgHeight) {
        internalMaskRef.current = document.createElement('canvas');
        internalMaskRef.current.width = bgWidth;
        internalMaskRef.current.height = bgHeight;
      }
      penMaskCanvasRef.current = internalMaskRef.current;
    }
  }, [penMaskCanvasRef, bgWidth, bgHeight]);

  // Load background image element
  useEffect(() => {
    if (!backgroundImage) return;
    const img = new window.Image();
    img.onload = () => {
      bgImageRef.current = img;
      render();
    };
    img.src = backgroundImage;
  }, [backgroundImage]);

  // Load persisted pen mask from data URL into the mask canvas
  useEffect(() => {
    if (!penMask || !bgWidth || !bgHeight) return;
    if (!internalMaskRef.current) {
      internalMaskRef.current = document.createElement('canvas');
    }
    const mc = internalMaskRef.current;
    mc.width = bgWidth;
    mc.height = bgHeight;
    const img = new window.Image();
    img.onload = () => {
      const ctx = mc.getContext('2d')!;
      ctx.clearRect(0, 0, bgWidth, bgHeight);
      ctx.drawImage(img, 0, 0);
      if (penMaskCanvasRef) penMaskCanvasRef.current = mc;
      render();
    };
    img.src = penMask;
  }, [penMask, bgWidth, bgHeight]);

  // Ensure offscreen canvases exist and are sized correctly
  useEffect(() => {
    if (!bgWidth || !bgHeight) return;
    if (!overlayCanvasRef.current) {
      overlayCanvasRef.current = document.createElement('canvas');
    }
    if (!displayCanvasRef.current) {
      displayCanvasRef.current = document.createElement('canvas');
    }
    overlayCanvasRef.current.width = bgWidth;
    overlayCanvasRef.current.height = bgHeight;
    displayCanvasRef.current.width = bgWidth;
    displayCanvasRef.current.height = bgHeight;
    if (!internalMaskRef.current) {
      internalMaskRef.current = document.createElement('canvas');
      internalMaskRef.current.width = bgWidth;
      internalMaskRef.current.height = bgHeight;
    }
  }, [bgWidth, bgHeight]);

  function render() {
    const bgImg = bgImageRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const dispCanvas = displayCanvasRef.current;
    if (!bgImg || !overlayCanvas || !dispCanvas || !bgWidth || !bgHeight) return;

    const w = bgWidth;
    const h = bgHeight;

    // ---- Overlay canvas: fill night color, punch out lights + pen mask ----
    const oCtx = overlayCanvas.getContext('2d')!;
    oCtx.clearRect(0, 0, w, h);

    // Solid fill with globalAlpha controlling darkness
    oCtx.globalCompositeOperation = 'source-over';
    oCtx.fillStyle = 'rgb(20, 0, 40)';
    oCtx.globalAlpha = Math.min(overlayOpacity, 1);
    oCtx.fillRect(0, 0, w, h);
    if (overlayOpacity > 0.5) {
      oCtx.globalAlpha = (overlayOpacity - 0.5) * 2;
      oCtx.fillRect(0, 0, w, h);
    }
    oCtx.globalAlpha = 1;

    // Punch holes for each light
    oCtx.globalCompositeOperation = 'destination-out';
    for (const light of lights) {
      const px = light.x * w;
      const py = light.y * h;
      const beam = light.beamAngle ?? 360;
      const dist = light.distance ?? light.radius;

      oCtx.save();
      oCtx.translate(px, py);
      oCtx.rotate((light.rotation * Math.PI) / 180);

      if (beam >= 360) {
        // Full omnidirectional light (path lights)
        oCtx.scale(light.spreadX, light.spreadY);
        const gradient = oCtx.createRadialGradient(0, 0, 0, 0, 0, light.radius);
        gradient.addColorStop(0, `rgba(0,0,0,${light.intensity})`);
        gradient.addColorStop(0.5, `rgba(0,0,0,${light.intensity * 0.5})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        oCtx.fillStyle = gradient;
        oCtx.beginPath();
        oCtx.arc(0, 0, light.radius, 0, Math.PI * 2);
        oCtx.fill();
      } else {
        // Cone/wedge beam — emanates upward from the source point
        // The cone points in the -Y direction (up), rotation controls aim
        const halfAngle = (beam / 2) * (Math.PI / 180);
        const startAngle = -Math.PI / 2 - halfAngle;
        const endAngle = -Math.PI / 2 + halfAngle;

        // Small glow at source point (always present)
        const sourceGlow = oCtx.createRadialGradient(0, 0, 0, 0, 0, dist * 0.12);
        sourceGlow.addColorStop(0, `rgba(0,0,0,${light.intensity})`);
        sourceGlow.addColorStop(1, `rgba(0,0,0,${light.intensity * 0.3})`);
        oCtx.fillStyle = sourceGlow;
        oCtx.beginPath();
        oCtx.arc(0, 0, dist * 0.12, 0, Math.PI * 2);
        oCtx.fill();

        // Main cone beam — clip to wedge, fill with radial gradient from source
        oCtx.beginPath();
        oCtx.moveTo(0, 0);
        oCtx.arc(0, 0, dist, startAngle, endAngle);
        oCtx.closePath();
        oCtx.clip();

        // Radial gradient fills the clipped wedge
        const coneGrad = oCtx.createRadialGradient(0, 0, 0, 0, 0, dist);
        coneGrad.addColorStop(0, `rgba(0,0,0,${light.intensity})`);
        coneGrad.addColorStop(0.3, `rgba(0,0,0,${light.intensity * 0.7})`);
        coneGrad.addColorStop(0.7, `rgba(0,0,0,${light.intensity * 0.3})`);
        coneGrad.addColorStop(1, 'rgba(0,0,0,0)');
        oCtx.fillStyle = coneGrad;
        oCtx.beginPath();
        oCtx.arc(0, 0, dist, 0, Math.PI * 2);
        oCtx.fill();
      }

      oCtx.restore();
    }

    // Punch out the freehand pen mask
    const mc = internalMaskRef.current;
    if (mc && mc.width > 0 && mc.height > 0) {
      oCtx.drawImage(mc, 0, 0);
    }

    oCtx.globalCompositeOperation = 'source-over';

    // ---- Display canvas: background + overlay ----
    const dCtx = dispCanvas.getContext('2d')!;
    dCtx.clearRect(0, 0, w, h);
    dCtx.drawImage(bgImg, 0, 0, w, h);
    dCtx.drawImage(overlayCanvas, 0, 0);

    // Force Konva to detect change via new canvas reference
    const freshCanvas = document.createElement('canvas');
    freshCanvas.width = w;
    freshCanvas.height = h;
    freshCanvas.getContext('2d')!.drawImage(dispCanvas, 0, 0);
    setDisplayCanvas(freshCanvas);
  }

  // Re-render when anything changes (RAF-gated)
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => render());
    return () => cancelAnimationFrame(rafRef.current);
  }, [lights, overlayColor, overlayOpacity, bgWidth, bgHeight, backgroundImage, penMaskVersion]);

  if (!displayCanvas) return null;

  return <KonvaImage image={displayCanvas} x={0} y={0} listening={false} />;
}
