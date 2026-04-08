import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { PlacedStamp, PerspectiveConfig, ToolMode, HistoryEntry } from '../types';
import { createDefaultPerspective } from '../engine/perspective';

interface ProjectState {
  // Background
  backgroundImage: string | null;
  backgroundWidth: number;
  backgroundHeight: number;

  // Canvas
  canvasWidth: number;
  canvasHeight: number;
  stageScale: number;
  stageX: number;
  stageY: number;

  // Perspective
  perspective: PerspectiveConfig;

  // Stamps
  stamps: PlacedStamp[];
  selectedStampId: string | null;
  pendingStampAssetId: string | null; // stamp waiting to be placed on canvas

  // Tool
  toolMode: ToolMode;

  // Sidebar
  sidebarCollapsed: boolean;

  // Properties tray
  propertiesTrayOpen: boolean;

  // History (undo/redo)
  history: HistoryEntry[];
  historyIndex: number;

  // Actions
  setBackgroundImage: (dataUrl: string, width: number, height: number) => void;
  setCanvasSize: (width: number, height: number) => void;
  setStageTransform: (scale: number, x: number, y: number) => void;
  setPerspective: (update: Partial<PerspectiveConfig>) => void;
  setHorizonY: (y: number) => void;

  addStamp: (assetId: string, x: number, y: number) => void;
  updateStamp: (id: string, update: Partial<PlacedStamp>) => void;
  removeStamp: (id: string) => void;
  selectStamp: (id: string | null) => void;
  duplicateStamp: (id: string) => void;
  setPendingStamp: (assetId: string | null) => void;

  setToolMode: (mode: ToolMode) => void;
  toggleSidebar: () => void;
  setPropertiesTrayOpen: (open: boolean) => void;

  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  exportCanvas: () => void;
}

const MAX_HISTORY = 50;

export const useProjectStore = create<ProjectState>((set, get) => ({
  backgroundImage: null,
  backgroundWidth: 0,
  backgroundHeight: 0,
  canvasWidth: 1024,
  canvasHeight: 768,
  stageScale: 1,
  stageX: 0,
  stageY: 0,

  perspective: createDefaultPerspective(1024, 768),
  stamps: [],
  selectedStampId: null,
  pendingStampAssetId: null,
  toolMode: 'select',
  sidebarCollapsed: false,
  propertiesTrayOpen: false,

  history: [],
  historyIndex: -1,

  setBackgroundImage: (dataUrl, width, height) => {
    const perspective = createDefaultPerspective(width, height);
    set({
      backgroundImage: dataUrl,
      backgroundWidth: width,
      backgroundHeight: height,
      perspective,
      stamps: [],
      selectedStampId: null,
      history: [],
      historyIndex: -1,
    });
  },

  setCanvasSize: (width, height) => set({ canvasWidth: width, canvasHeight: height }),

  setStageTransform: (scale, x, y) => set({ stageScale: scale, stageX: x, stageY: y }),

  setPerspective: (update) =>
    set((state) => ({
      perspective: { ...state.perspective, ...update },
    })),

  setHorizonY: (y) =>
    set((state) => ({
      perspective: { ...state.perspective, horizonY: y },
    })),

  addStamp: (assetId, x, y) => {
    get().pushHistory();
    const stamp: PlacedStamp = {
      id: uuid(),
      assetId,
      x,
      y,
      manualScale: 1,
      rotation: 0,
      flipX: false,
      opacity: 1,
      zIndex: get().stamps.length,
    };
    set((state) => ({
      stamps: [...state.stamps, stamp],
      selectedStampId: stamp.id,
      pendingStampAssetId: null,
      propertiesTrayOpen: true,
    }));
  },

  updateStamp: (id, update) =>
    set((state) => ({
      stamps: state.stamps.map((s) => (s.id === id ? { ...s, ...update } : s)),
    })),

  removeStamp: (id) => {
    get().pushHistory();
    set((state) => ({
      stamps: state.stamps.filter((s) => s.id !== id),
      selectedStampId: state.selectedStampId === id ? null : state.selectedStampId,
      propertiesTrayOpen: state.selectedStampId === id ? false : state.propertiesTrayOpen,
    }));
  },

  selectStamp: (id) =>
    set({
      selectedStampId: id,
      propertiesTrayOpen: id !== null,
    }),

  duplicateStamp: (id) => {
    const stamp = get().stamps.find((s) => s.id === id);
    if (!stamp) return;
    get().pushHistory();
    const newStamp: PlacedStamp = {
      ...stamp,
      id: uuid(),
      x: stamp.x + 30,
      y: stamp.y + 30,
      zIndex: get().stamps.length,
    };
    set((state) => ({
      stamps: [...state.stamps, newStamp],
      selectedStampId: newStamp.id,
    }));
  },

  setPendingStamp: (assetId) => set({ pendingStampAssetId: assetId, selectedStampId: null }),

  setToolMode: (mode) => set({ toolMode: mode, selectedStampId: null, pendingStampAssetId: null }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setPropertiesTrayOpen: (open) => set({ propertiesTrayOpen: open }),

  pushHistory: () =>
    set((state) => {
      const entry: HistoryEntry = {
        stamps: JSON.parse(JSON.stringify(state.stamps)),
        perspective: { ...state.perspective },
      };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(entry);
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex < 0) return state;
      const entry = state.history[state.historyIndex];
      return {
        stamps: JSON.parse(JSON.stringify(entry.stamps)),
        perspective: { ...entry.perspective },
        historyIndex: state.historyIndex - 1,
        selectedStampId: null,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const entry = state.history[state.historyIndex + 1];
      return {
        stamps: JSON.parse(JSON.stringify(entry.stamps)),
        perspective: { ...entry.perspective },
        historyIndex: state.historyIndex + 1,
        selectedStampId: null,
      };
    }),

  exportCanvas: () => {
    // This is triggered from the component that has access to the Konva stage ref
    // The actual export logic lives in EditorCanvas
  },
}));
