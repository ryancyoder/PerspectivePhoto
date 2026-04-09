import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { CustomStamp, StampCategory } from '../types';

const DB_NAME = 'perspectivephoto';
const DB_VERSION = 1;
const STORE_NAME = 'custom-stamps';

// ---- IndexedDB helpers ----

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(): Promise<CustomStamp[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const stamps = (req.result as any[]).map((s) => ({
          ...s,
          category: s.category || 'custom',
        }));
        resolve(stamps);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function dbPut(stamp: CustomStamp): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(stamp);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    console.warn('Failed to save stamp to IndexedDB');
  }
}

async function dbDelete(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    console.warn('Failed to delete stamp from IndexedDB');
  }
}

// ---- Migrate from localStorage if any exist ----

async function migrateFromLocalStorage(): Promise<CustomStamp[]> {
  try {
    const raw = localStorage.getItem('perspectivephoto-custom-stamps');
    if (!raw) return [];
    const stamps: CustomStamp[] = JSON.parse(raw).map((s: any) => ({
      ...s,
      category: s.category || 'custom',
    }));
    // Save each to IndexedDB
    for (const stamp of stamps) {
      await dbPut(stamp);
    }
    // Clear localStorage
    localStorage.removeItem('perspectivephoto-custom-stamps');
    return stamps;
  } catch {
    return [];
  }
}

// ---- Store ----

interface CustomStampLibrary {
  stamps: CustomStamp[];
  loaded: boolean;
  loadStamps: () => Promise<void>;
  addStampWithCategory: (file: File, category: StampCategory) => Promise<string>;
  addStampFromDataUrl: (name: string, dataUrl: string, width: number, height: number, category?: StampCategory) => string;
  removeStamp: (id: string) => void;
  renameStamp: (id: string, name: string) => void;
  getStamp: (id: string) => CustomStamp | undefined;
  exportLibrary: () => void;
  importLibrary: () => void;
}

export const useCustomStampStore = create<CustomStampLibrary>((set, get) => ({
  stamps: [],
  loaded: false,

  loadStamps: async () => {
    if (get().loaded) return;
    // Try migrate from localStorage first
    const migrated = await migrateFromLocalStorage();
    if (migrated.length > 0) {
      set({ stamps: migrated, loaded: true });
      return;
    }
    // Load from IndexedDB
    const stamps = await dbGetAll();
    set({ stamps, loaded: true });
  },

  addStampWithCategory: async (file, category) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File must be an image'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const stamp: CustomStamp = {
            id: `custom-${uuid()}`,
            name: file.name.replace(/\.[^.]+$/, ''),
            category,
            dataUrl,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            createdAt: Date.now(),
          };
          set((state) => ({ stamps: [...state.stamps, stamp] }));
          dbPut(stamp);
          resolve(stamp.id);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  addStampFromDataUrl: (name, dataUrl, width, height, category = 'custom') => {
    const stamp: CustomStamp = {
      id: `custom-${uuid()}`,
      name,
      category,
      dataUrl,
      naturalWidth: width,
      naturalHeight: height,
      createdAt: Date.now(),
    };
    set((state) => ({ stamps: [...state.stamps, stamp] }));
    dbPut(stamp);
    return stamp.id;
  },

  removeStamp: (id) => {
    set((state) => ({ stamps: state.stamps.filter((s) => s.id !== id) }));
    dbDelete(id);
  },

  renameStamp: (id, name) => {
    set((state) => ({
      stamps: state.stamps.map((s) => (s.id === id ? { ...s, name } : s)),
    }));
    const stamp = get().stamps.find((s) => s.id === id);
    if (stamp) dbPut(stamp);
  },

  getStamp: (id) => get().stamps.find((s) => s.id === id),

  exportLibrary: () => {
    const stamps = get().stamps;
    if (stamps.length === 0) return;
    const json = JSON.stringify(stamps);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'perspectivephoto-library.json';
    link.click();
    URL.revokeObjectURL(url);
  },

  importLibrary: () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const stamps: CustomStamp[] = JSON.parse(ev.target?.result as string);
          if (!Array.isArray(stamps)) return;
          for (const stamp of stamps) {
            if (!stamp.id || !stamp.dataUrl) continue;
            // Skip if already exists
            if (get().stamps.find((s) => s.id === stamp.id)) continue;
            const s: CustomStamp = {
              id: stamp.id,
              name: stamp.name || 'Imported',
              category: stamp.category || 'custom',
              dataUrl: stamp.dataUrl,
              naturalWidth: stamp.naturalWidth || 100,
              naturalHeight: stamp.naturalHeight || 100,
              createdAt: stamp.createdAt || Date.now(),
            };
            set((state) => ({ stamps: [...state.stamps, s] }));
            await dbPut(s);
          }
        } catch {
          console.warn('Failed to import library');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },
}));

// Auto-load on import
useCustomStampStore.getState().loadStamps();
