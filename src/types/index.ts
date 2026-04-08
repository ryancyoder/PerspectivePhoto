export type StampCategory = 'trees' | 'shrubs' | 'flowers' | 'hardscape' | 'custom';

export type ToolMode = 'select' | 'horizon' | 'calibrate' | 'pan';

export interface CalibrationRef {
  x: number;           // position of the reference person
  y: number;           // bottom (feet) Y position
  heightPx: number;    // how tall the person silhouette is in pixels at this position
  realHeightFt: number; // real-world height (default 5.75 ft / ~5'9")
}

export interface PerspectiveConfig {
  horizonY: number;
  groundY: number;
  vanishingPointX: number;
  baseScale: number;
  calibration: CalibrationRef | null;
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

/** User-uploaded custom stamp (PNG image stored as data URL) */
export interface CustomStamp {
  id: string;
  name: string;
  dataUrl: string;       // base64 PNG data URL
  naturalWidth: number;
  naturalHeight: number;
  createdAt: number;
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
