import { useState, useCallback, useEffect } from 'react';
import { MapPin, X, Check, Trash2 } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';

type MatchStep = 'idle' | 'photo' | 'plan';

/**
 * Point matching UI for linking the perspective photo to the plan image.
 *
 * Workflow:
 * 1. User taps "Match Points" button
 * 2. Switches to photo view — "Tap a landmark on the photo"
 * 3. User taps a point (e.g., corner of the house)
 * 4. Switches to plan view — "Now tap the same spot on the plan"
 * 5. User taps the corresponding point
 * 6. Pair is saved, homography recomputed
 * 7. Repeat for more accuracy (4+ pairs ideal)
 */
export function PointMatcher() {
  const [step, setStep] = useState<MatchStep>('idle');
  const [photoPoint, setPhotoPoint] = useState<{ x: number; y: number } | null>(null);

  const planView = useProjectStore((s) => s.planView);
  const setViewMode = useProjectStore((s) => s.setViewMode);
  const addMatchedPoint = useProjectStore((s) => s.addMatchedPoint);
  const clearMatchedPoints = useProjectStore((s) => s.clearMatchedPoints);

  const pointCount = planView.matchedPoints.length;
  const hasPlanImage = !!planView.image;

  // Expose tap handler for canvases to call
  useEffect(() => {
    PointMatcher.activeStep = step;
  }, [step]);

  const handleStartMatching = useCallback(() => {
    setStep('photo');
    setPhotoPoint(null);
    setViewMode('photo');
  }, [setViewMode]);

  const handleCancel = useCallback(() => {
    setStep('idle');
    setPhotoPoint(null);
  }, []);

  // Called by EditorCanvas or PlanViewCanvas when user taps during matching
  PointMatcher.onCanvasTap = (x: number, y: number) => {
    if (step === 'photo') {
      setPhotoPoint({ x, y });
      setStep('plan');
      setViewMode('plan');
    } else if (step === 'plan' && photoPoint) {
      addMatchedPoint(photoPoint.x, photoPoint.y, x, y);
      // Auto-continue for more points
      setStep('photo');
      setPhotoPoint(null);
      setViewMode('photo');
    }
  };

  if (!hasPlanImage) return null;

  if (step === 'idle') {
    return (
      <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-2 select-none" style={{ WebkitTouchCallout: 'none' }}>
        {pointCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-white bg-black/40 px-2 py-0.5 rounded-full">
              {pointCount} point{pointCount !== 1 ? 's' : ''} matched
              {pointCount >= 4 ? ' (good)' : pointCount >= 2 ? ' (min)' : ''}
            </span>
            <button
              onClick={clearMatchedPoints}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/80 text-white"
              title="Clear all points"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
        <button
          onClick={handleStartMatching}
          className="flex items-center gap-1.5 px-3 py-2 bg-rose-500 text-white rounded-lg text-xs font-medium shadow-md hover:bg-rose-600 transition-colors"
        >
          <MapPin size={14} />
          {pointCount === 0 ? 'Match Points' : 'Add More Points'}
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-3 right-3 z-20 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-72 select-none" style={{ WebkitTouchCallout: 'none' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">Match Points</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400">{pointCount} matched</span>
          <button onClick={handleCancel} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={14} />
          </button>
        </div>
      </div>

      {step === 'photo' && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <p className="text-xs text-blue-600 font-medium">
            Tap a landmark on the <strong>photo</strong> (e.g., corner of house, driveway edge)
          </p>
        </div>
      )}

      {step === 'plan' && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <p className="text-xs text-emerald-600 font-medium">
            Now tap the <strong>same spot</strong> on the plan image
          </p>
        </div>
      )}

      {pointCount >= 2 && (
        <button
          onClick={handleCancel}
          className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
        >
          <Check size={14} />
          Done ({pointCount} points)
        </button>
      )}
    </div>
  );
}

// Static properties for cross-component communication
PointMatcher.onCanvasTap = (_x: number, _y: number) => {};
PointMatcher.activeStep = 'idle' as string;
