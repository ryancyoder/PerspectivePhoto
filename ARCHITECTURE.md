# PerspectivePhoto — Architecture & Development Guide

## What This App Does

PerspectivePhoto is an iPad-focused web app for landscape designers. Users upload a photo of a house/yard, then place plant stamps that **automatically scale based on perspective** — objects near the horizon shrink, objects in the foreground grow. It also supports a 2D plan view with its own symbol library, and a Morpholio-style plan-to-perspective warp overlay.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | React 18 + TypeScript | Strict mode, verbatimModuleSyntax |
| Canvas | Konva.js via `react-konva` | Multi-layer canvas, drag-and-drop, transforms |
| State | Zustand | Two stores: project state + custom stamps |
| Build | Vite | Fast HMR, Tailwind plugin |
| Styling | Tailwind CSS v4 | `@import "tailwindcss"` in index.css |
| Storage | IndexedDB | For stamp/symbol persistence (NOT localStorage) |
| Icons | Lucide React | Tree-shakeable icon set |
| Deployment | GitHub Pages | Via GitHub Actions workflow |

---

## Project Structure

```
src/
├── App.tsx                          # Root layout — sidebars + canvas
├── main.tsx                         # Vite entry point
├── index.css                        # Tailwind + global styles (touch prevention)
│
├── types/
│   └── index.ts                     # All TypeScript interfaces
│
├── store/
│   ├── useProjectStore.ts           # Main Zustand store (project state, stamps, tools, history)
│   └── useCustomStampStore.ts       # Custom stamp + plan symbol stores (IndexedDB persistence)
│
├── engine/
│   ├── perspective.ts               # Core: calculateScale(), createDefaultPerspective()
│   ├── homography.ts                # 3x3 homography matrix math (DLT solver)
│   ├── planMapping.ts               # Photo↔Plan coordinate conversion (legacy, may be unused)
│   ├── stampAssets.ts               # Built-in stamp registry (currently empty — user uploads only)
│   ├── textureAssets.ts             # Procedural texture generators (mulch, gravel, brick, etc.)
│   └── personSilhouette.ts         # Person silhouette SVG for calibration
│
├── components/
│   ├── Canvas/
│   │   ├── EditorCanvas.tsx         # Main Konva Stage — photo view
│   │   ├── BackgroundImage.tsx      # Photo with saturation/brightness/contrast/opacity filters
│   │   ├── PlantStamp.tsx           # Individual perspective-scaled stamp (Konva Image)
│   │   ├── PerspectiveGuides.tsx    # Horizon line + drag handles (only visible in horizon mode)
│   │   ├── CalibrationOverlay.tsx   # Person silhouette for scale calibration
│   │   └── PlanOverlay.tsx          # Warped plan selection overlay (4-corner distort)
│   │
│   ├── PlanView/
│   │   ├── PlanViewCanvas.tsx       # Plan view — place 2D symbols + polygon selection
│   │   ├── PlanStamp.tsx            # Individual plan symbol (Konva Image, no perspective)
│   │   ├── PlanGrid.tsx             # (stub — was for computed grid, now unused)
│   │   ├── PlanStampCircle.tsx      # (legacy — was for computed bird's-eye circles)
│   │   ├── PointMatcher.tsx         # (stub — replaced by corner drag warp)
│   │   └── ScaleSetup.tsx           # (stub — replaced by corner drag warp)
│   │
│   ├── GestureControls/
│   │   ├── ToolsSidebar.tsx         # Left sidebar — size slider, dup, stamp-gun, delete, undo/redo, move mode
│   │   ├── CategoryToggle.tsx       # Circle button to cycle object categories
│   │   ├── SizeSlider.tsx           # (legacy — now inlined in ToolsSidebar)
│   │   └── MovementJoystick.tsx     # (legacy — now inlined in ObjectStrip)
│   │
│   ├── StampLibrary/
│   │   ├── ObjectStrip.tsx          # Right sidebar — upload/paste, category label, thumbnails, joystick
│   │   ├── TextureGrid.tsx          # Surfaces tab — built-in + custom texture thumbnails
│   │   ├── StampCard.tsx            # (legacy — was for old sidebar)
│   │   ├── StampLibrary.tsx         # (legacy — was the old left sidebar)
│   │   └── CustomStampUpload.tsx    # (stub)
│   │
│   ├── Toolbar/
│   │   └── Toolbar.tsx              # Top bar — upload, tools, view toggle, import/export, settings
│   │
│   ├── PropertiesPanel/
│   │   └── PropertiesPanel.tsx      # (legacy — replaced by gesture controls)
│   │
│   └── SettingsMenu.tsx             # Settings dialog — saturation, brightness, contrast, opacity, horizon
```

