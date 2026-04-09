import { useCallback, useRef, useState } from 'react';
import { Plus, X, ClipboardPaste } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useCustomStampStore } from '../../store/useCustomStampStore';

const CATEGORIES = [
  { id: 'shade-trees', label: 'Shade Trees' },
  { id: 'ornamental-trees', label: 'Ornamental' },
  { id: 'grasses', label: 'Grasses' },
  { id: 'shrubs', label: 'Shrubs' },
  { id: 'perennials', label: 'Perennials' },
  { id: 'ground-cover', label: 'Ground Cover' },
  { id: 'textures', label: 'Surfaces' },
];

export function ObjectStrip() {
  const activeCategory = useProjectStore((s) => s.activeCategory ?? 'shade-trees');
  const activeSidebarTab = useProjectStore((s) => s.activeSidebarTab ?? 'objects');
  const pendingStampAssetId = useProjectStore((s) => s.pendingStampAssetId);
  const setPendingStamp = useProjectStore((s) => s.setPendingStamp);
  const setPlanSelection = useProjectStore((s) => s.setPlanSelection);
  const setViewMode = useProjectStore((s) => s.setViewMode);

  const customStamps = useCustomStampStore((s) => s.stamps);
  const removeStamp = useCustomStampStore((s) => s.removeStamp);

  const isTextures = activeSidebarTab === 'textures';
  const items = isTextures
    ? customStamps.filter((s) => s.category === 'textures' || s.name.startsWith('tex-'))
    : customStamps.filter((s) => s.category === activeCategory && !s.name.startsWith('tex-'));

  const currentId = isTextures ? 'textures' : activeCategory;
  const currentIndex = CATEGORIES.findIndex((c) => c.id === currentId);
  const currentLabel = CATEGORIES[currentIndex]?.label ?? 'Shade Trees';

  const handlePaste = useCallback(async () => {
    try {
      const clipItems = await navigator.clipboard.read();
      for (const item of clipItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            const img = new window.Image();
            img.onload = () => {
              const cat = isTextures ? 'textures' as const : activeCategory;
              const name = isTextures
                ? `tex-Pasted ${new Date().toLocaleTimeString()}`
                : `Pasted ${new Date().toLocaleTimeString()}`;
              useCustomStampStore.getState().addStampFromDataUrl(
                name, dataUrl, img.naturalWidth, img.naturalHeight, cat as any
              );
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch { /* clipboard not available */ }
  }, [activeCategory, isTextures]);

  const handleUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/webp,image/jpeg';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      for (const file of Array.from(files)) {
        const cat = isTextures ? 'textures' as const : activeCategory;
        useCustomStampStore.getState().addStampWithCategory(file, cat as any);
      }
    };
    input.click();
  }, [activeCategory, isTextures]);

  const handleTap = useCallback((stamp: typeof items[0]) => {
    if (isTextures) {
      setPlanSelection(stamp.dataUrl, stamp.naturalWidth, stamp.naturalHeight);
      setViewMode('photo');
    } else {
      setPendingStamp(pendingStampAssetId === stamp.id ? null : stamp.id);
    }
  }, [isTextures, pendingStampAssetId, setPendingStamp, setPlanSelection, setViewMode]);

  return (
    <div
      className="w-28 bg-white/80 backdrop-blur-sm border-l border-gray-200/50 flex flex-col items-center shrink-0"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Upload + Paste side by side */}
      <div className="flex gap-1 px-1.5 mt-1 w-full">
        <button
          onClick={handleUpload}
          className="flex-1 h-11 flex items-center justify-center rounded-lg bg-black/30 backdrop-blur-sm text-white border border-white/20 active:bg-black/50 transition-colors"
          title="Upload"
        >
          <Plus size={20} />
        </button>
        <button
          onClick={handlePaste}
          className="flex-1 h-11 flex items-center justify-center rounded-lg bg-black/30 backdrop-blur-sm text-white border border-white/20 active:bg-black/50 transition-colors"
          title="Paste"
        >
          <ClipboardPaste size={18} />
        </button>
      </div>

      {/* Category label */}
      <div className="w-full px-1.5 mt-1 mb-1">
        <div className="text-[10px] font-semibold text-gray-500 text-center uppercase tracking-wider">
          {currentLabel}
        </div>
      </div>

      <div className="w-24 h-px bg-gray-200" />

      {/* Scrollable object list */}
      <div className="flex-1 overflow-y-auto w-full flex flex-col items-center gap-1 py-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {items.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[9px] text-gray-300 text-center px-2">
              Upload {isTextures ? 'textures' : 'objects'}
            </p>
          </div>
        )}
        {items.map((stamp) => {
          const isActive = !isTextures && pendingStampAssetId === stamp.id;
          return (
            <StampThumbnail
              key={stamp.id}
              stamp={stamp}
              isActive={isActive}
              onTap={() => handleTap(stamp)}
              onDelete={() => removeStamp(stamp.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function StampThumbnail({ stamp, isActive, onTap, onDelete }: {
  stamp: { id: string; dataUrl: string };
  isActive: boolean;
  onTap: () => void;
  onDelete: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const clearTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerDown = () => {
    didLongPress.current = false;
    clearTimer();
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowDelete(true);
    }, 500);
  };

  const handlePointerUp = () => {
    clearTimer();
    // If it was a long press, don't fire tap
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    // Normal tap
    if (showDelete) {
      setShowDelete(false);
    } else {
      onTap();
    }
  };

  const handlePointerMove = () => {
    clearTimer();
  };

  const handleDeleteTap = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete();
    setShowDelete(false);
  };

  return (
    <div
      className={`relative w-24 h-24 shrink-0 rounded-lg cursor-pointer transition-all ${
        showDelete ? 'ring-2 ring-red-400' : isActive ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
      onTouchMove={handlePointerMove}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onMouseLeave={clearTimer}
    >
      <div
        className="w-full h-full rounded-lg bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${stamp.dataUrl})` }}
      />
      {showDelete && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-500/80"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={handleDeleteTap}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={handleDeleteTap}
        >
          <X size={24} className="text-white" />
        </div>
      )}
    </div>
  );
}
