import { useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import { useProjectStore } from '../../store/useProjectStore';

export function BackgroundImage() {
  const backgroundImage = useProjectStore((s) => s.backgroundImage);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!backgroundImage) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.src = backgroundImage;
    img.onload = () => setImage(img);
  }, [backgroundImage]);

  if (!image) return null;

  return (
    <KonvaImage
      image={image}
      x={0}
      y={0}
      width={image.naturalWidth}
      height={image.naturalHeight}
      listening={false}
    />
  );
}
