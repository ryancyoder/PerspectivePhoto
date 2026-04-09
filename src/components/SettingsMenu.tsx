import { useState } from 'react';
import { Settings, X, RefreshCw } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';

export function SettingsMenu() {
  const [open, setOpen] = useState(false);

  const saturation = useProjectStore((s) => s.backgroundSaturation);
  const setSaturation = useProjectStore((s) => s.setBackgroundSaturation);
  const opacity = useProjectStore((s) => s.backgroundOpacity);
  const setOpacity = useProjectStore((s) => s.setBackgroundOpacity);
  const backgroundImage = useProjectStore((s) => s.backgroundImage);

  const satPct = Math.round(saturation * 100);
  const opaPct = Math.round(opacity * 100);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-11 h-11 flex items-center justify-center rounded-lg transition-colors text-gray-600 hover:bg-gray-100 cursor-pointer"
        title="Settings"
      >
        <Settings size={20} />
      </button>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={() => setOpen(false)}
      />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden select-none"
        style={{ WebkitTouchCallout: 'none' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">Settings</span>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-5">
          {backgroundImage && (
            <>
              {/* Saturation */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Photo Saturation</span>
                  <span className="text-xs text-gray-400">{satPct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={saturation}
                  onChange={(e) => setSaturation(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 h-8"
                />
                <div className="flex justify-between text-[10px] text-gray-300 mt-0.5">
                  <span>B&W</span>
                  <span>Full Color</span>
                </div>
              </div>

              {/* Opacity */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Photo Opacity</span>
                  <span className="text-xs text-gray-400">{opaPct}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.02}
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 h-8"
                />
                <div className="flex justify-between text-[10px] text-gray-300 mt-0.5">
                  <span>Faded</span>
                  <span>Full</span>
                </div>
              </div>
            </>
          )}

          {/* Hard Refresh */}
          <div>
            <div className="text-xs font-medium text-gray-600 mb-2">App</div>
            <button
              onClick={() => { window.location.reload(); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <RefreshCw size={16} />
              Hard Refresh
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
