# LCD

A retro LCD pixel-grid UI library for React. Renders components as monochrome dot-matrix pixels on an HTML canvas.

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

## Demo

The demo includes 5 authentic device replicas: Nokia 6110 (84x48), Nokia 9210 Communicator (320x100), Apple Newton MessagePad (240x320), Palm Pilot (160x160), and BlackBerry 850 (132x65).

```bash
npm install
cd demo && npx vite
```

## Architecture

```
LCDScreen (root)
  |-- creates LCDEngine (framebuffer + renderer + hit-test + focus)
  |-- renders <canvas> with dot-matrix pixels
  |-- provides LCDContext to children
  |
  children (LCDText, LCDButton, etc.)
    |-- read engine from useLCD() context
    |-- draw to engine.fb (Framebuffer) in useEffect
    |-- engine renders framebuffer to canvas each animation frame
```

Every component draws pixels to a shared `Framebuffer` (a `Float32Array` of intensity values 0-1). The `DotRenderer` converts this to visible dots on the canvas each frame, but only when the framebuffer is dirty.

## Components

### LCDScreen

Root container. Creates the engine, canvas, and context.

```tsx
<LCDScreen
  width={160}          // framebuffer width in pixels
  height={120}         // framebuffer height in pixels
  pixelSize={4}        // canvas pixels per LCD dot (default 6)
  theme="green"        // preset name or custom LCDTheme object
  camera="isometric"   // preset name or custom CameraTransform
  perspective={false}  // enable CSS 3D perspective
>
  {children}
</LCDScreen>
```

**Themes:** `"green"` | `"amber"` | `"gray"` | `"blue"` | `"newton"` | `"palm"`

**Cameras:** `"straight"` | `"isometric"` | `"desk"` | `"handheld"`

### LCDText

Renders bitmap text. Uses a built-in 5x7 monospace font (~6px per character).

```tsx
<LCDText x={4} y={4} scale={1} intensity={1}>Hello world</LCDText>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `x`, `y` | number | required | Position in framebuffer pixels |
| `children` | string | required | Text to render |
| `scale` | number | 1 | Text scale multiplier |
| `intensity` | number | 1 | Pixel brightness (0-1) |

### LCDHeading

Scaled text. Level 1 = 3x, level 2 = 2x, level 3 = 1x.

```tsx
<LCDHeading x={4} y={4} level={2}>Title</LCDHeading>
```

### LCDButton

Clickable button with press animation. Supports pointer and keyboard input.

```tsx
<LCDButton
  x={4} y={20}
  label="Click me"
  onClick={() => console.log("clicked")}
  focusOrder={10}    // enables keyboard focus (Tab order)
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `x`, `y` | number | required | Position |
| `label` | string | required | Button text |
| `onClick` | () => void | - | Click handler |
| `padding` | number | 2 | Internal padding |
| `scale` | number | 1 | Text scale |
| `focusOrder` | number | - | Keyboard nav order (omit to disable) |

### LCDToggle

On/off toggle switch.

```tsx
const [on, setOn] = useState(false);
<LCDToggle x={10} y={10} value={on} onChange={setOn} focusOrder={10} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `x`, `y` | number | required | Position |
| `value` | boolean | required | Current state |
| `onChange` | (v: boolean) => void | - | State change handler |
| `width` | number | 12 | Toggle width |
| `height` | number | 7 | Toggle height |
| `focusOrder` | number | - | Keyboard nav order |

### LCDSlider

Horizontal slider, value range 0-1.

```tsx
const [vol, setVol] = useState(0.5);
<LCDSlider x={10} y={10} width={80} value={vol} onChange={setVol} focusOrder={20} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `x`, `y` | number | required | Position |
| `width` | number | required | Slider width |
| `height` | number | 5 | Slider height |
| `value` | number | required | Current value (0-1) |
| `onChange` | (v: number) => void | - | Value change handler |
| `step` | number | 0.05 | Keyboard step size |
| `focusOrder` | number | - | Keyboard nav order |

### LCDProgress

Read-only progress bar, value range 0-1.

```tsx
<LCDProgress x={10} y={10} width={80} value={0.65} />
```

### LCDMenu

Scrollable list with selection and confirmation.

```tsx
const [sel, setSel] = useState(0);
<LCDMenu
  x={2} y={10}
  items={["Dashboard", "Files", "Settings"]}
  selectedIndex={sel}
  onSelect={setSel}
  onConfirm={(i) => navigate(i)}
  width={100}
  focusOrder={10}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `x`, `y` | number | required | Position |
| `items` | string[] | required | Menu item labels |
| `selectedIndex` | number | -1 | Currently highlighted item |
| `onSelect` | (i: number) => void | - | Called on Up/Down navigation |
| `onConfirm` | (i: number) => void | - | Called on Enter/Right |
| `width` | number | auto | Menu width |
| `focusOrder` | number | - | Keyboard nav order |

### LCDTabs

Tab bar with left/right keyboard navigation.

```tsx
const [tab, setTab] = useState(0);
<LCDTabs x={2} y={10} tabs={["Main", "Settings"]} activeIndex={tab} onChange={setTab} focusOrder={10} />
```

### LCDPanel

Rectangular container with optional border. Children are offset relative to the panel.

```tsx
<LCDPanel x={2} y={2} width={100} height={50} border>
  <LCDText x={2} y={2}>Inside panel</LCDText>  {/* renders at absolute 4,4 */}
