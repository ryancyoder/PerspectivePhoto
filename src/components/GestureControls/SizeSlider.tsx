import { useRef, useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';

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

  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasRecordedHistory = useRef(false);

  const stamp = stamps.find((s) => s.id === selectedStampId);
  if (!stamp) return null;

  const TRACK_HEIGHT = 200;
  const THUMB_SIZE = 44;

  // Map manualScale (0.1 - 5.0) to thumb position (0 = top/big, 1 = bottom/small)
  const scaleToPosition = (scale: number) => {
    const t = (scale - 0.1) / (5.0 - 0.1);
    return 1 - t; // invert: top = big
  };

  const positionToScale = (pos: number) => {
    const t = 1 - pos; // invert back
    return 0.1 + t * (5.0 - 0.1);
  };

  const thumbPos = scaleToPosition(stamp.manualScale);
  const thumbY = thumbPos * (TRACK_HEIGHT - THUMB_SIZE);

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

  const scalePercent = Math.round(stamp.manualScale * 100);

  return (
    <div
      className="absolute left-3 top-16 z-20 flex flex-col items-center select-none"
      style={{ WebkitTouchCallout: 'none' }}
    >
      {/* Scale label */}
      <div className={`text-[11px] font-semibold mb-2 px-2 py-0.5 rounded-full ${
        isDragging ? 'bg-blue-500 text-white' : 'bg-black/40 text-white'
      }`}>
        {scalePercent}%
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative w-10 rounded-full bg-black/20 backdrop-blur-sm border border-white/20"
        style={{ height: TRACK_HEIGHT }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Size indicator labels */}
        <div className="absolute -right-5 top-0 text-[9px] text-white/60 font-medium">+</div>
        <div className="absolute -right-4 bottom-0 text-[9px] text-white/60 font-medium">−</div>

        {/* Track fill */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full bg-blue-400/40"
          style={{ height: `${(1 - thumbPos) * 100}%` }}
        />

        {/* Thumb */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 rounded-full border-2 shadow-lg transition-colors ${
            isDragging ? 'bg-blue-500 border-white scale-110' : 'bg-white border-blue-400'
          }`}
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            top: thumbY,
          }}
        >
          {/* Grip lines */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <div className={`w-4 h-0.5 rounded ${isDragging ? 'bg-white/60' : 'bg-gray-300'}`} />
            <div className={`w-4 h-0.5 rounded ${isDragging ? 'bg-white/60' : 'bg-gray-300'}`} />
            <div className={`w-4 h-0.5 rounded ${isDragging ? 'bg-white/60' : 'bg-gray-300'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