---

## Key Architecture Patterns

### 1. Two Coordinate Spaces

The app has two independent coordinate systems:
- **Photo space**: Pixels on the perspective photo. `stamps[]` array uses these coordinates.
- **Plan space**: Pixels on the plan image. `planStamps[]` array uses these coordinates.

They do NOT share coordinates. The warp overlay uses a 4-corner homography to visually map between them.

### 2. Two Separate Object Databases

```
IndexedDB: "perspectivephoto" (version 2)
├── "custom-stamps"    → useCustomStampStore  (perspective view objects)
└── "plan-symbols"     → usePlanSymbolStore   (plan view 2D symbols)
```

Both use the same `CustomStamp` type and same categories, but are completely independent databases. The `ObjectStrip` component switches data source based on `viewMode`.

### 3. Perspective Scaling Math

The core formula in `engine/perspective.ts`:

```
scale = ((stampY - horizonY) / (groundY - horizonY)) * baseScale
```

- `horizonY` = user-set horizon line position
- `groundY` = bottom of the image (auto-set)
- `baseScale` = calibrated from person silhouette, or default `0.35 * imageHeight / 100`
- Result is clamped to `[0.08, 1.5]`

This is mathematically correct because the photo has already performed the perspective projection — in image space, the relationship between Y displacement from horizon and apparent object size is linear.

### 4. Stamp Placement: Press-Drag-Release

All stamp placement uses **document-level capture phase pointer events**:

```typescript
document.addEventListener('pointerdown', handler, true); // capture phase
```

This is critical because:
- Fires BEFORE Konva can consume the event
- Works with both finger (`pointerType: 'touch'`) and Apple Pencil (`pointerType: 'pen'`)
- Pointer ID tracking prevents cross-interference between simultaneous touches

Flow: `pointerdown` creates stamp → `pointermove` updates position → `pointerup` finalizes.

### 5. Plan Overlay Warp (Morpholio-style Distort 3D)

`PlanOverlay.tsx` warps a cropped selection from the plan image onto the perspective photo:

1. User selects a polygon region on the plan image
2. Selection is cropped with transparent background
3. In photo view, 4 colored corner handles appear
4. Dragging corners warps the image using subdivided quad mesh (8×8 grid)
5. Each sub-quad is rendered via canvas `clip()` + `setTransform()` affine transform
6. 0.5px overlap on clip edges prevents seam artifacts
7. Eraser tool paints on a mask canvas, applied via `globalCompositeOperation: 'destination-out'`
8. "Paste" bakes the overlay into the background at native resolution

### 6. Background Image Filters

`BackgroundImage.tsx` uses a single custom pixel-level filter that combines:
- **Saturation**: Luminance-weighted grayscale blend (`0.299R + 0.587G + 0.114B`)
- **Brightness**: Additive (`pixel + brightness * 255`)
- **Contrast**: Pivot around 128 (`(pixel - 128) * factor + 128`)

Applied via Konva's `filters` prop with `.cache()` for performance.

### 7. Species Lock

When a stamp is selected, only stamps of the **same assetId** can be tapped or dragged. Other species are dimmed to 50% opacity and have `listening={false}`. This prevents accidentally grabbing nearby different plants.

### 8. Depth Sorting

Stamps render sorted by Y position (`stamps.sort((a, b) => a.y - b.y)`), not by insertion order. Plants closer to the horizon render behind plants in the foreground.

---

## Critical iOS/iPad Considerations

These are hard-won lessons from extensive iPad testing:

### Touch Events
- **`touchAction: none`** on interactive containers prevents iOS gesture interference
- **`-webkit-touch-callout: none`** prevents long-press callout on images
- **`-webkit-user-select: none`** prevents text selection globally
- **`user-select: text`** must be re-enabled on actual text inputs
- **`pointer-events: none`** on `<img>` tags prevents native image drag behavior
- Use CSS `background-image` instead of `<img>` for thumbnails to avoid native drag

### File Uploads
- **`<label>` + nested `<input type="file">` is unreliable on iOS** when labels are adjacent
- **`element.click()` on hidden inputs fails in useCallback** on iOS Safari
- **Working approach**: `document.createElement('input')` dynamically on each click
- This creates a fresh input every time — no stale references, no cross-firing

