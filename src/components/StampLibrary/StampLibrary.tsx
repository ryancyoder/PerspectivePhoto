import { useState } from 'react';
import { Trees, Flower2, Shrub, Fence, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { STAMP_ASSETS } from '../../engine/stampAssets';
import { StampCard } from './StampCard';
import type { StampCategory } from '../../types';

const CATEGORIES: { id: StampCategory; label: string; icon: typeof Trees }[] = [
  { id: 'trees', label: 'Trees', icon: Trees },
  { id: 'shrubs', label: 'Shrubs', icon: Shrub },
  { id: 'flowers', label: 'Flowers', icon: Flower2 },
  { id: 'hardscape', label: 'Hardscape', icon: Fence },
];

export function StampLibrary() {
  const [activeCategory, setActiveCategory] = useState<StampCategory>('trees');
  const sidebarCollapsed = useProjectStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useProjectStore((s) => s.toggleSidebar);

  const filteredAssets = STAMP_ASSETS.filter((a) => a.category === activeCategory);

  if (sidebarCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-2 gap-2 shrink-0">
        <button
          onClick={toggleSidebar}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
          title="Expand library"
        >
          <ChevronRight size={18} />
        </button>
        {CATEGORIES.map(({ id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setActiveCategory(id);
              toggleSidebar();
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
              activeCategory === id ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'
            }`}
            title={id}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-48 bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Plants
        </span>
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400"
          title="Collapse"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-gray-100">
        {CATEGORIES.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveCategory(id)}
            className={`flex-1 py-2 flex flex-col items-center gap-0.5 transition-colors ${
              activeCategory === id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title={label}
          >
            <Icon size={16} />
            <span className="text-[9px]">{label}</span>
          </button>
        ))}
      </div>

      {/* Stamp grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1">
          {filteredAssets.map((asset) => (
            <StampCard key={asset.id} asset={asset} />
          ))}
        </div>
        <p className="text-[10px] text-gray-300 text-center mt-3">
          Tap to select, then tap photo to place
        </p>
      </div>
    </div>
  );
}
