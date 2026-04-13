import type { LightPreset, LightSource } from '../../types';

export const LIGHT_PRESETS: Record<LightPreset, Partial<LightSource>> = {
  uplight:   { radius: 120, intensity: 0.8, spreadX: 0.6, spreadY: 1.8, color: 'warm' },
  path:      { radius: 80,  intensity: 0.7, spreadX: 1.0, spreadY: 1.0, color: 'warm' },
  spotlight: { radius: 150, intensity: 0.85, spreadX: 0.7, spreadY: 1.2, color: 'warm' },
};

export const LIGHT_PRESET_LABELS: Record<LightPreset, string> = {
  uplight: 'Uplight',
  path: 'Path Light',
  spotlight: 'Spotlight',
};
