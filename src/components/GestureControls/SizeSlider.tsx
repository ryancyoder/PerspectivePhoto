import { useRef, useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { DuplicateStampMode } from '../Canvas/EditorCanvas';

const TRACK_HEIGHT = 200;
const THUMB_SIZE = 44;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;

function scaleToPosition(scale: number) {
  const t = (scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE);
  return 1 - t;
}

function positionToScale(pos: number) {
  const t = 1 - pos;
  return MIN_SCALE + t * (MAX_SCALE - MIN_SCALE);
}

/**
 * Vertical thumb slider for resizing the selected plant.
 * Floats in the top-left of the canvas area.
 * Slide up = bigger, slide down = smaller.
 */
export function SizeSlider() {
  const selectedStampId = useProjectStore((s) => s.selectedStampId);
  const stamps = useProjectStore((s) => s.stamps);
  const updateStamp = useProjectStore((s) => s.updateStamp);
  const pushHistory = useProjectStore((s) => s.pushHistory);
  const duplicateStamp = useProjectStore((s) => s.duplicateStamp);

  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasRecordedHistory = useRef(false);

  const stamp = selectedStampId ? stamps.find((s) => s.id === selectedStampId) : null;

  const handleMove = useCallback(
    (clientY: number) => {
      if (!trackRef.current || !selectedStampId) return;
      const rect = trackRef.current.getBoundingClientRect();
      const y = clientY - rect.top - THUMB_SIZE / 2;
      const clamped = Math.max(0, Math.min(TRACK_HEIGHT - THUMB_SIZE, y));
      const pos = clamped / (TRACK_HEIGHT - THUMB_SIZE);
      const newScale = positionToScale(pos);
      updateStamp(selectedStampId, { manualScale: Math.round(newScale * 100) / 100 });
    },
    [selectedStampId, updateStamp]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!hasRecordedHistory.current) {
        pushHistory();
        hasRecordedHistory.current = true;
      }
      setIsDragging(true);
      handleMove(e.touches[0].clientY);
    },
    [handleMove, pushHistory]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!hasRecordedHistory.current) {
        pushHistory();
        hasRecordedHistory.current = true;
      }
      setIsDragging(true);
      handleMove(e.clientY);
    },
    [handleMove, pushHistory]
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      handleMove(clientY);
    };

    const onEnd = () => {
      setIsDragging(false);
      hasRecordedHistory.current = false;
    };

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('mouseup', onEnd);

    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('mouseup', onEnd);
    };
  }, [isDragging, handleMove]);

  // Render nothing if no stamp selected — but hooks are all called above
  if (!stamp) return null;

  const thumbPos = scaleToPosition(stamp.manualScale);
  const thumbY = thumbPos * (TRACK_HEIGHT - THUMB_SIZE);
  const scalePercent = Math.round(stamp.manualScale * 100);

  return (
    <div
      className="absolute left-3 top-16 z-20 flex flex-col items-center select-none"
      style={{ WebkitTouchCallout: 'none' }}
    >
      <div className={`text-[11px] font-semibold mb-2 px-2 py-0.5 rounded-full ${
        isDragging ? 'bg-blue-500 text-white' : 'bg-black/40 text-white'
      }`}>
        {scalePercent}%
      </div>

      <div
        ref={trackRef}
        className="relative w-10 rounded-full bg-black/20 backdrop-blur-sm border border-white/20"
        style={{ height: TRACK_HEIGHT }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="absolute -right-5 top-0 text-[9px] text-white/60 font-medium">+</div>
        <div className="absolute -right-4 bottom-0 text-[9px] text-white/60 font-medium">-</div>

        <div
          className="absolute bottom-0 left-0 right-0 rounded-full bg-blue-400/40"
          style={{ height: `${(1 - thumbPos) * 100}%` }}
        />

        <div
          className={`absolute left-1/2 -translate-x-1/2 rounded-full border-2 shadow-lg transition-colors ${
            isDragging ? 'bg-blue-500 border-white scale-110' : 'bg-white border-blue-400'
          }`}
          style={{ width: THUMB_SIZE, height: THUMB_SIZE, top: thumbY }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <div className={`w-4 h-0.5 rounded ${isDragging ? 'bg-white/60' : 'bg-gray-300'}`} />
            <div className={`w-4 h-0.5 rounded ${isDragging ? 'bg-white/60' : 'bg-gray-300'}`} />
            <div className={`w-4 h-0.5 rounded ${isDragging ? 'bg-white/60' : 'bg-gray-300'}`} />
          </div>
        </div>
      </div>

      {/* Duplicate button — tap to duplicate once, HOLD + tap canvas to stamp multiples */}
      <DuplicateButton selectedStampId={selectedStampId} duplicateStamp={duplicateStamp} />
    </div>
  );
}

function DuplicateButton({ selectedStampId, duplicateStamp }: {
  selectedStampId: string | null;
  duplicateStamp: (id: string) => void;
}) {
  const [isActive, setIsActive] = useState(false);

  // Sync global flag with local state
  useEffect(() => {
    DuplicateStampMode.active = isActive;
    return () => { DuplicateStampMode.active = false; };
  }, [isActive]);

  // Turn off when stamp is deselected
  useEffect(() => {
    if (!selectedStampId) {
      setIsActive(false);
    }
  }, [selectedStampId]);

  const handleTap = useCallback(() => {
    if (!selectedStampId) return;

    if (isActive) {
      // Already in stamp-gun mode — tap again to exit
      setIsActive(false);
    } else {
      // First tap — single duplicate
      duplicateStamp(selectedStampId);
    }
  }, [selectedStampId, isActive, duplicateStamp]);

  const handleDoubleTap = useCallback(() => {
    if (!selectedStampId) return;
    // Double-tap enters stamp-gun mode
    setIsActive(true);
  }, [selectedStampId]);

  const lastTap = useRef(0);
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    if (now - lastTap.current < 400) {
      // Double tap — enter stamp-gun mode
      handleDoubleTap();
    } else {
      // Single tap — duplicate once or exit stamp-gun
      handleTap();
    }
    lastTap.current = now;
  }, [handleTap, handleDoubleTap]);

  return (
    <div
      className={`mt-3 w-11 h-11 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all select-none ${
        isActive
          ? 'bg-blue-500 border-white scale-110 shadow-lg shadow-blue-500/50'
          : 'bg-black/30 border-white/20'
      }`}
      style={{ WebkitTouchCallout: 'none' }}
      title="Tap: duplicate once • Double-tap: stamp-gun mode"
      onPointerUp={handlePointerUp}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      {isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
      )}
    </div>
  );
}
