import { useState, useCallback } from 'react';
import { Ruler, X, Check } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { computeFeetPerPlanUnit } from '../../engine/planMapping';

type SetupStep = 'idle' | 'point1' | 'point2' | 'distance';

/**
 * Manual dimension entry for the plan view grid scale.
 *
 * Steps:
 * 1. User taps "Set Scale" button
 * 2. Switches to photo view, user taps first point
 * 3. User taps second point
 * 4. User enters the real-world distance between them
 * 5. feetPerPlanUnit is computed and stored
 */
export function ScaleSetup() {
  const [step, setStep] = useState<SetupStep>('idle');
  const [point1, setPoint1] = useState<{ x: number; y: number } | null>(null);
  const [point2, setPoint2] = useState<{ x: number; y: number } | null>(null);
  const [distanceInput, setDistanceInput] = useState('');

  const perspective = useProjectStore((s) => s.perspective);
  const scaleReference = useProjectStore((s) => s.scaleReference);
  const setScaleReference = useProjectStore((s) => s.setScaleReference);
  const viewMode = useProjectStore((s) => s.viewMode);
  const setViewMode = useProjectStore((s) => s.setViewMode);

  const handleStartSetup = useCallback(() => {
    setStep('point1');
    setPoint1(null);
    setPoint2(null);
    setDistanceInput('');
    // Switch to photo view for point picking
    if (viewMode === 'plan') setViewMode('photo');
  }, [viewMode, setViewMode]);

  const handleCancel = useCallback(() => {
    setStep('idle');
    setPoint1(null);
    setPoint2(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!point1 || !point2) return;
    const ft = parseFloat(distanceInput);
    if (!ft || ft <= 0) return;

    const feetPerPlanUnit = computeFeetPerPlanUnit(
      { point1, point2, distanceFt: ft },
      perspective
    );

    setScaleReference({
      point1,
      point2,
      distanceFt: ft,
      feetPerPlanUnit,
    });

    setStep('idle');
    setViewMode('plan');
  }, [point1, point2, distanceInput, perspective, setScaleReference, setViewMode]);

  // This is called from EditorCanvas when in scale setup mode
  // We expose it via a global callback pattern
  ScaleSetup.onCanvasTap = (x: number, y: number) => {
    if (step === 'point1') {
      setPoint1({ x, y });
      setStep('point2');
    } else if (step === 'point2') {
      setPoint2({ x, y });
      setStep('distance');
    }
  };
  ScaleSetup.activeStep = step;

  if (step === 'idle') {
    return (
      <button
        onClick={handleStartSetup}
        className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-xs font-medium shadow-md hover:bg-amber-600 transition-colors select-none"
        style={{ WebkitTouchCallout: 'none' }}
      >
        <Ruler size={14} />
        {scaleReference ? 'Reset Scale' : 'Set Scale'}
      </button>
    );
  }

  return (
    <div className="absolute bottom-3 right-3 z-20 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-64 select-none" style={{ WebkitTouchCallout: 'none' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">Set Scale</span>
        <button onClick={handleCancel} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
          <X size={14} />
        </button>
      </div>

      {step === 'point1' && (
        <p className="text-xs text-blue-600 font-medium">
          Tap the <strong>first point</strong> on the photo
        </p>
      )}

      {step === 'point2' && (
        <>
          <p className="text-xs text-green-600 font-medium mb-1">
            First point set. Tap the <strong>second point</strong>.
          </p>
          <div className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> → <div className="w-2 h-2 rounded-full bg-blue-300 inline-block animate-pulse" />
        </>
      )}

      {step === 'distance' && (
        <>
          <p className="text-xs text-gray-600 mb-2">
            Both points set. Enter the real-world distance:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={distanceInput}
              onChange={(e) => setDistanceInput(e.target.value)}
              placeholder="e.g. 20"
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              autoFocus
              style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
            />
            <span className="text-sm text-gray-500 font-medium">ft</span>
            <button
              onClick={handleConfirm}
              disabled={!distanceInput || parseFloat(distanceInput) <= 0}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-500 text-white disabled:opacity-30 hover:bg-emerald-600 transition-colors"
            >
              <Check size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Static properties for cross-component communication
ScaleSetup.onCanvasTap = (_x: number, _y: number) => {};
ScaleSetup.activeStep = 'idle' as SetupStep;
