import { Line, Text, Group } from 'react-konva';
import type { ScaleReference } from '../../types';

interface PlanGridProps {
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  scaleReference: ScaleReference | null;
}

export function PlanGrid({ bounds, scaleReference }: PlanGridProps) {
  const { minX, maxX, minY, maxY } = bounds;
  const fpu = scaleReference?.feetPerPlanUnit ?? null;

  // Grid spacing in plan units
  const majorSpacing = fpu ? 5 / fpu : computeNiceSpacing(maxX - minX);
  const minorSpacing = majorSpacing / 5;

  const lines: React.ReactNode[] = [];
  let key = 0;

  // Vertical lines (X axis)
  const startX = Math.floor(minX / majorSpacing) * majorSpacing;
  for (let x = startX; x <= maxX; x += minorSpacing) {
    const isMajor = Math.abs(x % majorSpacing) < minorSpacing * 0.1;
    lines.push(
      <Line
        key={key++}
        points={[x, minY, x, maxY]}
        stroke={isMajor ? '#ccc' : '#e8e8e8'}
        strokeWidth={isMajor ? 1 : 0.5}
        listening={false}
      />
    );
    if (isMajor && fpu) {
      const feet = Math.round(x * fpu);
      lines.push(
        <Text
          key={key++}
          x={x + 2}
          y={maxY - 14}
          text={`${feet}'`}
          fontSize={10}
          fill="#999"
          listening={false}
        />
      );
    }
  }

  // Horizontal lines (Y axis = depth)
  const startY = Math.floor(minY / majorSpacing) * majorSpacing;
  for (let y = startY; y <= maxY; y += minorSpacing) {
    const isMajor = Math.abs(y % majorSpacing) < minorSpacing * 0.1;
    lines.push(
      <Line
        key={key++}
        points={[minX, y, maxX, y]}
        stroke={isMajor ? '#ccc' : '#e8e8e8'}
        strokeWidth={isMajor ? 1 : 0.5}
        listening={false}
      />
    );
    if (isMajor && fpu) {
      const feet = Math.round(y * fpu);
      lines.push(
        <Text
          key={key++}
          x={minX + 2}
          y={y + 2}
          text={`${feet}'`}
          fontSize={10}
          fill="#999"
          listening={false}
        />
      );
    }
  }

  // Center axis line (X=0)
  lines.push(
    <Line
      key={key++}
      points={[0, minY, 0, maxY]}
      stroke="#bbb"
      strokeWidth={1.5}
      dash={[6, 4]}
      listening={false}
    />
  );

  return <Group>{lines}</Group>;
}

/** Pick a nice grid spacing for the visible range */
function computeNiceSpacing(range: number): number {
  const target = range / 8;
  const mag = Math.pow(10, Math.floor(Math.log10(target)));
  const norm = target / mag;
  if (norm < 1.5) return mag;
  if (norm < 3.5) return 2 * mag;
  if (norm < 7.5) return 5 * mag;
  return 10 * mag;
}
