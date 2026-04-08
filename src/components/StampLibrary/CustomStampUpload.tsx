import { useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { useCustomStampStore } from '../../store/useCustomStampStore';
import { useProjectStore } from '../../store/useProjectStore';

export function CustomStampUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customStamps = useCustomStampStore((s) => s.stamps);
  const addStamp = useCustomStampStore((s) => s.addStamp);
  const removeStamp = useCustomStampStore((s) => s.removeStamp);
  const setPendingStamp = useProjectStore((s) => s.setPendingStamp);
  const pendingStampAssetId = useProjectStore((s) => s.pendingStampAssetId);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        await addStamp(file);
      } catch (err) {
        console.error('Failed to add stamp:', err);
      }
    }

    e.target.value = '';
  };

  const handleSelectStamp = (stampId: string) => {
    setPendingStamp(pendingStampAssetId === stampId ? null : stampId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Upload button */}
      <button
        onClick={handleUpload}
        className="mx-2 mt-2 mb-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors touch-manipulation"
      >
        <Plus size={14} />
        Upload PNG
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/webp,image/svg+xml"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Custom stamp grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {customStamps.length === 0 ? (
          <div className="text-center text-gray-300 text-[11px] mt-4 px-2">
            <p>No custom stamps yet.</p>
            <p className="mt-1">Upload transparent PNGs of plants, trees, or other elements.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {customStamps.map((stamp) => {
              const isActive = pendingStampAssetId === stamp.id;
              return (
                <div
                  key={stamp.id}
                  className={`relative flex flex-col items-center p-2 rounded-lg cursor-pointer transition-colors touch-manipulation group ${
                    isActive ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleSelectStamp(stamp.id)}
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStamp(stamp.id);
                    }}
                    className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-red-100 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <X size={10} />
                  </button>

                  {/* Thumbnail */}
                  <img
                    src={stamp.dataUrl}
                    alt={stamp.name}
                    className="w-14 h-14 object-contain pointer-events-none"
                  />

                  <span className={`text-[10px] mt-1 text-center leading-tight truncate w-full ${
                    isActive ? 'text-blue-600 font-medium' : 'text-gray-500'
                  }`}>
                    {stamp.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-300 text-center py-2 px-2">
        Tap to select, then tap photo to place
      </p>
    </div>
  );
}
