import { useEffect, useRef } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { TEXTURE_ASSETS, renderTextureThumbnail, renderTextureToDataUrl } from '../../engine/textureAssets';

export function TextureGrid() {
  const setPlanSelection = useProjectStore((s) => s.setPlanSelection);
  const setViewMode = useProjectStore((s) => s.setViewMode);

  const handleSelectTexture = (textureId: string) => {
    // Generate a tiled texture image and load it as the skewable overlay
    const dataUrl = renderTextureToDataUrl(textureId, 3);
    const img = new Image();
    img.onload = () => {
      setPlanSelection(dataUrl, img.naturalWidth, img.naturalHeight);
      setViewMode('photo');
    };
    img.src = dataUrl;
  };

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div className="grid grid-cols-2 gap-1">
        {TEXTURE_ASSETS.map((tex) => (
          <TextureTile key={tex.id} textureId={tex.id} name={tex.name} onSelect={handleSelectTexture} />
        ))}
      </div>
      <p className="text-[10px] text-gray-300 text-center mt-3 px-1">
        Tap to place on photo. Drag corners to skew, erase edges, then paste.
      </p>
    </div>
  );
}

function TextureTile({ textureId, name, onSelect }: { textureId: string; name: string; onSelect: (id: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const thumbnail = renderTextureThumbnail(textureId);
    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = 60;
    canvasRef.current.height = 60;
    ctx.drawImage(thumbnail, 0, 0);
  }, [textureId]);

  return (
    <div
      onClick={() => onSelect(textureId)}
      className="flex flex-col items-center p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors select-none"
      style={{ WebkitTouchCallout: 'none' }}
    >
      <canvas
        ref={canvasRef}
        width={60}
        height={60}
        className="rounded pointer-events-none"
      />
      <span className="text-[10px] text-gray-500 mt-1 text-center leading-tight">
        {name}
      </span>
    </div>
  );
}
