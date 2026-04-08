import { useRef, useCallback } from 'react';
import {
  Upload,
  MousePointer2,
  Minus,
  Undo2,
  Redo2,
  Download,
  Trash2,
  PersonStanding,
  Image as ImageIcon,
  LayoutGrid,
} from 'lucide-react';
import Konva from 'konva';
import { useProjectStore } from '../../store/useProjectStore';
import type { ToolMode } from '../../types';

interface ToolbarProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function Toolbar({ stageRef }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);

  const toolMode = useProjectStore((s) => s.toolMode);
  const setToolMode = useProjectStore((s) => s.setToolMode);
  const viewMode = useProjectStore((s) => s.viewMode);
  const setViewMode = useProjectStore((s) => s.setViewMode);
  const setBackgroundImage = useProjectStore((s) => s.setBackgroundImage);
  const setPlanImage = useProjectStore((s) => s.setPlanImage);
  const selectedStampId = useProjectStore((s) => s.selectedStampId);
  const removeStamp = useProjectStore((s) => s.removeStamp);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const historyIndex = useProjectStore((s) => s.historyIndex);
  const historyLength = useProjectStore((s) => s.history.length);

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setBackgroundImage(dataUrl, img.naturalWidth, img.naturalHeight);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);

      // Reset the input so the same file can be re-selected
      e.target.value = '';
    },
    [setBackgroundImage]
  );

  const handlePlanUpload = useCallback(() => {
    planInputRef.current?.click();
  }, []);

  const handlePlanFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setPlanImage(dataUrl, img.naturalWidth, img.naturalHeight);
          setViewMode('plan');
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [setPlanImage, setViewMode]
  );

  const handleExport = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // Temporarily hide guides and selection for clean export
    const layers = stage.getLayers();
    const guidesLayer = layers[layers.length - 1]; // Last layer is guides
    guidesLayer.visible(false);

    // Deselect to hide transformer
    const prevSelected = useProjectStore.getState().selectedStampId;
    useProjectStore.getState().selectStamp(null);

    // Small delay to let Konva update
    setTimeout(() => {
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'landscape-design.png';
      link.href = dataUrl;
      link.click();

      // Restore guides and selection
      guidesLayer.visible(true);
      if (prevSelected) {
        useProjectStore.getState().selectStamp(prevSelected);
      }
    }, 50);
  }, [stageRef]);

  const tools: { mode: ToolMode; icon: typeof MousePointer2; label: string }[] = [
    { mode: 'select', icon: MousePointer2, label: 'Select' },
    { mode: 'horizon', icon: Minus, label: 'Horizon' },
    { mode: 'calibrate', icon: PersonStanding, label: 'Calibrate' },
  ];

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center px-2 gap-1 shrink-0">
      {/* Upload */}
      <ToolButton onClick={handleUpload} label="Upload Photo">
        <Upload size={20} />
      </ToolButton>
      <ToolButton onClick={handlePlanUpload} label="Upload Plan Image">
        <LayoutGrid size={20} />
      </ToolButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={planInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePlanFileChange}
      />

      <div className="w-px h-8 bg-gray-200 mx-1" />

      {/* Tool modes */}
      {tools.map(({ mode, icon: Icon, label }) => (
        <ToolButton
          key={mode}
          onClick={() => setToolMode(mode)}
          active={toolMode === mode}
          label={label}
        >
          <Icon size={20} />
        </ToolButton>
      ))}

      <div className="w-px h-8 bg-gray-200 mx-1" />

      {/* Photo / Plan toggle */}
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => setViewMode('photo')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'photo' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          <ImageIcon size={14} />
          Photo
        </button>
        <button
          onClick={() => setViewMode('plan')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'plan' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          <LayoutGrid size={14} />
          Plan
        </button>
      </div>

      <div className="w-px h-8 bg-gray-200 mx-1" />

      {/* Undo / Redo */}
      <ToolButton onClick={undo} disabled={historyIndex < 0} label="Undo">
        <Undo2 size={20} />
      </ToolButton>
      <ToolButton onClick={redo} disabled={historyIndex >= historyLength - 1} label="Redo">
        <Redo2 size={20} />
      </ToolButton>

      {/* Delete selected */}
      {selectedStampId && (
        <>
          <div className="w-px h-8 bg-gray-200 mx-1" />
          <ToolButton onClick={() => removeStamp(selectedStampId)} label="Delete">
            <Trash2 size={20} />
          </ToolButton>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* App title */}
      <span className="text-sm font-semibold text-gray-500 tracking-wide mr-2 hidden sm:block">
        PerspectivePhoto
      </span>

      {/* Export */}
      <ToolButton onClick={handleExport} label="Export PNG" accent>
        <Download size={20} />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  active = false,
  disabled = false,
  accent = false,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  accent?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        w-11 h-11 flex items-center justify-center rounded-lg transition-colors
        ${active ? 'bg-blue-100 text-blue-600' : ''}
        ${accent ? 'bg-green-500 text-white hover:bg-green-600' : ''}
        ${!active && !accent ? 'text-gray-600 hover:bg-gray-100' : ''}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  );
}
