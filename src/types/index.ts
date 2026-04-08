export type StampCategory = 'trees' | 'shrubs' | 'flowers' | 'hardscape';

export type ToolMode = 'select' | 'horizon' | 'pan';

export interface PerspectiveConfig {
  horizonY: number;
  groundY: number;
  vanishingPointX: number;
  baseScale: number;
}

export interface StampAsset {
  id: string;
  name: string;
  category: StampCategory;
  svgPath: string;
  colors: string[];
  defaultWidth: number;
  defaultHeight: number;
}

export interface PlacedStamp {
  id: string;
  assetId: string;
  x: number;
  y: number;
  manualScale: number;
  rotation: number;
  flipX: boolean;
  opacity: number;
  zIndex: number;
}

export interface Project {
  id: string;
  name: string;
  backgroundImage: string | null;
  backgroundWidth: number;
  backgroundHeight: number;
  perspective: PerspectiveConfig;
  stamps: PlacedStamp[];
  canvasWidth: number;
  canvasHeight: number;
}

export interface HistoryEntry {
  stamps: PlacedStamp[];
  perspective: PerspectiveConfig;
}