</LCDPanel>
```

### LCDDivider

Horizontal or vertical line.

```tsx
<LCDDivider x={0} y={20} length={160} />                          {/* horizontal */}
<LCDDivider x={80} y={0} length={120} direction="vertical" />     {/* vertical */}
```

### LCDIcon

Renders 8x8 pixel art icons. Supports scaling.

```tsx
<LCDIcon x={4} y={4} name="folder" scale={2} />
```

**Available icons:** `folder`, `file`, `gear`, `arrow_right`, `arrow_left`, `check`, `close`, `menu`, `star`, `undo_arrow`, `magnifier`, `grid`, `notepad`, `person`, `calendar`, `calculator`, `prefs`, `home`, `memo`, `todo`

### LCDBadge

Small text label with optional inverted style.

```tsx
<LCDBadge x={10} y={10} inverted>3 items</LCDBadge>
```

### LCDImage

Downsamples an external image to the LCD framebuffer.

```tsx
<LCDImage src="/photo.jpg" x={0} y={0} width={80} height={60} />
```

## Keyboard Focus

Interactive components (`LCDButton`, `LCDToggle`, `LCDSlider`, `LCDMenu`, `LCDTabs`) accept a `focusOrder` prop. When set, the component participates in keyboard navigation:

- **Arrow Up/Down** -- move focus between components (ordered by `focusOrder`)
- **Arrow Left/Right** -- adjust values (slider, toggle, tabs) or custom behavior
- **Enter/Space** -- activate (buttons, menu confirm)
- **Escape/Backspace** -- trigger cancel handlers

```tsx
<LCDToggle ... focusOrder={10} />   {/* focused first */}
<LCDSlider ... focusOrder={20} />   {/* focused second */}
<LCDButton ... focusOrder={30} />   {/* focused third */}
```

Focus wraps around. Components without `focusOrder` are skipped.

## Fonts

Two built-in bitmap fonts:

```tsx
import { BitmapFont } from "lcd";

const regular = new BitmapFont();        // 5x7 pixels (default)
const small = new BitmapFont("3x5");     // 3x5 pixels (for tiny LCDs)
```

The 5x7 font renders at ~6px per character (5px glyph + 1px spacing). The 3x5 font renders at ~4px per character (3px glyph + 1px spacing).

## Custom Themes

```tsx
import type { LCDTheme } from "lcd";

const custom: LCDTheme = {
  background: "#7B8B2D",  // LCD panel background
  dotOff: "#6F7F24",      // inactive dot color
  dotOn: "#2D3B0E",       // active dot color
  shadow: "#1E2808",      // dot shadow color
};

<LCDScreen theme={custom} ... />
```

## Direct Framebuffer Access

Use `useLCD()` inside any component rendered within `<LCDScreen>` to access the engine:

```tsx
import { useLCD, BitmapFont } from "lcd";

function CustomDraw() {
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const fb = engine.fb;

    // Draw a filled rectangle
    fb.fillRect(10, 10, 40, 20, 1);

    // Set individual pixels (intensity 0-1)
    fb.set(5, 5, 0.5);

    // Read pixel values
    const val = fb.get(5, 5);

    // Draw text directly
    const font = new BitmapFont();
    font.drawText(fb, "Hello", 10, 35, { intensity: 1, scale: 2 });

    // Signal the engine to re-render
    engine.markDirty();
  }, [engine]);

  return null;  // no JSX needed — drawing is imperative
}
```

`offsetX`/`offsetY` reflect the parent `<LCDPanel>` offset, so coordinates are relative to the panel.

## Focus System (Advanced)

For custom focusable components, use the `useFocus` hook:

```tsx
import { useFocus, useFocusIndicator } from "lcd";

function CustomControl() {
  const { engine, offsetX, offsetY } = useLCD();

  const { focused } = useFocus({
    rect: { x: 10, y: 10, width: 40, height: 20 },
    order: 10,
    onActivate: () => console.log("activated"),
    onLeft: () => console.log("left"),
    onRight: () => console.log("right"),
    onUp: () => { /* return true to consume, false to let focus move */ return false; },
    onDown: () => false,
  });

  // Optional: draw a glow border when focused
  useFocusIndicator(focused, 10, 10, 40, 20);

  return null;
}
```

For back/cancel navigation (Escape key), register a cancel handler on the engine:

```tsx
function Screen({ onBack }: { onBack: () => void }) {
  const { engine } = useLCD();
  useEffect(() => {
    engine.focus.onCancel(onBack);
    return () => engine.focus.offCancel(onBack);
  }, [engine, onBack]);
  // ...
}
```

## License

ISC
