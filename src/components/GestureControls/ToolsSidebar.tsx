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

      {/* Move-only toggle */}
      <MoveOnlyButton />

      {/* Undo / Redo */}
      <UndoRedoButtons />

      <div className="flex-1" />

      {/* Saturation slider */}
      <SaturationSlider />
    </div>
  );
}

function SaturationSlider() {
  const saturation = useProjectStore((s) => s.backgroundSaturation);
  const setSaturation = useProjectStore((s) => s.setBackgroundSaturation);
  const backgroundImage = useProjectStore((s) => s.backgroundImage);

  if (!backgroundImage) return null;

  const pct = Math.round((1 + saturation) * 50); // -1→0%, 0→50%, 1→100%

  return (
    <div className="w-full px-2 pb-2 flex flex-col items-center">
      <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
        Saturation
      </div>
      <input
        type="range"
        min={-1}
        max={0}
        step={0.05}
        value={saturation}
        onChange={(e) => setSaturation(parseFloat(e.target.value))}
        className="w-full accent-blue-500"
        style={{ WebkitAppearance: 'none', height: 28 }}
      />
      <div className="text-[10px] text-gray-400 mt-0.5">
        {pct}%
      </div>
    </div>
  );
}

function UndoRedoButtons() {
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const historyIndex = useProjectStore((s) => s.historyIndex);
  const historyLength = useProjectStore((s) => s.history.length);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < historyLength - 1;

  return (
    <div className="flex gap-1 mt-2">
      <button
        onClick={undo}
        disabled={!canUndo}
        className={`w-11 h-11 rounded-full backdrop-blur-sm border flex items-center justify-center transition-colors select-none ${
          canUndo ? 'bg-black/30 border-white/20 active:bg-blue-500' : 'bg-gray-200 border-gray-300 opacity-30'
        }`}
        title="Undo"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v6h6" />
          <path d="M3 13a9 9 0 0 1 15.36-6.36" />
        </svg>
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className={`w-11 h-11 rounded-full backdrop-blur-sm border flex items-center justify-center transition-colors select-none ${
          canRedo ? 'bg-black/30 border-white/20 active:bg-blue-500' : 'bg-gray-200 border-gray-300 opacity-30'
        }`}
        title="Redo"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 7v6h-6" />
          <path d="M21 13a9 9 0 0 0-15.36-6.36" />
        </svg>
      </button>
    </div>
  );
}

function MoveOnlyButton() {
  const moveOnly = useProjectStore((s) => s.moveOnly);
  const setMoveOnly = useProjectStore((s) => s.setMoveOnly);

  return (
    <button
      onClick={() => setMoveOnly(!moveOnly)}
      className={`mt-2 w-20 h-9 rounded-full backdrop-blur-sm border flex items-center justify-center gap-1 transition-all select-none text-[10px] font-semibold ${
        moveOnly
          ? 'bg-amber-500 border-white text-white shadow-lg shadow-amber-500/50'
          : 'bg-black/30 border-white/20 text-white'
      }`}
      style={{ WebkitTouchCallout: 'none' }}
      title={moveOnly ? 'Move mode — tap to exit' : 'Enter move-only mode'}
    >
      {/* Move icon */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 9l-3 3 3 3" />
        <path d="M9 5l3-3 3 3" />
        <path d="M15 19l-3 3-3-3" />
        <path d="M19 9l3 3-3 3" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="12" y1="2" x2="12" y2="22" />
      </svg>
      {moveOnly ? 'MOVE' : 'Move'}
    </button>
  );
}
