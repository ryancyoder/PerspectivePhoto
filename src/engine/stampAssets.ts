import type { StampAsset } from '../types';

// SVG path data for plant silhouettes. Each path is designed to fit within
// a normalized viewBox and will be rendered to canvas at placement time.

export const STAMP_ASSETS: StampAsset[] = [
  // === TREES ===
  {
    id: 'tree-oak',
    name: 'Oak',
    category: 'trees',
    svgPath: 'M50,95 L50,60 M25,65 C15,40 25,15 50,10 C75,15 85,40 75,65 C65,55 55,50 50,60 C45,50 35,55 25,65 Z',
    colors: ['#2d5a27', '#3a7a33'],
    defaultWidth: 100,
    defaultHeight: 100,
  },
  {
    id: 'tree-maple',
    name: 'Maple',
    category: 'trees',
    svgPath: 'M50,95 L50,55 M20,58 C10,35 20,10 50,5 C80,10 90,35 80,58 C70,48 60,52 50,55 C40,52 30,48 20,58 Z',
    colors: ['#8B2500', '#cc4400'],
    defaultWidth: 100,
    defaultHeight: 100,
  },
  {
    id: 'tree-pine',
    name: 'Pine',
    category: 'trees',
    svgPath: 'M50,95 L50,70 M50,8 L35,35 L40,33 L28,55 L35,52 L22,72 L78,72 L65,52 L72,55 L60,33 L65,35 Z',
    colors: ['#1a4a1a', '#2d6b2d'],
    defaultWidth: 80,
    defaultHeight: 110,
  },
  {
    id: 'tree-palm',
    name: 'Palm',
    category: 'trees',
    svgPath: 'M50,95 L50,35 M50,35 C45,30 30,15 15,20 M50,35 C55,30 70,15 85,20 M50,35 C48,28 40,10 35,5 M50,35 C52,28 60,10 65,5 M50,35 C45,32 25,28 10,35 M50,35 C55,32 75,28 90,35',
    colors: ['#4a8a3a', '#6aaa4a'],
    defaultWidth: 100,
    defaultHeight: 100,
  },
  {
    id: 'tree-birch',
    name: 'Birch',
    category: 'trees',
    svgPath: 'M50,95 L50,50 M30,55 C25,35 30,15 50,10 C70,15 75,35 70,55 C60,48 55,50 50,50 C45,50 40,48 30,55 Z',
    colors: ['#88aa44', '#aacc66'],
    defaultWidth: 80,
    defaultHeight: 100,
  },

  // === SHRUBS ===
  {
    id: 'shrub-boxwood',
    name: 'Boxwood',
    category: 'shrubs',
    svgPath: 'M15,75 C5,55 10,30 50,25 C90,30 95,55 85,75 Z',
    colors: ['#2e7d32', '#43a047'],
    defaultWidth: 90,
    defaultHeight: 80,
  },
  {
    id: 'shrub-holly',
    name: 'Holly',
    category: 'shrubs',
    svgPath: 'M15,80 C5,60 15,35 30,30 C35,20 45,15 50,15 C55,15 65,20 70,30 C85,35 95,60 85,80 Z',
    colors: ['#1b5e20', '#2e7d32'],
    defaultWidth: 90,
    defaultHeight: 85,
  },
  {
    id: 'shrub-hydrangea',
    name: 'Hydrangea',
    category: 'shrubs',
    svgPath: 'M20,80 C10,65 15,45 30,40 C25,30 35,20 50,20 C65,20 75,30 70,40 C85,45 90,65 80,80 Z M35,35 A8,8 0 1,0 35,34.9 M55,30 A8,8 0 1,0 55,29.9 M45,45 A8,8 0 1,0 45,44.9',
    colors: ['#7b1fa2', '#ab47bc', '#ce93d8'],
    defaultWidth: 95,
    defaultHeight: 85,
  },
  {
    id: 'shrub-azalea',
    name: 'Azalea',
    category: 'shrubs',
    svgPath: 'M15,80 C8,60 15,40 35,35 C30,25 40,18 50,18 C60,18 70,25 65,35 C85,40 92,60 85,80 Z',
    colors: ['#c62828', '#ef5350'],
    defaultWidth: 90,
    defaultHeight: 82,
  },
  {
    id: 'shrub-juniper',
    name: 'Juniper',
    category: 'shrubs',
    svgPath: 'M50,15 C30,20 15,40 15,65 C15,80 25,85 50,85 C75,85 85,80 85,65 C85,40 70,20 50,15 Z',
    colors: ['#37474f', '#546e7a'],
    defaultWidth: 85,
    defaultHeight: 90,
  },

  // === FLOWERS ===
  {
    id: 'flower-rose',
    name: 'Rose Bush',
    category: 'flowers',
    svgPath: 'M20,85 C15,70 20,55 35,50 C30,40 40,35 50,35 C60,35 70,40 65,50 C80,55 85,70 80,85 Z M40,42 A5,5 0 1,0 40,41.9 M55,38 A5,5 0 1,0 55,37.9 M48,48 A5,5 0 1,0 48,47.9 M60,48 A5,5 0 1,0 60,47.9',
    colors: ['#2e7d32', '#e53935', '#ef5350'],
    defaultWidth: 80,
    defaultHeight: 85,
  },
  {
    id: 'flower-lavender',
    name: 'Lavender',
    category: 'flowers',
    svgPath: 'M50,90 L50,50 M45,50 L45,25 C45,18 48,12 50,10 C52,12 55,18 55,25 L55,50 M38,55 L38,30 C38,24 42,18 44,16 M62,55 L62,30 C62,24 58,18 56,16',
    colors: ['#4a7a3a', '#7e57c2', '#9575cd'],
    defaultWidth: 60,
    defaultHeight: 90,
  },
  {
    id: 'flower-daylily',
    name: 'Daylily',
    category: 'flowers',
    svgPath: 'M50,90 L50,55 M30,60 C25,70 30,85 50,90 C70,85 75,70 70,60 Z M50,55 L40,35 M50,55 L60,35 M50,55 L50,30 M40,35 A6,6 0 1,0 40,34.9 M60,35 A6,6 0 1,0 60,34.9 M50,30 A6,6 0 1,0 50,29.9',
    colors: ['#558b2f', '#ff8f00', '#ffa726'],
    defaultWidth: 70,
    defaultHeight: 90,
  },
  {
    id: 'flower-hosta',
    name: 'Hosta',
    category: 'flowers',
    svgPath: 'M50,85 C30,82 15,70 15,60 C15,50 25,42 50,40 C75,42 85,50 85,60 C85,70 70,82 50,85 Z M35,55 C40,45 50,42 50,42 M50,42 C50,42 60,45 65,55 M42,60 C45,50 50,45 50,45 M50,45 C50,45 55,50 58,60',
    colors: ['#388e3c', '#66bb6a'],
    defaultWidth: 90,
    defaultHeight: 75,
  },
  {
    id: 'flower-ornamental-grass',
    name: 'Ornamental Grass',
    category: 'flowers',
    svgPath: 'M50,90 M40,90 C35,60 25,30 20,15 M45,90 C42,55 38,30 35,18 M50,90 C50,55 50,30 50,12 M55,90 C58,55 62,30 65,18 M60,90 C65,60 75,30 80,15',
    colors: ['#7cb342', '#9ccc65'],
    defaultWidth: 70,
    defaultHeight: 90,
  },

  // === HARDSCAPE ===
  {
    id: 'hard-bench',
    name: 'Bench',
    category: 'hardscape',
    svgPath: 'M15,55 L85,55 L85,50 L15,50 Z M20,55 L20,75 M30,55 L30,75 M70,55 L70,75 M80,55 L80,75 M10,45 L90,45 L90,50 L10,50 Z',
    colors: ['#5d4037', '#795548'],
    defaultWidth: 100,
    defaultHeight: 80,
  },
  {
    id: 'hard-fountain',
    name: 'Fountain',
    category: 'hardscape',
    svgPath: 'M30,85 L70,85 L65,70 L35,70 Z M35,70 L65,70 L60,60 L40,60 Z M45,60 L55,60 L55,45 L45,45 Z M50,45 C48,35 42,30 38,25 M50,45 C52,35 58,30 62,25 M50,45 C50,35 50,25 50,18',
    colors: ['#78909c', '#90a4ae', '#4fc3f7'],
    defaultWidth: 80,
    defaultHeight: 90,
  },
  {
    id: 'hard-stepping-stones',
    name: 'Stepping Stones',
    category: 'hardscape',
    svgPath: 'M30,25 A15,10 0 1,0 30,24.9 M55,45 A15,10 0 1,0 55,44.9 M35,65 A15,10 0 1,0 35,64.9 M60,85 A15,10 0 1,0 60,84.9',
    colors: ['#8d6e63', '#a1887f'],
    defaultWidth: 80,
    defaultHeight: 95,
  },
  {
    id: 'hard-fence',
    name: 'Fence Section',
    category: 'hardscape',
    svgPath: 'M10,30 L10,80 M90,30 L90,80 M10,40 L90,40 M10,65 L90,65 M25,25 L25,80 M50,25 L50,80 M75,25 L75,80 M25,25 L25,20 L28,15 L25,20 L22,15 M50,25 L50,20 L53,15 L50,20 L47,15 M75,25 L75,20 L78,15 L75,20 L72,15',
    colors: ['#efebe9', '#d7ccc8'],
    defaultWidth: 100,
    defaultHeight: 80,
  },
  {
    id: 'hard-planter',
    name: 'Planter',
    category: 'hardscape',
    svgPath: 'M25,45 L75,45 L70,85 L30,85 Z M20,40 L80,40 L80,45 L20,45 Z M35,40 C30,25 40,15 50,12 C60,15 70,25 65,40',
    colors: ['#a1887f', '#8d6e63', '#4caf50'],
    defaultWidth: 80,
    defaultHeight: 88,
  },
];

/**
 * Render a stamp asset to an offscreen canvas and return an HTMLCanvasElement
 * that can be used as a Konva Image source.
 */
export function renderStampToCanvas(asset: StampAsset, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Scale from the 100x100 viewBox to actual size
  const scaleX = width / 100;
  const scaleY = height / 100;
  ctx.scale(scaleX, scaleY);

  // Parse and render the SVG path
  const path = new Path2D(asset.svgPath);

  // Fill with primary color
  ctx.fillStyle = asset.colors[0];
  ctx.fill(path);

  // Stroke for definition
  ctx.strokeStyle = asset.colors.length > 1 ? asset.colors[1] : asset.colors[0];
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(path);

  return canvas;
}

/**
 * Get assets filtered by category
 */
export function getAssetsByCategory(category: string): StampAsset[] {
  return STAMP_ASSETS.filter(a => a.category === category);
}

/**
 * Find a stamp asset by ID
 */
export function getAssetById(id: string): StampAsset | undefined {
  return STAMP_ASSETS.find(a => a.id === id);
}
