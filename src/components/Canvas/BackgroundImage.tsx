import { useEffect, useState, useRef } from 'react';
import { Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { useProjectStore } from '../../store/useProjectStore';

/**
 * Custom saturation filter that fully desaturates at 0.
 * saturation: 0 = pure grayscale, 1 = full color.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SaturationFilter(this: any, imageData: ImageData) {
  const sat: number = this.saturationAmount ?? 1;
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Luminance-weighted grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = gray + (r - gray) * sat;
    data[i + 1] = gray + (g - gray) * sat;
    data[i + 2] = gray + (b - gray) * sat;
  }
}

export function BackgroundImage() {
  const backgroundImage = useProjectStore((s) => s.backgroundImage);
  const saturation = useProjectStore((s) => s.backgroundSaturation);
  const opacity = useProjectStore((s) => s.backgroundOpacity);
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
    const node = imageRef.current;
    if (!node) return;
    (node as any).saturationAmount = saturation;
    node.cache();
    node.getLayer()?.batchDraw();
  }, [saturation, image]);

  if (!image) return null;

  const needsFilter = saturation < 1;

  return (
    <KonvaImage
      ref={imageRef}
      image={image}
      x={0}
      y={0}
      width={image.naturalWidth}
      height={image.naturalHeight}
      listening={false}
      opacity={opacity}
      filters={needsFilter ? [SaturationFilter as any] : []}
    />
  );
}
