import { useRef, useEffect, useCallback, useState } from 'react';
import { Plus, ClipboardPaste, X } from 'lucide-react';
import { useCustomStampStore } from '../../store/useCustomStampStore';
import { useProjectStore } from '../../store/useProjectStore';

export function CustomStampUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customStamps = useCustomStampStore((s) => s.stamps);
  const addStamp = useCustomStampStore((s) => s.addStamp);
  const addStampFromDataUrl = useCustomStampStore((s) => s.addStampFromDataUrl);
  const removeStamp = useCustomStampStore((s) => s.removeStamp);
  const setPendingStamp = useProjectStore((s) => s.setPendingStamp);
  const pendingStampAssetId = useProjectStore((s) => s.pendingStampAssetId);
  const [pasteStatus, setPasteStatus] = useState<string | null>(null);

  // Handle paste from clipboard (Ctrl+V / Cmd+V)
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) continue;

          try {
            await addStamp(blob);
            setPasteStatus('Pasted!');
            setTimeout(() => setPasteStatus(null), 2000);
          } catch (err) {
            console.error('Failed to paste stamp:', err);
            setPasteStatus('Failed');
            setTimeout(() => setPasteStatus(null), 2000);
          }
          return;
        }
      }
    },
    [addStamp]
  );

  // Listen for paste events globally
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Paste via clipboard API button (for iPad where Cmd+V might not work well)
  const handlePasteButton = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            const img = new Image();
            img.onload = () => {
              addStampFromDataUrl(
                `Pasted ${new Date().toLocaleTimeString()}`,
                dataUrl,
                img.naturalWidth,
                img.naturalHeight
              );
              setPasteStatus('Pasted!');
              setTimeout(() => setPasteStatus(null), 2000);
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      setPasteStatus('No image found');
      setTimeout(() => setPasteStatus(null), 2000);
    } catch {
      // Clipboard API might not be available or permission denied
      setPasteStatus('Use Ctrl+V to paste');
      setTimeout(() => setPasteStatus(null), 3000);
    }
  };

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
      {/* Import buttons */}
      <div className="mx-2 mt-2 mb-1 flex gap-1">
        <button
          onClick={handleUpload}
          className="flex-1 flex items-center justify-center gap-1 py-2 px-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors touch-manipulation"
        >
          <Plus size={14} />
          Upload
        </button>
        <button
          onClick={handlePasteButton}
          className="flex-1 flex items-center justify-center gap-1 py-2 px-2 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors touch-manipulation"
        >
          <ClipboardPaste size={14} />
          Paste
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/webp,image/svg+xml,image/jpeg"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Paste status feedback */}
      {pasteStatus && (
        <div className="mx-2 mb-1 text-center text-[11px] text-purple-500 font-medium">
          {pasteStatus}
        </div>
      )}

      {/* Custom stamp grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {customStamps.length === 0 ? (
          <div className="text-center text-gray-300 text-[11px] mt-4 px-2">
            <p>No custom stamps yet.</p>
            <p className="mt-1">Upload PNGs or paste images from your clipboard.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {customStamps.map((stamp) => {
              const isActive = pendingStampAssetId === stamp.id;
              return (
                <div
                  key={stamp.id}
                  className={`relative flex flex-col items-center p-2 rounded-lg cursor-pointer transition-colors select-none group ${
                    isActive ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-gray-100'
                  }`}
                  style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                  onClick={() => handleSelectStamp(stamp.id)}
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStamp(stamp.id);
                    }}
                    className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-red-100 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Remove"
                  >
                    <X size={10} />
                  </button>

                  {/* Thumbnail — use div with background-image to prevent native image drag */}
                  <div
                    className="w-14 h-14 bg-contain bg-center bg-no-repeat pointer-events-none"
                    style={{ backgroundImage: `url(${stamp.dataUrl})` }}
                    role="img"
                    aria-label={stamp.name}
                  />

                  <span className={`text-[10px] mt-1 text-center leading-tight truncate w-full select-none ${
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
