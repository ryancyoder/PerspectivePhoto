import type { StampCategory } from '../types';

export interface TopLevelCategory {
  id: string;
  label: string;
  subcategories: StampCategory[];
}

/**
 * Top-level category groupings. Each contains a set of subcategories
 * that can be cycled through via the toggle button.
 */
export const TOP_LEVEL_CATEGORIES: TopLevelCategory[] = [
  {
    id: 'trees',
    label: 'Trees',
    subcategories: ['shade-trees', 'evergreens', 'ornamental-trees', 'columnar'],
  },
  {
    id: 'plants',
    label: 'Plants',
    subcategories: ['shrubs', 'grasses', 'perennials', 'ground-cover'],
  },
  {
    id: 'surfaces',
    label: 'Surfaces',
    subcategories: ['textures'],
  },
];

/** Find the top-level category that contains a given subcategory */
export function getTopLevelForCategory(category: string): TopLevelCategory {
  const found = TOP_LEVEL_CATEGORIES.find((t) => t.subcategories.includes(category as StampCategory));
  return found ?? TOP_LEVEL_CATEGORIES[0];
}

/** Get the sub-category labels for display */
export const SUB_CATEGORY_LABELS: Record<string, string> = {
  'shade-trees': 'Shade Trees',
  'evergreens': 'Evergreens',
  'ornamental-trees': 'Ornamental',
  'columnar': 'Columnar',
  'grasses': 'Grasses',
  'shrubs': 'Shrubs',
  'perennials': 'Perennials',
  'ground-cover': 'Ground Cover',
  'textures': 'Surfaces',
};
