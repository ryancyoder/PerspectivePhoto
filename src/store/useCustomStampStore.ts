import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { CustomStamp, StampCategory } from '../types';

const STORAGE_KEY = 'perspectivephoto-custom-stamps';

interface CustomStampLibrary {
  stamps: CustomStamp[];
  addStampWithCategory: (file: File, category: StampCategory) => Promise<string>;
  addStampFromDataUrl: (name: string, dataUrl: string, width: number, height: number, category?: StampCategory) => string;
  removeStamp: (id: string) => void;
  renameStamp: (id: string, name: string) => void;
  getStamp: (id: string) => CustomStamp | undefined;
}

function loadFromStorage(): CustomStamp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const stamps = JSON.parse(raw);
    // Migrate old stamps without category
    return stamps.map((s: any) => ({ ...s, category: s.category || 'custom' }));
  } catch {
    return [];
  }
}

function saveToStorage(stamps: CustomStamp[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stamps));
  } catch {
    console.warn('Failed to save custom stamps to localStorage');
  }
}

export const useCustomStampStore = create<CustomStampLibrary>((set, get) => ({
  stamps: loadFromStorage(),

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
          set((state) => {
            const updated = [...state.stamps, stamp];
            saveToStorage(updated);
            return { stamps: updated };
          });
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
    set((state) => {
      const updated = [...state.stamps, stamp];
      saveToStorage(updated);
      return { stamps: updated };
    });
    return stamp.id;
  },

  removeStamp: (id) =>
    set((state) => {
      const updated = state.stamps.filter((s) => s.id !== id);
      saveToStorage(updated);
      return { stamps: updated };
    }),

  renameStamp: (id, name) =>
    set((state) => {
      const updated = state.stamps.map((s) => (s.id === id ? { ...s, name } : s));
      saveToStorage(updated);
      return { stamps: updated };
    }),

  getStamp: (id) => get().stamps.find((s) => s.id === id),
}));
