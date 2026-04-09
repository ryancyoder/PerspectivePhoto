import { useRef, useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { DuplicateStampMode } from '../Canvas/EditorCanvas';

const TRACK_HEIGHT = 180;
const THUMB_SIZE = 40;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;
const PAD_SIZE = 110;
const JOY_THUMB = 44;
const MAX_OFFSET = (PAD_SIZE - JOY_THUMB) / 2;

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
  const stageScale = useProjectStore((s) => s.stageScale);

  const stamp = selectedStampId ? stamps.find((s) => s.id === selectedStampId) : null;

  // ---- Size slider state ----
  const trackRef = useRef<HTMLDivElement>(null);
  const [sliderDragging, setSliderDragging] = useState(false);
  const sliderHistoryRecorded = useRef(false);

  const handleSliderMove = useCallback((clientY: number) => {
    if (!trackRef.current || !selectedStampId) return;
    const rect = trackRef.current.getBoundingClientRect();
    const y = clientY - rect.top - THUMB_SIZE / 2;
    const clamped = Math.max(0, Math.min(TRACK_HEIGHT - THUMB_SIZE, y));
    const pos = clamped / (TRACK_HEIGHT - THUMB_SIZE);
    updateStamp(selectedStampId, { manualScale: Math.round(positionToScale(pos) * 100) / 100 });
  }, [selectedStampId, updateStamp]);

  useEffect(() => {
    if (!sliderDragging) return;
    const onMove = (e: PointerEvent) => { e.preventDefault(); handleSliderMove(e.clientY); };
    const onUp = () => { setSliderDragging(false); sliderHistoryRecorded.current = false; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [sliderDragging, handleSliderMove]);

  // ---- Joystick state ----
  const padRef = useRef<HTMLDivElement>(null);
  const [joyDragging, setJoyDragging] = useState(false);
  const [joyOffset, setJoyOffset] = useState({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const animRef = useRef(0);
  const joyHistoryRecorded = useRef(false);
  const SPEED = 1.5 / stageScale;

  useEffect(() => {
    if (!joyDragging || !selectedStampId) return;
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
  }, [joyDragging, selectedStampId, updateStamp, SPEED]);

  const getJoyOffset = useCallback((clientX: number, clientY: number) => {
    if (!padRef.current) return { x: 0, y: 0 };
    const rect = padRef.current.getBoundingClientRect();
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MAX_OFFSET) { dx = dx / dist * MAX_OFFSET; dy = dy / dist * MAX_OFFSET; }
    return { x: dx, y: dy };
  }, []);

  useEffect(() => {
    if (!joyDragging) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      const off = getJoyOffset(e.clientX, e.clientY);
      setJoyOffset(off);
      velocityRef.current = { x: off.x / MAX_OFFSET, y: off.y / MAX_OFFSET };
    };
    const onUp = () => {
      setJoyDragging(false);
      setJoyOffset({ x: 0, y: 0 });
      velocityRef.current = { x: 0, y: 0 };
      joyHistoryRecorded.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [joyDragging, getJoyOffset]);

  // ---- Stamp-gun state ----
  const [stampGunActive, setStampGunActive] = useState(false);
  useEffect(() => { DuplicateStampMode.active = stampGunActive; return () => { DuplicateStampMode.active = false; }; }, [stampGunActive]);
  useEffect(() => { if (!selectedStampId) setStampGunActive(false); }, [selectedStampId]);

  // ---- Render ----
  const thumbPos = stamp ? scaleToPosition(stamp.manualScale) : 0.5;
  const thumbY = thumbPos * (TRACK_HEIGHT - THUMB_SIZE);
  const scalePercent = stamp ? Math.round(stamp.manualScale * 100) : 100;

  return (
    <div
      className="w-28 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 flex flex-col items-center py-2 shrink-0"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}
    >
      {/* Size slider */}
      <div className={`text-[11px] font-semibold mb-1 px-2 py-0.5 rounded-full ${
        stamp ? 'bg-black/40 text-white' : 'bg-gray-200 text-gray-400'
      }`}>
        {stamp ? `${scalePercent}%` : '—'}
      </div>

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
          <div
            className={`absolute left-1/2 -translate-x-1/2 rounded-full border-2 shadow-md ${
              sliderDragging ? 'bg-blue-500 border-white' : 'bg-white border-blue-400'
            }`}
            style={{ width: THUMB_SIZE, height: THUMB_SIZE, top: thumbY }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <div className={`w-3.5 h-0.5 rounded ${sliderDragging ? 'bg-white/60' : 'bg-gray-300'}`} />
              <div className={`w-3.5 h-0.5 rounded ${sliderDragging ? 'bg-white/60' : 'bg-gray-300'}`} />
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 mt-2">
        {/* Duplicate once */}
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

        {/* Stamp-gun toggle */}
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* Movement joystick */}
      <div className={`text-[11px] font-semibold mb-1 px-2 py-0.5 rounded-full ${
        stamp ? 'bg-black/40 text-white' : 'bg-gray-200 text-gray-400'
      }`}>
        Move
      </div>
      <div
        ref={padRef}
        className="relative rounded-full bg-black/15 border border-white/20"
        style={{ width: PAD_SIZE, height: PAD_SIZE }}
        onPointerDown={(e) => {
          if (!stamp) return;
          e.preventDefault(); e.stopPropagation();
          if (!joyHistoryRecorded.current) { pushHistory(); joyHistoryRecorded.current = true; }
          setJoyDragging(true);
          const off = getJoyOffset(e.clientX, e.clientY);
          setJoyOffset(off);
          velocityRef.current = { x: off.x / MAX_OFFSET, y: off.y / MAX_OFFSET };
        }}
      >
        {/* Direction arrows */}
        <svg className="absolute inset-0 pointer-events-none" width={PAD_SIZE} height={PAD_SIZE} viewBox={`0 0 ${PAD_SIZE} ${PAD_SIZE}`}>
          <path d={`M${PAD_SIZE/2} 10 l-5 8 h10 z`} fill="white" opacity={stamp ? 0.3 : 0.1} />
          <path d={`M${PAD_SIZE/2} ${PAD_SIZE-10} l-5 -8 h10 z`} fill="white" opacity={stamp ? 0.3 : 0.1} />
          <path d={`M10 ${PAD_SIZE/2} l8 -5 v10 z`} fill="white" opacity={stamp ? 0.3 : 0.1} />
          <path d={`M${PAD_SIZE-10} ${PAD_SIZE/2} l-8 -5 v10 z`} fill="white" opacity={stamp ? 0.3 : 0.1} />
        </svg>
        {/* Thumb */}
        <div
          className={`absolute rounded-full border-2 shadow-md ${
            joyDragging ? 'bg-blue-500 border-white' : 'bg-white border-blue-400'
          }`}
          style={{
            width: JOY_THUMB, height: JOY_THUMB,
            left: PAD_SIZE / 2 - JOY_THUMB / 2 + joyOffset.x,
            top: PAD_SIZE / 2 - JOY_THUMB / 2 + joyOffset.y,
            transition: joyDragging ? 'none' : 'all 0.2s ease-out',
          }}
        >
          <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 44 44">
            <line x1="15" y1="22" x2="29" y2="22" stroke={joyDragging ? 'white' : '#93c5fd'} strokeWidth="2" strokeLinecap="round" />
            <line x1="22" y1="15" x2="22" y2="29" stroke={joyDragging ? 'white' : '#93c5fd'} strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div className="h-2" />
    </div>
  );
}
