import { useEffect, useRef, useState } from 'react';
import { Image as KonvaImage, Transformer } from 'react-konva';
import Konva from 'konva';
import { useProjectStore } from '../../store/useProjectStore';
import { calculateScale } from '../../engine/perspective';
import { getAssetById, renderStampToCanvas } from '../../engine/stampAssets';
import type { PlacedStamp } from '../../types';

interface PlantStampProps {
  stamp: PlacedStamp;
  isSelected: boolean;
}

export function PlantStamp({ stamp, isSelected }: PlantStampProps) {
  const imageRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [canvasImage, setCanvasImage] = useState<HTMLCanvasElement | null>(null);

  const perspective = useProjectStore((s) => s.perspective);
  const updateStamp = useProjectStore((s) => s.updateStamp);
  const selectStamp = useProjectStore((s) => s.selectStamp);
  const pushHistory = useProjectStore((s) => s.pushHistory);
  const toolMode = useProjectStore((s) => s.toolMode);

  const asset = getAssetById(stamp.assetId);

  // Render the SVG stamp to a canvas element
  useEffect(() => {
    if (!asset) return;
    const canvas = renderStampToCanvas(asset, asset.defaultWidth * 2, asset.defaultHeight * 2);
    setCanvasImage(canvas);
  }, [asset]);

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && imageRef.current) {
      transformerRef.current.nodes([imageRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  if (!asset || !canvasImage) return null;

  // Calculate perspective-based scale
  const perspectiveScale = calculateScale(stamp.y, perspective);
  const totalScale = perspectiveScale * stamp.manualScale;

  const width = asset.defaultWidth * totalScale;
  const height = asset.defaultHeight * totalScale;

  return (
    <>
      <KonvaImage
        ref={imageRef}
        image={canvasImage}
        x={stamp.x}
        y={stamp.y}
        width={width}
        height={height}
        offsetX={width / 2}
        offsetY={height} // Anchor at bottom center for perspective
        rotation={stamp.rotation}
        scaleX={stamp.flipX ? -1 : 1}
        opacity={stamp.opacity}
        draggable={toolMode === 'select'}
        onClick={() => selectStamp(stamp.id)}
        onTap={() => selectStamp(stamp.id)}
        onDragStart={() => pushHistory()}
        onDragEnd={(e) => {
          updateStamp(stamp.id, {
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = imageRef.current;
          if (!node) return;
          // Extract the scale change from the transform
          const scaleX = Math.abs(node.scaleX());
          const newManualScale = stamp.manualScale * scaleX;
          // Reset node scale and apply to manualScale
          node.scaleX(stamp.flipX ? -1 : 1);
          node.scaleY(1);
          updateStamp(stamp.id, {
            manualScale: newManualScale,
            rotation: node.rotation(),
            x: node.x(),
            y: node.y(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(_oldBox, newBox) => {
            // Minimum size constraint
            if (newBox.width < 20 || newBox.height < 20) return _oldBox;
            return newBox;
          }}
          anchorSize={16}
          anchorCornerRadius={8}
          borderStroke="#4fc3f7"
          borderStrokeWidth={2}
          anchorStroke="#4fc3f7"
          anchorFill="#ffffff"
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          rotateEnabled={true}
          keepRatio={true}
        />
      )}
    </>
  );
}
