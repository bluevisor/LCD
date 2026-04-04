# LCD

A retro LCD pixel-grid UI library for React. Renders components as monochrome dot-matrix pixels on an HTML canvas with realistic LCD aesthetics.

## Features

- **Pixel-perfect rendering** -- every component draws to a framebuffer that renders as individual LCD dots on canvas
- **Built-in components** -- Text, Heading, Button, Toggle, Slider, Progress, Badge, Icon, Image, Tabs, Menu, Panel, Divider
- **Keyboard focus system** -- full arrow-key navigation with focus indicators, cancel/back support, and custom key handlers
- **Themes** -- green, amber, gray, blue (or define your own)
- **Camera presets** -- straight, isometric, desk, handheld views with optional CSS perspective
- **Pointer input** -- click and drag interaction via hit-test regions
- **Bitmap font** -- built-in 5x7 monospace font with scalable rendering

## Quick Start

```tsx
import { LCDScreen, LCDText, LCDButton } from "lcd";

function App() {
  return (
    <LCDScreen width={160} height={120} pixelSize={4} theme="green">
      <LCDText x={4} y={4}>Hello LCD</LCDText>
      <LCDButton x={4} y={20} label="Click me" onClick={() => alert("!")} focusOrder={10} />
    </LCDScreen>
  );
}
```

## Components

| Component | Description |
|-----------|-------------|
| `LCDScreen` | Root container -- creates the canvas and engine |
| `LCDText` | Renders text using the bitmap font |
| `LCDHeading` | Larger text (scale 2/3) |
| `LCDPanel` | Rectangular container with optional border |
| `LCDDivider` | Horizontal or vertical line |
| `LCDButton` | Clickable button with press animation |
| `LCDToggle` | On/off toggle switch |
| `LCDSlider` | Horizontal value slider (0-1) |
| `LCDProgress` | Read-only progress bar |
| `LCDBadge` | Small label badge |
| `LCDIcon` | Pixel art icons (folder, file, gear, check, etc.) |
| `LCDImage` | Downsampled image display |
| `LCDTabs` | Tab bar with left/right navigation |
| `LCDMenu` | Scrollable menu list with selection |

## LCDScreen Props

```ts
interface LCDScreenProps {
  width: number;          // framebuffer width in pixels
  height: number;         // framebuffer height in pixels
  pixelSize?: number;     // canvas pixels per LCD dot (default 6)
  theme?: ThemePresetName | LCDTheme;  // "green" | "amber" | "gray" | "blue" | custom
  camera?: CameraConfig;  // "straight" | "isometric" | "desk" | "handheld" | custom
  perspective?: boolean;  // enable CSS 3D perspective (default false)
}
```

## Keyboard Navigation

Interactive components accept a `focusOrder` prop. When set, the component participates in keyboard focus:

- **Arrow Up/Down** -- move between focusable components
- **Arrow Left/Right** -- adjust values (slider, toggle, tabs) or navigate menus
- **Enter/Space** -- activate buttons, confirm menu selections
- **Escape/Backspace** -- trigger cancel handlers (back navigation)

```tsx
<LCDToggle x={10} y={10} value={on} onChange={setOn} focusOrder={10} />
<LCDSlider x={10} y={20} width={80} value={vol} onChange={setVol} focusOrder={20} />
<LCDButton x={10} y={30} label="OK" onClick={submit} focusOrder={30} />
```

## Themes

Four built-in themes, or provide a custom `LCDTheme`:

```ts
interface LCDTheme {
  background: string;  // LCD panel background
  dotOff: string;      // inactive dot color
  dotOn: string;       // active dot color
  shadow: string;      // dot shadow color
}
```

## Advanced: Direct Framebuffer Access

Use `useLCD()` to access the engine and draw directly:

```tsx
import { useLCD, BitmapFont } from "lcd";

function CustomDraw() {
  const { engine } = useLCD();
  useEffect(() => {
    engine.fb.fillRect(0, 0, 20, 20, 1);
    engine.markDirty();
  }, [engine]);
  return null;
}
```

## Demo

Run the interactive demo:

```bash
npm install
cd demo && npx vite
```

## License

ISC
