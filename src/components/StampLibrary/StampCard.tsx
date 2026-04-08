import { useEffect, useRef } from 'react';
import type { StampAsset } from '../../types';
import { renderStampToCanvas } from '../../engine/stampAssets';

interface StampCardProps {
  asset: StampAsset;
}

export function StampCard({ asset }: StampCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const rendered = renderStampToCanvas(asset, 60, 60);
    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = 60;
    canvasRef.current.height = 60;
    ctx.clearRect(0, 0, 60, 60);
    ctx.drawImage(rendered, 0, 0);
  }, [asset]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('stamp-asset-id', asset.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex flex-col items-center p-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-100 transition-colors touch-manipulation"
    >
      <canvas
        ref={canvasRef}
        width={60}
        height={60}
        className="pointer-events-none"
      />
      <span className="text-[10px] text-gray-500 mt-1 text-center leading-tight">
        {asset.name}
      </span>
    </div>
  );
}
