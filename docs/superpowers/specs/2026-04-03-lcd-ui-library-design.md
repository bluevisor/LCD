# LCD UI Library — Design Spec

## Overview

A React/TypeScript UI component library that renders everything in a retro green LCD pixel-grid style. Every component is drawn on a shared canvas through an LCD rendering engine that simulates individual square dots with soft shadows — matching the look of vintage monochrome LCDs (Game Boy, early Mac, calculator displays).

## Architecture

Three layers:

### 1. LCD Engine (Core)

- Manages an offscreen framebuffer at LCD resolution
- Each cell stores an intensity value (0.0–1.0)
- A renderer reads the framebuffer and draws the visible dot grid onto a `<canvas>`
- Render loop uses `requestAnimationFrame`, only redraws when framebuffer is dirty

### 2. React Component Layer

- Thin React wrappers that claim rectangular regions of the framebuffer
- `<LCDScreen>` is the root — owns the canvas, engine instance, and render loop
- Child components register their region and write pixel data into the framebuffer
- Layout is grid-based (LCD pixel coordinates, not CSS pixels)

### 3. Asset Pipeline

- Built-in bitmap font atlas (pixel-style, multiple sizes)
- SVG/image downsampler: converts arbitrary images to LCD-resolution pixel data
- Icon set: common UI icons as pre-rasterized LCD pixel arrays

## Dot Rendering

Each dot in the grid:

- **Shape**: Rounded square (~15-20% border-radius relative to dot size)
- **Size**: Dot fills ~80% of its grid cell; remaining 20% is gap
- **Pixel size**: Configurable via `pixelSize` prop (default 6px per LCD dot)
- **Resolution**: Adapts to container size based on chosen pixel size

### Color states

Intensity 0.0–1.0 per dot:

- **0.0 (off)**: Slightly darker than background — visible "ghost" pixel (authentic LCD look)
- **1.0 (on)**: Full foreground color
- **0.0–1.0**: Linear interpolation for anti-aliasing at LCD resolution

### Shadow

Each "on" dot gets a soft shadow:

1. Draw shadow: same shape, offset ~1px down-right, darker color, slight blur
2. Draw dot on top

Shadow intensity scales with dot intensity.

### Background

Flat fill of the mid-tone theme color, drawn before the dot grid.

## Camera / Isometric Transform

The `<LCDScreen>` accepts a `camera` prop for isometric (2D affine) transforms:

```tsx
<LCDScreen
  camera={{ rotate: -30, skewX: 15, skewY: 0, scale: 1 }}
  // or presets:
  camera="isometric"  // classic ~30deg
  camera="straight"   // no transform
/>
```

Applied as a CSS 2D transform (no perspective). Parallel lines stay parallel.

Presets: `"straight"`, `"isometric"`, `"desk"`, `"handheld"`.

## Color Themes

### Presets

| Theme    | Background   | Off dot      | On dot       |
|----------|-------------|-------------|-------------|
| green    | #7B8B2D     | #6F7F24     | #2D3B0E     |
| amber    | #8B6914     | #7F5F0F     | #3B2800     |
| gray     | #8B9B8B     | #7F8F7F     | #2D3B2D     |
| blue     | #2D5B7B     | #24507F     | #0E1F3B     |

### Custom

Developer can pass any `{ background, dotOff, dotOn, shadow }` color object.

## Components (v1)

### Layout
- **LCDScreen** — root container, owns canvas and engine. Props: `width`, `height` (in LCD pixels), `pixelSize`, `theme`, `camera`
- **LCDPanel** — bordered rectangular region within the screen
- **LCDDivider** — horizontal or vertical line

### Typography
- **LCDText** — renders text using built-in bitmap font
- **LCDHeading** — larger bitmap font variant

### Controls
- **LCDButton** — clickable, shows pressed state (inverted colors)
- **LCDToggle** — on/off switch
- **LCDSlider** — horizontal slider with dot-based fill

### Data
- **LCDProgress** — progress bar
- **LCDBadge** — small counter/label

### Media
- **LCDIcon** — renders SVG/image as LCD pixels
- **LCDImage** — downsamples any image to LCD resolution

### Navigation
- **LCDTabs** — tab switcher
- **LCDMenu** — vertical menu list

## Interaction Model

Since everything is on a single canvas, hit detection works by:

1. Each interactive component registers its bounding box (in LCD pixel coords)
2. Canvas click/hover events are translated to LCD pixel coordinates
3. The engine dispatches to the component whose region was hit
4. Components handle focus, hover, and active states by changing their framebuffer pixels

## Package Structure

```
lcd-ui/
  src/
    engine/
      framebuffer.ts    — pixel buffer management
      renderer.ts       — dot grid canvas renderer
      hit-test.ts       — click/hover detection
    fonts/
      bitmap-font.ts    — font atlas + text rasterizer
    assets/
      icons.ts          — pre-rasterized icon set
      image-sampler.ts  — image downsampler
    components/
      LCDScreen.tsx
      LCDPanel.tsx
      LCDText.tsx
      LCDHeading.tsx
      LCDButton.tsx
      LCDToggle.tsx
      LCDSlider.tsx
      LCDProgress.tsx
      LCDBadge.tsx
      LCDIcon.tsx
      LCDImage.tsx
      LCDTabs.tsx
      LCDMenu.tsx
      LCDDivider.tsx
    themes/
      presets.ts        — green, amber, gray, blue
      types.ts          — theme type definitions
    index.ts            — public exports
  demo/
    App.tsx             — showcase demo page
```

## Demo Page

A single-page showcase that demonstrates all components in a visually impressive layout. Shows a fake retro OS desktop or dashboard — window chrome, icons, text, menus — all rendered through the LCD engine. Isometric camera preset by default with a toggle to go straight.

## Tech Stack

- React 18+ / TypeScript
- Canvas 2D API (no WebGL dependency)
- Vite for dev/build
- No runtime dependencies beyond React
