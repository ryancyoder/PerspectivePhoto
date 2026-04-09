import { useEffect, useState, useRef } from 'react';
import { Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { useProjectStore } from '../../store/useProjectStore';

export function BackgroundImage() {
  const backgroundImage = useProjectStore((s) => s.backgroundImage);
  const saturation = useProjectStore((s) => s.backgroundSaturation);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<Konva.Image>(null);

  useEffect(() => {
    if (!backgroundImage) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.src = backgroundImage;
    img.onload = () => setImage(img);
  }, [backgroundImage]);

  // Re-apply filter when saturation changes
  useEffect(() => {
    if (imageRef.current) {
      imageRef.current.cache();
      imageRef.current.getLayer()?.batchDraw();
    }
  }, [saturation, image]);

  if (!image) return null;

  return (
    <KonvaImage
      ref={imageRef}
      image={image}
      x={0}
      y={0}
      width={image.naturalWidth}
      height={image.naturalHeight}
      listening={false}
      filters={saturation !== 0 ? [Konva.Filters.HSL] : []}
      saturation={saturation}
    />
  );
}
