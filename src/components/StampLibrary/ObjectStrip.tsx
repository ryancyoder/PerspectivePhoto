import { useCallback, useRef, useState, useEffect } from 'react';
import { Plus, X, ClipboardPaste, RefreshCw } from 'lucide-react';
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
  const setActiveCategory = useProjectStore((s) => s.setActiveCategory);
  const setActiveSidebarTab = useProjectStore((s) => s.setActiveSidebarTab);
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

      {/* Category toggle + Joystick at bottom */}
      <div className="shrink-0 flex flex-col items-center border-t border-gray-200/50 pt-2">
        <button
          onClick={() => {
            const nextIndex = (currentIndex + 1) % CATEGORIES.length;
            const next = CATEGORIES[nextIndex];
            if (next.id === 'textures') {
              setActiveSidebarTab('textures');
            } else {
              setActiveSidebarTab('objects');
              setActiveCategory(next.id);
            }
          }}
          className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center active:bg-black/50 transition-colors select-none mb-2"
          style={{ WebkitTouchCallout: 'none' }}
          title="Next category"
        >
          <RefreshCw size={18} className="text-white" />
        </button>
      </div>
      <MovementJoystick />
    </div>
  );
}

function MovementJoystick() {
  const PAD_SIZE = 110;
  const JOY_THUMB = 44;
  const MAX_OFFSET = (PAD_SIZE - JOY_THUMB) / 2;

  const selectedStampId = useProjectStore((s) => s.selectedStampId);
  const updateStamp = useProjectStore((s) => s.updateStamp);
  const pushHistory = useProjectStore((s) => s.pushHistory);
  const stageScale = useProjectStore((s) => s.stageScale);
  const stamps = useProjectStore((s) => s.stamps);

  const stamp = selectedStampId ? stamps.find((s) => s.id === selectedStampId) : null;
  const padRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const animRef = useRef(0);
  const historyRecorded = useRef(false);
  const joyPointerId = useRef<number | null>(null);
  const SPEED = 1.5 / stageScale;

  useEffect(() => {
    if (!dragging || !selectedStampId) return;
    const loop = () => {
      const { x: vx, y: vy } = velocityRef.current;
      if (Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01) {
        const s = useProjectStore.getState().stamps.find((s) => s.id === selectedStampId);
        if (s) updateStamp(selectedStampId, { x: s.x + vx * SPEED, y: s.y + vy * SPEED });
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [dragging, selectedStampId, updateStamp, SPEED]);

  const getOffset = useCallback((clientX: number, clientY: number) => {
    if (!padRef.current) return { x: 0, y: 0 };
    const rect = padRef.current.getBoundingClientRect();
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MAX_OFFSET) { dx = dx / dist * MAX_OFFSET; dy = dy / dist * MAX_OFFSET; }
    return { x: dx, y: dy };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const pid = joyPointerId.current;
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      e.preventDefault();
      const off = getOffset(e.clientX, e.clientY);
      setOffset(off);
      velocityRef.current = { x: off.x / MAX_OFFSET, y: off.y / MAX_OFFSET };
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      setDragging(false);
      setOffset({ x: 0, y: 0 });
      velocityRef.current = { x: 0, y: 0 };
      historyRecorded.current = false;
      joyPointerId.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [dragging, getOffset]);

  return (
    <div className="shrink-0 flex flex-col items-center py-2 border-t border-gray-200/50" style={{ touchAction: 'none' }}>
      <div className={`text-[11px] font-semibold mb-1 px-2 py-0.5 rounded-full ${stamp ? 'bg-black/40 text-white' : 'bg-gray-200 text-gray-400'}`}>
        Move
      </div>
      <div
        ref={padRef}
        className="relative rounded-full bg-black/15 border border-white/20"
        style={{ width: PAD_SIZE, height: PAD_SIZE }}
        onPointerDown={(e) => {
          if (!stamp) return;
          e.preventDefault(); e.stopPropagation();
          if (!historyRecorded.current) { pushHistory(); historyRecorded.current = true; }
          joyPointerId.current = e.pointerId;
          setDragging(true);
          const off = getOffset(e.clientX, e.clientY);
          setOffset(off);
          velocityRef.current = { x: off.x / MAX_OFFSET, y: off.y / MAX_OFFSET };
        }}
      >
        <svg className="absolute inset-0 pointer-events-none" width={PAD_SIZE} height={PAD_SIZE} viewBox={`0 0 ${PAD_SIZE} ${PAD_SIZE}`}>
          <path d={`M${PAD_SIZE/2} 10 l-5 8 h10 z`} fill="white" opacity={stamp ? 0.3 : 0.1} />
          <path d={`M${PAD_SIZE/2} ${PAD_SIZE-10} l-5 -8 h10 z`} fill="white" opacity={stamp ? 0.3 : 0.1} />
          <path d={`M10 ${PAD_SIZE/2} l8 -5 v10 z`} fill="white" opacity={stamp ? 0.3 : 0.1} />
          <path d={`M${PAD_SIZE-10} ${PAD_SIZE/2} l-8 -5 v10 z`} fill="white" opacity={stamp ? 0.3 : 0.1} />
        </svg>
        <div
          className={`absolute rounded-full border-2 shadow-md ${dragging ? 'bg-blue-500 border-white' : 'bg-white border-blue-400'}`}
          style={{
            width: JOY_THUMB, height: JOY_THUMB,
            left: PAD_SIZE / 2 - JOY_THUMB / 2 + offset.x,
            top: PAD_SIZE / 2 - JOY_THUMB / 2 + offset.y,
            transition: dragging ? 'none' : 'all 0.2s ease-out',
          }}
        >
          <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 44 44">
            <line x1="15" y1="22" x2="29" y2="22" stroke={dragging ? 'white' : '#93c5fd'} strokeWidth="2" strokeLinecap="round" />
            <line x1="22" y1="15" x2="22" y2="29" stroke={dragging ? 'white' : '#93c5fd'} strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
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
