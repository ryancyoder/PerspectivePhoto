import { useRef, useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { DuplicateStampMode } from '../Canvas/EditorCanvas';

const TRACK_HEIGHT = 180;
const THUMB_SIZE = 40;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;

function scaleToPosition(scale: number) {
  return 1 - (scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE);
}
function positionToScale(pos: number) {
  return MIN_SCALE + (1 - pos) * (MAX_SCALE - MIN_SCALE);
}

export function ToolsSidebar() {
  const selectedStampId = useProjectStore((s) => s.selectedStampId);
  const stamps = useProjectStore((s) => s.stamps);
  const updateStamp = useProjectStore((s) => s.updateStamp);
  const pushHistory = useProjectStore((s) => s.pushHistory);
  const duplicateStamp = useProjectStore((s) => s.duplicateStamp);

  const stamp = selectedStampId ? stamps.find((s) => s.id === selectedStampId) : null;

  // ---- Size slider ----
  const trackRef = useRef<HTMLDivElement>(null);
  const [sliderDragging, setSliderDragging] = useState(false);
  const sliderHistoryRecorded = useRef(false);

  const handleSliderMove = useCallback((clientY: number) => {
    if (!trackRef.current || !selectedStampId) return;
    const rect = trackRef.current.getBoundingClientRect();
    const y = clientY - rect.top - THUMB_SIZE / 2;
    const clamped = Math.max(0, Math.min(TRACK_HEIGHT - THUMB_SIZE, y));
    updateStamp(selectedStampId, { manualScale: Math.round(positionToScale(clamped / (TRACK_HEIGHT - THUMB_SIZE)) * 100) / 100 });
  }, [selectedStampId, updateStamp]);

  useEffect(() => {
    if (!sliderDragging) return;
    const onMove = (e: PointerEvent) => { e.preventDefault(); handleSliderMove(e.clientY); };
    const onUp = () => { setSliderDragging(false); sliderHistoryRecorded.current = false; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [sliderDragging, handleSliderMove]);

  // ---- Stamp-gun ----
  const [stampGunActive, setStampGunActive] = useState(false);
  useEffect(() => { DuplicateStampMode.active = stampGunActive; return () => { DuplicateStampMode.active = false; }; }, [stampGunActive]);
  useEffect(() => { if (!selectedStampId) setStampGunActive(false); }, [selectedStampId]);

  const thumbPos = stamp ? scaleToPosition(stamp.manualScale) : 0.5;
  const thumbY = thumbPos * (TRACK_HEIGHT - THUMB_SIZE);
  const scalePercent = stamp ? Math.round(stamp.manualScale * 100) : 100;

  return (
    <div
      className="w-28 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 flex flex-col items-center py-2 shrink-0"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}
    >
      {/* Scale label */}
      <div className={`text-[11px] font-semibold mb-1 px-2 py-0.5 rounded-full ${
        stamp ? 'bg-black/40 text-white' : 'bg-gray-200 text-gray-400'
      }`}>
        {stamp ? `${scalePercent}%` : '—'}
      </div>

      {/* Size slider */}
      <div
        ref={trackRef}
        className="relative w-10 rounded-full bg-black/15 border border-white/20"
        style={{ height: TRACK_HEIGHT }}
        onPointerDown={(e) => {
          if (!stamp) return;
          e.preventDefault(); e.stopPropagation();
          if (!sliderHistoryRecorded.current) { pushHistory(); sliderHistoryRecorded.current = true; }
          setSliderDragging(true);
          handleSliderMove(e.clientY);
        }}
      >
        <div className="absolute -right-4 top-0 text-[9px] text-gray-400 font-medium">+</div>
        <div className="absolute -right-3 bottom-0 text-[9px] text-gray-400 font-medium">-</div>
        {stamp && <div className="absolute bottom-0 left-0 right-0 rounded-full bg-blue-400/30" style={{ height: `${(1 - thumbPos) * 100}%` }} />}
        {stamp && (
          <div className={`absolute left-1/2 -translate-x-1/2 rounded-full border-2 shadow-md ${sliderDragging ? 'bg-blue-500 border-white' : 'bg-white border-blue-400'}`}
            style={{ width: THUMB_SIZE, height: THUMB_SIZE, top: thumbY }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <div className={`w-3.5 h-0.5 rounded ${sliderDragging ? 'bg-white/60' : 'bg-gray-300'}`} />
              <div className={`w-3.5 h-0.5 rounded ${sliderDragging ? 'bg-white/60' : 'bg-gray-300'}`} />
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 mt-2">
        <button
          onPointerUp={(e) => { e.stopPropagation(); if (selectedStampId) duplicateStamp(selectedStampId); }}
          className={`w-11 h-11 rounded-full backdrop-blur-sm border flex items-center justify-center transition-colors select-none ${
            stamp ? 'bg-black/30 border-white/20 active:bg-blue-500' : 'bg-gray-200 border-gray-300 opacity-40'
          }`}
          disabled={!stamp}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        <button
          onPointerUp={(e) => { e.stopPropagation(); if (stamp) setStampGunActive(!stampGunActive); }}
          className={`w-11 h-11 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all select-none relative ${
            stampGunActive ? 'bg-blue-500 border-white shadow-lg shadow-blue-500/50' :
            stamp ? 'bg-black/30 border-white/20' : 'bg-gray-200 border-gray-300 opacity-40'
          }`}
          disabled={!stamp}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {stampGunActive && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400 animate-pulse" />}
        </button>
      </div>

      <div className="flex-1" />
    </div>
  );
}
