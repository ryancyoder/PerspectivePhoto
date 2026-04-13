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
}

export function LightingOverlay({
  backgroundImage,
  bgWidth,
  bgHeight,
  lights,
  overlayColor,
  overlayOpacity,
}: Props) {
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const [displayCanvas, setDisplayCanvas] = useState<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);

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
  }, [bgWidth, bgHeight]);

  function render() {
    const bgImg = bgImageRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const dispCanvas = displayCanvasRef.current;
    if (!bgImg || !overlayCanvas || !dispCanvas || !bgWidth || !bgHeight) return;

    const w = bgWidth;
    const h = bgHeight;

    // ---- Overlay canvas: fill night color, punch out lights ----
    const oCtx = overlayCanvas.getContext('2d')!;
    oCtx.clearRect(0, 0, w, h);

    // Parse the overlay color but override opacity
    // Use a solid color and control darkness entirely via globalAlpha
    // Stack two passes so higher values can reach near-total darkness
    oCtx.globalCompositeOperation = 'source-over';
    oCtx.fillStyle = 'rgb(20, 0, 40)';
    oCtx.globalAlpha = Math.min(overlayOpacity, 1);
    oCtx.fillRect(0, 0, w, h);
    // Second pass for values above 0.5 — darkens further
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

      oCtx.save();
      oCtx.translate(px, py);
      oCtx.rotate((light.rotation * Math.PI) / 180);
      oCtx.scale(light.spreadX, light.spreadY);

      const gradient = oCtx.createRadialGradient(0, 0, 0, 0, 0, light.radius);
      gradient.addColorStop(0, `rgba(0,0,0,${light.intensity})`);
      gradient.addColorStop(0.5, `rgba(0,0,0,${light.intensity * 0.5})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      oCtx.fillStyle = gradient;
      oCtx.beginPath();
      oCtx.arc(0, 0, light.radius, 0, Math.PI * 2);
      oCtx.fill();
      oCtx.restore();
    }
    oCtx.globalCompositeOperation = 'source-over';

    // ---- Display canvas: background + overlay ----
    const dCtx = dispCanvas.getContext('2d')!;
    dCtx.clearRect(0, 0, w, h);
    dCtx.drawImage(bgImg, 0, 0, w, h);
    dCtx.drawImage(overlayCanvas, 0, 0);

    // Force Konva to pick up the new canvas content by creating a new reference
    const freshCanvas = document.createElement('canvas');
    freshCanvas.width = w;
    freshCanvas.height = h;
    const fCtx = freshCanvas.getContext('2d')!;
    fCtx.drawImage(dispCanvas, 0, 0);
    setDisplayCanvas(freshCanvas);
  }

  // Re-render when lights or overlay settings change (RAF-gated)
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => render());
    return () => cancelAnimationFrame(rafRef.current);
  }, [lights, overlayColor, overlayOpacity, bgWidth, bgHeight, backgroundImage]);

  if (!displayCanvas) return null;

  return <KonvaImage image={displayCanvas} x={0} y={0} listening={false} />;
}