### Apple Pencil
- Fires `pointerdown` with `pointerType: 'pen'` — separate from finger touches
- iOS may **cancel finger touches** when Apple Pencil engages the screen
- **Hold-to-stamp (multi-touch) doesn't work** with pencil — use toggle instead
- Document-level capture phase listeners are required to catch pencil events before Konva

### Hooks Rules
- **Never return early before hooks** — this was the #1 crash source
- Components that conditionally render must call ALL hooks first, then check conditions
- Example: `const stamp = stamps.find(...); if (!stamp) return null;` must come AFTER all `useState`/`useEffect`/`useCallback` calls

### Storage
- **localStorage has ~5MB limit** — a few PNG images overflow it silently
- **IndexedDB** can store hundreds of MB — use it for image data
- **PWA (home screen) has separate storage** from Safari — provide export/import
- IndexedDB version must be bumped when adding new object stores

---

## State Management (Zustand)

### useProjectStore — Main app state

Key state:
- `backgroundImage`, `backgroundWidth`, `backgroundHeight` — the perspective photo
- `backgroundSaturation`, `backgroundBrightness`, `backgroundContrast`, `backgroundOpacity` — image adjustments
- `perspective` — `{ horizonY, groundY, vanishingPointX, baseScale, calibration }`
- `stamps[]` — placed perspective stamps (PlacedStamp[])
- `planStamps[]` — placed plan view symbols (PlacedStamp[], separate coordinate space)
- `selectedStampId`, `pendingStampAssetId` — selection state
- `toolMode` — `'select' | 'horizon' | 'calibrate' | 'eraser' | 'pan'`
- `moveOnly` — when true, canvas taps don't place new stamps
- `viewMode` — `'photo' | 'plan'`
- `planView` — plan image + warp overlay config
- `history[]`, `historyIndex` — undo/redo (max 50 entries)
- `activeCategory`, `activeSidebarTab` — sidebar UI state

### useCustomStampStore — Perspective stamps (IndexedDB: 'custom-stamps')
### usePlanSymbolStore — Plan symbols (IndexedDB: 'plan-symbols')

Both have: `addStampWithCategory`, `addStampFromDataUrl`, `removeStamp`, `getStamp`, `exportLibrary`, `importLibrary`

---

## App Layout

```
┌──────────────────────────────────────────────────────┐
│                      Toolbar                          │
│  [Upload] [Plan] [Select] [Calibrate] [Erase]        │
│  [Photo|Plan toggle] [Undo] [Redo] [Import] [Export]  │
│  [Paste Overlay] [Export PNG] [Settings]              │
├──────────┬──────────────────────────┬────────────────┤
│  Left    │                          │  Right         │
│  Sidebar │                          │  Sidebar       │
│          │                          │                │
│  112%    │      Canvas              │  [+] [📋]     │
│  [slider]│      (Photo or Plan)     │  SHRUBS        │
│  [⧉] [+]│                          │  [thumbnails]  │
│  [🗑]    │                          │  ...           │
│  [Move]  │                          │  ────────      │
│  [↩] [↪]│                          │  (↻) toggle    │
│          │                          │  Move (◎)      │
├──────────┴──────────────────────────┴────────────────┤
```

---

## Build & Deploy

```bash
npm install          # Install dependencies
npm run dev          # Dev server (localhost:5173)
npm run build        # Production build (tsc + vite)
```

GitHub Pages deployment via `.github/workflows/deploy.yml` — auto-deploys on push to the feature branch.

**Important**: `vite.config.ts` has `base: '/PerspectivePhoto/'` for GitHub Pages. Case-sensitive.

---

## Common Pitfalls

1. **Adding new IndexedDB stores**: Bump `DB_VERSION` in `useCustomStampStore.ts` and add the store in `onupgradeneeded`
2. **useCallback dependency arrays**: Always include reactive values like `isPlanView`, `activeCategory`, etc. Stale closures are the #1 bug source
3. **Konva + pointer events**: Use document capture phase for placement, Konva events only for selection/deselection
4. **Image filters**: Must call `node.cache()` after changing filter parameters, then `layer.batchDraw()`
5. **Stage dimensions**: Always guard with `|| 1` to prevent Konva crash on zero dimensions
6. **Plan overlay flatten**: Temporarily reset stage to 1:1 scale before `toDataURL()` to get native resolution

---

## Object Categories

Both perspective stamps and plan symbols share these categories:
- Shade Trees
- Ornamental Trees
- Columnar
- Grasses
- Shrubs
- Perennials
- Ground Cover
- Surfaces (textures — perspective view only)

Users upload their own objects via the right sidebar. No built-in plant assets.
