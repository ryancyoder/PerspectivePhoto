import { Line, Circle, Group, Text } from 'react-konva';
import { useProjectStore } from '../../store/useProjectStore';

export function PerspectiveGuides() {
  const perspective = useProjectStore((s) => s.perspective);
  const backgroundWidth = useProjectStore((s) => s.backgroundWidth);
  const toolMode = useProjectStore((s) => s.toolMode);
  const setHorizonY = useProjectStore((s) => s.setHorizonY);
  const pushHistory = useProjectStore((s) => s.pushHistory);

  const isHorizonMode = toolMode === 'horizon';
  const lineColor = isHorizonMode ? '#ff6b35' : '#ff6b35';
  const lineOpacity = isHorizonMode ? 0.9 : 0.5;
  const dashPattern = isHorizonMode ? [] : [12, 6];

  // Handle size for touch-friendly drag target
  const handleRadius = 18;
  const width = backgroundWidth || 1024;

  return (
    <Group>
      {/* Horizon line */}
      <Line
        points={[0, perspective.horizonY, width, perspective.horizonY]}
        stroke={lineColor}
        strokeWidth={2}
        opacity={lineOpacity}
        dash={dashPattern}
        listening={false}
      />

      {/* Left drag handle */}
      <Circle
        x={40}
        y={perspective.horizonY}
        radius={handleRadius}
        fill={lineColor}
        opacity={0.8}
        draggable
        dragBoundFunc={(pos) => ({
          x: 40,
          y: Math.max(10, Math.min(pos.y, (useProjectStore.getState().backgroundHeight || 768) - 10)),
        })}
        onDragStart={() => pushHistory()}
        onDragMove={(e) => setHorizonY(e.target.y())}
        onDragEnd={(e) => setHorizonY(e.target.y())}
      />

      {/* Right drag handle */}
      <Circle
        x={width - 40}
        y={perspective.horizonY}
        radius={handleRadius}
        fill={lineColor}
        opacity={0.8}
        draggable
        dragBoundFunc={(pos) => ({
          x: width - 40,
          y: Math.max(10, Math.min(pos.y, (useProjectStore.getState().backgroundHeight || 768) - 10)),
        })}
        onDragStart={() => pushHistory()}
        onDragMove={(e) => setHorizonY(e.target.y())}
        onDragEnd={(e) => setHorizonY(e.target.y())}
      />

      {/* Horizon label */}
      <Text
        x={width / 2 - 40}
        y={perspective.horizonY - 25}
        text="HORIZON"
        fontSize={12}
        fontStyle="bold"
        fill={lineColor}
        opacity={lineOpacity}
        listening={false}
        letterSpacing={2}
      />
    </Group>
  );
}
