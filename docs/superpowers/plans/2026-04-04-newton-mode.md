# Newton Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mode system to the LCD demo with a mode picker, rename existing demo to "Nokia mode", and add a new "Newton mode" mimicking the Apple Newton MessagePad UI.

**Architecture:** Single App.tsx routes between a mode picker and two self-contained mode components (NokiaMode, NewtonMode). Each mode owns its own resolution, theme, layout, and screens. They share the LCD component library from `src/`.

**Tech Stack:** React, TypeScript, Canvas 2D (via LCD engine)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/themes/presets.ts` | Modify | Add `newton` theme preset |
| `src/assets/icon-data.ts` | Modify | Add Newton-specific icons (star, undo_arrow, magnifier, grid, notepad, person, calendar, calculator, prefs) |
| `demo/modes/NokiaMode.tsx` | Create | Extract current App.tsx content, add `onExit` prop |
| `demo/modes/NewtonMode.tsx` | Create | Newton mode: chrome, Extras, Notepad, Names, Dates screens |
| `demo/App.tsx` | Rewrite | Mode picker + routing to Nokia/Newton |

---

### Task 1: Add Newton Theme Preset

**Files:**
- Modify: `src/themes/presets.ts`

- [ ] **Step 1: Add newton theme**

In `src/themes/presets.ts`, add the newton theme before the `themePresets` export:

```ts
export const newton: LCDTheme = {
  background: "#9BA88A",
  dotOff: "#8F9C80",
  dotOn: "#1A1E14",
  shadow: "#0D0F0A",
};
```

Update the `themePresets` object to include it:

```ts
export const themePresets = { green, amber, gray, blue, newton } as const;
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/themes/presets.ts
git commit -m "feat: add newton theme preset"
```

---

### Task 2: Add Newton Icons

**Files:**
- Modify: `src/assets/icon-data.ts`

Newton UI needs these icons for the bottom bar and Extras grid. All icons are 8x8 bitmaps (matching `ICON_SIZE`).

- [ ] **Step 1: Add icons to icon-data.ts**

Append these entries inside the `icons` object in `src/assets/icon-data.ts`:

```ts
  star: [
    0b00000000,
    0b00010000,
    0b00111000,
    0b11111110,
    0b01111100,
    0b01101100,
    0b01000100,
    0b00000000,
  ],
  undo_arrow: [
    0b00000000,
    0b00100000,
    0b01100000,
    0b11111110,
    0b01100010,
    0b00100010,
    0b00000110,
    0b00000000,
  ],
  magnifier: [
    0b00000000,
    0b00111000,
    0b01000100,
    0b01000100,
    0b00111000,
    0b00011000,
    0b00001100,
    0b00000000,
  ],
  grid: [
    0b00000000,
    0b01010100,
    0b00000000,
    0b01010100,
    0b00000000,
    0b01010100,
    0b00000000,
    0b00000000,
  ],
  notepad: [
    0b00000000,
    0b01111100,
    0b01010100,
    0b01111100,
    0b01010100,
    0b01111100,
    0b01010100,
    0b00000000,
  ],
  person: [
    0b00000000,
    0b00111000,
    0b00111000,
    0b00010000,
    0b01111100,
    0b00010000,
    0b00101000,
    0b00000000,
  ],
  calendar: [
    0b00000000,
    0b01111110,
    0b01000010,
    0b01111110,
    0b01010010,
    0b01010010,
    0b01111110,
    0b00000000,
  ],
  calculator: [
    0b00000000,
    0b01111110,
    0b01111110,
    0b01000010,
    0b01010110,
    0b01010110,
    0b01111110,
    0b00000000,
  ],
  prefs: [
    0b00000000,
    0b11100000,
    0b00011110,
    0b00000000,
    0b01111000,
    0b00000110,
    0b11110000,
    0b00000000,
  ],
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/assets/icon-data.ts
git commit -m "feat: add Newton-specific icons"
```

---

### Task 3: Extract Nokia Mode

**Files:**
- Create: `demo/modes/NokiaMode.tsx`
- Modify: `demo/App.tsx`

- [ ] **Step 1: Create demo/modes directory**

```bash
mkdir -p demo/modes
```

- [ ] **Step 2: Create NokiaMode.tsx**

Copy the entire content of `demo/App.tsx` into `demo/modes/NokiaMode.tsx` with these changes:

1. Rename `export default function App()` to `export function NokiaMode({ onExit }: { onExit: () => void })`
2. Change the `goBack` callback: when `screen === "menu"`, pressing Escape should call `onExit` instead of doing nothing. Modify the `MainMenuScreen` to accept an `onExit` prop and add `useCancel(onExit)` inside it.
3. Keep all other code identical.

The key change in `MainMenuScreen`:

```tsx
function MainMenuScreen({ onNavigate, onExit }: { onNavigate: (s: ScreenType) => void; onExit: () => void }) {
  const items = ["Dashboard", "Files", "Network", "System", "Settings", "About"];
  const [selected, setSelected] = useState(0);

  useCancel(onExit);

  const handleConfirm = useCallback((i: number) => {
    onNavigate(SCREEN_ORDER[i]);
  }, [onNavigate]);

  return (
    <>
      <TitleBar title="LCD Desktop v1.0" showBack={false} />
      <LCDMenu
        x={2}
        y={CONTENT_Y + 2}
        items={items}
        selectedIndex={selected}
        onSelect={setSelected}
        onConfirm={handleConfirm}
        width={W - 4}
        focusOrder={10}
      />
      <HintBar left="Select" right="Enter" />
    </>
  );
}
```

And in the render, pass `onExit`:

```tsx
{screen === "menu" && <MainMenuScreen onNavigate={setScreen} onExit={onExit} />}
```

- [ ] **Step 3: Rewrite App.tsx as mode router**

Replace `demo/App.tsx` with:

```tsx
import { useState } from "react";
import { NokiaMode } from "./modes/NokiaMode";

type Mode = "picker" | "nokia" | "newton";

function ModePicker({ onSelect }: { onSelect: (mode: Mode) => void }) {
  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 40,
      background: "#111",
      fontFamily: "monospace",
      color: "#888",
    }}>
      <button
        onClick={() => onSelect("nokia")}
        style={{
          padding: "20px 32px",
          background: "#222",
          color: "#7B8B2D",
          border: "2px solid #7B8B2D",
          borderRadius: 8,
          fontSize: 18,
          fontFamily: "monospace",
          cursor: "pointer",
        }}
      >
        Nokia Mode
      </button>
      <button
        onClick={() => onSelect("newton")}
        style={{
          padding: "20px 32px",
          background: "#222",
          color: "#9BA88A",
          border: "2px solid #9BA88A",
          borderRadius: 8,
          fontSize: 18,
          fontFamily: "monospace",
          cursor: "pointer",
        }}
      >
        Newton Mode
      </button>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("picker");

  if (mode === "nokia") return <NokiaMode onExit={() => setMode("picker")} />;
  // Newton mode will be added in Task 5
  return <ModePicker onSelect={setMode} />;
}
```

- [ ] **Step 4: Verify dev server works**

Run: `cd demo && npx vite --open`
Expected: Mode picker shows two buttons. Clicking "Nokia Mode" shows the existing demo. Escape from main menu returns to picker.

- [ ] **Step 5: Commit**

```bash
git add demo/modes/NokiaMode.tsx demo/App.tsx
git commit -m "refactor: extract Nokia mode, add mode picker"
```

---

### Task 4: Build Newton Mode — Chrome & Extras

**Files:**
- Create: `demo/modes/NewtonMode.tsx`
- Modify: `demo/App.tsx` (wire in Newton)

This task builds the Newton shell (title bar, bottom bar, routing) and the Extras home screen.

- [ ] **Step 1: Create NewtonMode.tsx with layout constants and chrome**

Create `demo/modes/NewtonMode.tsx`:

```tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LCDScreen,
  LCDText,
  LCDPanel,
  LCDDivider,
  LCDIcon,
  LCDMenu,
  BitmapFont,
  useLCD,
  useFocus,
  useFocusIndicator,
  type ThemePresetName,
} from "../../src";

const font = new BitmapFont();

const W = 240;
const H = 320;
const TITLE_H = 14;
const BOTTOM_H = 16;
const CONTENT_Y = TITLE_H + 1;
const CONTENT_H = H - TITLE_H - 1 - BOTTOM_H - 1;

const CAMERAS: string[] = ["straight", "isometric", "desk", "handheld"];

type NewtonScreen = "extras" | "notepad" | "names" | "dates";

const APP_ORDER: NewtonScreen[] = ["notepad", "names", "dates"];

function useCancel(onBack: () => void) {
  const { engine } = useLCD();
  useEffect(() => {
    engine.focus.onCancel(onBack);
    return () => engine.focus.offCancel(onBack);
  }, [engine, onBack]);
}

function ClearRect({ x, y, width, height, deps }: {
  x: number; y: number; width: number; height: number; deps: unknown[];
}) {
  const { engine, offsetX, offsetY } = useLCD();
  useEffect(() => {
    engine.fb.fillRect(x + offsetX, y + offsetY, width, height, 0);
    engine.markDirty();
  }, [engine, x, y, width, height, offsetX, offsetY, ...deps]);
  return null;
}

function NewtonTitleBar({ title, onLeft, onRight }: {
  title: string;
  onLeft?: () => void;
  onRight?: () => void;
}) {
  const titleW = font.measureText(title);
  const titleX = Math.floor((W - titleW) / 2);
  return (
    <>
      <LCDPanel x={0} y={0} width={W} height={TITLE_H} border={false}>
        {onLeft && <LCDIcon x={2} y={3} name="arrow_left" />}
        <LCDText x={titleX} y={3}>{title}</LCDText>
        {onRight && <LCDIcon x={W - 10} y={3} name="arrow_right" />}
      </LCDPanel>
      <LCDDivider x={0} y={TITLE_H} length={W} />
    </>
  );
}

function NewtonBottomBar({ onOverview }: { onOverview: () => void }) {
  const barY = H - BOTTOM_H;
  const iconY = barY + 4;
  const spacing = W / 4;

  return (
    <>
      <LCDDivider x={0} y={barY} length={W} />
      <LCDIcon x={Math.floor(spacing * 0 + spacing / 2 - 4)} y={iconY} name="star" />
      <LCDIcon x={Math.floor(spacing * 1 + spacing / 2 - 4)} y={iconY} name="undo_arrow" />
      <LCDIcon x={Math.floor(spacing * 2 + spacing / 2 - 4)} y={iconY} name="magnifier" />
      <LCDIcon x={Math.floor(spacing * 3 + spacing / 2 - 4)} y={iconY} name="grid" />
    </>
  );
}

interface ExtrasApp {
  name: string;
  icon: string;
  screen: NewtonScreen;
}

const EXTRAS_APPS: ExtrasApp[] = [
  { name: "Notepad", icon: "notepad", screen: "notepad" },
  { name: "Names", icon: "person", screen: "names" },
  { name: "Dates", icon: "calendar", screen: "dates" },
  { name: "Calc", icon: "calculator", screen: "extras" },
  { name: "Prefs", icon: "prefs", screen: "extras" },
];

const GRID_COLS = 4;
const ICON_CELL_W = Math.floor(W / GRID_COLS);
const ICON_CELL_H = 36;

function ExtrasScreen({ onNavigate, onExit }: {
  onNavigate: (s: NewtonScreen) => void;
  onExit: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  useCancel(onExit);

  const onUp = useCallback(() => {
    if (selected >= GRID_COLS) { setSelected((s) => s - GRID_COLS); return true; }
    return false;
  }, [selected]);

  const onDown = useCallback(() => {
    if (selected + GRID_COLS < EXTRAS_APPS.length) { setSelected((s) => s + GRID_COLS); return true; }
    return false;
  }, [selected]);

  const onLeft = useCallback(() => {
    if (selected % GRID_COLS > 0) setSelected((s) => s - 1);
  }, [selected]);

  const onRight = useCallback(() => {
    if (selected % GRID_COLS < GRID_COLS - 1 && selected < EXTRAS_APPS.length - 1) setSelected((s) => s + 1);
  }, [selected]);

  const onActivate = useCallback(() => {
    onNavigate(EXTRAS_APPS[selected].screen);
  }, [selected, onNavigate]);

  const gridX = Math.floor((W - GRID_COLS * ICON_CELL_W) / 2);
  const gridY = CONTENT_Y + 20;
  const totalW = GRID_COLS * ICON_CELL_W;
  const rows = Math.ceil(EXTRAS_APPS.length / GRID_COLS);
  const totalH = rows * ICON_CELL_H;

  const { focused } = useFocus({
    rect: { x: gridX, y: gridY, width: totalW, height: totalH },
    order: 10,
    onUp,
    onDown,
    onLeft,
    onRight,
    onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    fb.fillRect(0, CONTENT_Y, W, CONTENT_H, 0);

    EXTRAS_APPS.forEach((app, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const cx = gridX + col * ICON_CELL_W + Math.floor(ICON_CELL_W / 2);
      const cy = gridY + row * ICON_CELL_H;

      // Icon (centered in cell, scale 2)
      const iconX = cx - 8;
      const iconY = cy;

      // Selection highlight
      if (i === selected) {
        fb.fillRect(iconX - 2, iconY - 2, 20, 20, 1);
        // Draw icon inverted — we'll draw it with intensity 0 below
      }

      // Draw icon pixels manually for inversion support
      const iconData = (await import("../../src/assets/icon-data")).icons[app.icon];
      // Actually, we can't async import in useEffect. Use the icons from the import.
    });

    engine.markDirty();
  }, [engine, selected, gridX, gridY]);

  return (
    <>
      <NewtonTitleBar title="Extras" />
      <LCDText x={Math.floor((W - font.measureText("Newton MessagePad")) / 2)} y={CONTENT_Y + 4}>Newton MessagePad</LCDText>
      {EXTRAS_APPS.map((app, i) => {
        const col = i % GRID_COLS;
        const row = Math.floor(i / GRID_COLS);
        const cx = gridX + col * ICON_CELL_W + Math.floor(ICON_CELL_W / 2);
        const cy = gridY + row * ICON_CELL_H;
        return (
          <React.Fragment key={app.name}>
            <LCDIcon
              x={cx - 8}
              y={cy}
              name={app.icon}
              scale={2}
              intensity={i === selected ? 0 : 1}
            />
            <LCDText
              x={cx - Math.floor(font.measureText(app.name) / 2)}
              y={cy + 18}
            >
              {app.name}
            </LCDText>
          </React.Fragment>
        );
      })}
      <NewtonBottomBar onOverview={() => {}} />
    </>
  );
}

export function NewtonMode({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<NewtonScreen>("extras");
  const [theme] = useState<ThemePresetName>("newton");
  const [camera, setCamera] = useState("straight");
  const [pixelSize, setPixelSize] = useState(3);
  const [perspective, setPerspective] = useState(false);

  const goExtras = useCallback(() => setScreen("extras"), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "-" || e.key === "_") {
        setPixelSize((s) => Math.max(2, s - 1));
      } else if (e.key === "=" || e.key === "+") {
        setPixelSize((s) => Math.min(8, s + 1));
      } else if (e.key === "." || e.key === ">") {
        setCamera((c) => {
          const idx = CAMERAS.indexOf(c);
          return CAMERAS[(idx - 1 + CAMERAS.length) % CAMERAS.length];
        });
      } else if (e.key === "\\") {
        setPerspective((p) => !p);
      } else if (e.key === "," || e.key === "<") {
        setCamera((c) => {
          const idx = CAMERAS.indexOf(c);
          return CAMERAS[(idx + 1) % CAMERAS.length];
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Title bar routing arrows: cycle through apps
  const currentAppIdx = APP_ORDER.indexOf(screen as NewtonScreen);
  const onRouteLeft = useCallback(() => {
    if (currentAppIdx > 0) setScreen(APP_ORDER[currentAppIdx - 1]);
    else setScreen("extras");
  }, [currentAppIdx]);
  const onRouteRight = useCallback(() => {
    if (currentAppIdx >= 0 && currentAppIdx < APP_ORDER.length - 1) {
      setScreen(APP_ORDER[currentAppIdx + 1]);
    } else if (screen === "extras" && APP_ORDER.length > 0) {
      setScreen(APP_ORDER[0]);
    }
  }, [currentAppIdx, screen]);

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#111",
      overflow: "hidden",
    }}>
      <LCDScreen width={W} height={H} pixelSize={pixelSize} theme={theme} camera={camera} perspective={perspective}>
        <ClearRect x={0} y={0} width={W} height={H} deps={[screen]} />

        {screen === "extras" && <ExtrasScreen onNavigate={setScreen} onExit={onExit} />}
        {screen === "notepad" && <NotepadScreen onBack={goExtras} onLeft={onRouteLeft} onRight={onRouteRight} />}
        {screen === "names" && <NamesScreen onBack={goExtras} onLeft={onRouteLeft} onRight={onRouteRight} />}
        {screen === "dates" && <DatesScreen onBack={goExtras} onLeft={onRouteLeft} onRight={onRouteRight} />}
      </LCDScreen>
    </div>
  );
}
```

Note: The `ExtrasScreen` above has an issue with the `useEffect` trying to do async import. Fix: remove the manual drawing effect and rely purely on JSX `LCDIcon` components (which already handle drawing). The selection highlight needs a different approach — use a `LCDPanel` with fill behind the selected icon. Revised approach: use a separate `useEffect` just for the selection highlight rectangle, and let `LCDIcon` handle icon rendering.

Actually, let me simplify. The whole `useEffect` for manual drawing is unnecessary since we're using declarative components. The selection highlight can be done with a filled panel behind the selected icon. Here's the corrected ExtrasScreen render:

```tsx
function ExtrasScreen({ onNavigate, onExit }: {
  onNavigate: (s: NewtonScreen) => void;
  onExit: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const { engine } = useLCD();

  useCancel(onExit);

  const onUp = useCallback(() => {
    if (selected >= GRID_COLS) { setSelected((s) => s - GRID_COLS); return true; }
    return false;
  }, [selected]);

  const onDown = useCallback(() => {
    if (selected + GRID_COLS < EXTRAS_APPS.length) { setSelected((s) => s + GRID_COLS); return true; }
    return false;
  }, [selected]);

  const onLeft = useCallback(() => {
    if (selected % GRID_COLS > 0) setSelected((s) => s - 1);
  }, [selected]);

  const onRight = useCallback(() => {
    if (selected % GRID_COLS < GRID_COLS - 1 && selected < EXTRAS_APPS.length - 1) setSelected((s) => s + 1);
  }, [selected]);

  const onActivate = useCallback(() => {
    onNavigate(EXTRAS_APPS[selected].screen);
  }, [selected, onNavigate]);

  const gridX = Math.floor((W - GRID_COLS * ICON_CELL_W) / 2);
  const gridY = CONTENT_Y + 20;
  const totalW = GRID_COLS * ICON_CELL_W;
  const rows = Math.ceil(EXTRAS_APPS.length / GRID_COLS);
  const totalH = rows * ICON_CELL_H;

  useFocus({
    rect: { x: gridX, y: gridY, width: totalW, height: totalH },
    order: 10,
    onUp, onDown, onLeft, onRight, onActivate,
  });

  // Draw selection highlight
  useEffect(() => {
    const fb = engine.fb;
    EXTRAS_APPS.forEach((_, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const cx = gridX + col * ICON_CELL_W + Math.floor(ICON_CELL_W / 2);
      const cy = gridY + row * ICON_CELL_H;
      if (i === selected) {
        fb.fillRect(cx - 9, cy - 1, 18, 18, 1);
      } else {
        fb.fillRect(cx - 9, cy - 1, 18, 18, 0);
      }
    });
    engine.markDirty();
  }, [engine, selected, gridX, gridY]);

  return (
    <>
      <NewtonTitleBar title="Extras" />
      <LCDText x={Math.floor((W - font.measureText("Newton MessagePad")) / 2)} y={CONTENT_Y + 4}>Newton MessagePad</LCDText>
      {EXTRAS_APPS.map((app, i) => {
        const col = i % GRID_COLS;
        const row = Math.floor(i / GRID_COLS);
        const cx = gridX + col * ICON_CELL_W + Math.floor(ICON_CELL_W / 2);
        const cy = gridY + row * ICON_CELL_H;
        return [
          <LCDIcon
            key={`icon-${app.name}`}
            x={cx - 8}
            y={cy}
            name={app.icon}
            scale={2}
            intensity={i === selected ? 0 : 1}
          />,
          <LCDText
            key={`label-${app.name}`}
            x={cx - Math.floor(font.measureText(app.name) / 2)}
            y={cy + 18}
          >
            {app.name}
          </LCDText>,
        ];
      })}
      <NewtonBottomBar onOverview={() => {}} />
    </>
  );
}
```

- [ ] **Step 2: Wire Newton into App.tsx**

Add the import and route in `demo/App.tsx`:

```tsx
import { NewtonMode } from "./modes/NewtonMode";
```

Add before the picker return:

```tsx
if (mode === "newton") return <NewtonMode onExit={() => setMode("picker")} />;
```

- [ ] **Step 3: Verify Extras screen renders**

Run: `cd demo && npx vite --open`
Expected: Picker shows both buttons. Newton Mode shows Extras grid with 5 app icons, title "Extras", subtitle "Newton MessagePad", bottom bar with 4 icons. Arrow keys cycle selection. Enter on Notepad/Names/Dates navigates (screens are stubs — will show blank with title bar). Escape returns to picker.

- [ ] **Step 4: Commit**

```bash
git add demo/modes/NewtonMode.tsx demo/App.tsx
git commit -m "feat: add Newton mode with Extras home screen"
```

---

### Task 5: Newton Notepad Screen

**Files:**
- Modify: `demo/modes/NewtonMode.tsx`

- [ ] **Step 1: Add NotepadScreen component**

Add this component inside `NewtonMode.tsx`, before the `NewtonMode` export:

```tsx
interface NotepadItem {
  text: string;
  checked?: boolean;
}

const NOTEPAD_DATA: NotepadItem[] = [
  { text: "Welcome to Newton!" },
  { text: "Tap items to interact" },
  { text: "" },
  { text: "Shopping List:" },
  { text: "Milk", checked: false },
  { text: "Eggs", checked: true },
  { text: "Bread", checked: false },
  { text: "Butter", checked: true },
  { text: "" },
  { text: "Ideas:" },
  { text: "Learn to draw" },
  { text: "Fix the roof" },
  { text: "Call Mom", checked: false },
  { text: "Book flights", checked: true },
];

function NotepadScreen({ onBack, onLeft, onRight }: {
  onBack: () => void;
  onLeft: () => void;
  onRight: () => void;
}) {
  const [items, setItems] = useState<NotepadItem[]>(NOTEPAD_DATA);
  const [selected, setSelected] = useState(0);
  const { engine } = useLCD();

  useCancel(onBack);

  const LINE_H = 14;
  const visibleCount = Math.floor(CONTENT_H / LINE_H);
  const [scrollY, setScrollY] = useState(0);

  const onUp = useCallback(() => {
    if (selected > 0) {
      const next = selected - 1;
      setSelected(next);
      if (next < scrollY) setScrollY(next);
      return true;
    }
    return false;
  }, [selected, scrollY]);

  const onDown = useCallback(() => {
    if (selected < items.length - 1) {
      const next = selected + 1;
      setSelected(next);
      if (next >= scrollY + visibleCount) setScrollY(next - visibleCount + 1);
      return true;
    }
    return false;
  }, [selected, items.length, scrollY, visibleCount]);

  const onActivate = useCallback(() => {
    if (items[selected].checked !== undefined) {
      setItems((prev) => prev.map((item, i) =>
        i === selected ? { ...item, checked: !item.checked } : item
      ));
    }
  }, [selected, items]);

  useFocus({
    rect: { x: 0, y: CONTENT_Y, width: W, height: CONTENT_H },
    order: 10,
    onUp, onDown, onActivate,
  });

  // Draw lined paper + content
  useEffect(() => {
    const fb = engine.fb;
    fb.fillRect(0, CONTENT_Y, W, CONTENT_H, 0);

    const visible = items.slice(scrollY, scrollY + visibleCount);
    visible.forEach((item, i) => {
      const ly = CONTENT_Y + i * LINE_H;

      // Ruled line
      for (let x = 4; x < W - 4; x++) {
        fb.set(x, ly + LINE_H - 1, 0.15);
      }

      const absIdx = scrollY + i;

      // Selection highlight
      if (absIdx === selected) {
        fb.fillRect(2, ly + 1, W - 4, LINE_H - 2, 0.12);
      }

      // Checkbox
      if (item.checked !== undefined) {
        const bx = 6;
        const by = ly + 3;
        // Draw checkbox border
        for (let j = 0; j < 8; j++) {
          fb.set(bx + j, by, 0.8);
          fb.set(bx + j, by + 7, 0.8);
          fb.set(bx, by + j, 0.8);
          fb.set(bx + 7, by + j, 0.8);
        }
        if (item.checked) {
          // Draw checkmark
          fb.set(bx + 2, by + 4, 1);
          fb.set(bx + 3, by + 5, 1);
          fb.set(bx + 4, by + 4, 1);
          fb.set(bx + 5, by + 3, 1);
          fb.set(bx + 6, by + 2, 1);
        }
        font.drawText(fb, item.text, 18, ly + 3, { intensity: 1 });
      } else if (item.text.length > 0) {
        font.drawText(fb, item.text, 6, ly + 3, { intensity: 1 });
      }
    });

    // Scroll bar
    if (items.length > visibleCount) {
      const barTotal = CONTENT_H;
      const barH = Math.max(6, Math.round(barTotal * (visibleCount / items.length)));
      const maxScroll = items.length - visibleCount;
      const barY = CONTENT_Y + Math.round((barTotal - barH) * (scrollY / maxScroll));
      for (let i = 0; i < barH; i++) {
        fb.set(W - 3, barY + i, 0.5);
      }
    }

    engine.markDirty();
  }, [engine, items, selected, scrollY, visibleCount]);

  return (
    <>
      <NewtonTitleBar title="Notepad" onLeft={onLeft} onRight={onRight} />
      <NewtonBottomBar onOverview={onBack} />
    </>
  );
}
```

- [ ] **Step 2: Verify Notepad renders**

Run dev server, navigate to Newton Mode > Notepad.
Expected: Lined paper with notes and checkable items. Arrow keys scroll, Enter toggles checkboxes. Title bar shows routing arrows.

- [ ] **Step 3: Commit**

```bash
git add demo/modes/NewtonMode.tsx
git commit -m "feat: add Newton Notepad screen"
```

---

### Task 6: Newton Names Screen

**Files:**
- Modify: `demo/modes/NewtonMode.tsx`

- [ ] **Step 1: Add NamesScreen component**

```tsx
interface Contact {
  name: string;
  phone: string;
  address: string;
  email: string;
}

const CONTACTS: Contact[] = [
  { name: "Ada Lovelace", phone: "555-0101", address: "12 Math Lane", email: "ada@engine.co" },
  { name: "Alan Turing", phone: "555-0102", address: "7 Bletchley Rd", email: "alan@enigma.uk" },
  { name: "Bob Kahn", phone: "555-0201", address: "9 Internet Ave", email: "bob@tcp.net" },
  { name: "Claude Shannon", phone: "555-0301", address: "1 Bit Street", email: "claude@info.io" },
  { name: "Dennis Ritchie", phone: "555-0401", address: "4 Unix Way", email: "dmr@bell.com" },
  { name: "Grace Hopper", phone: "555-0701", address: "3 Navy Blvd", email: "grace@cobol.mil" },
  { name: "John von Neumann", phone: "555-1001", address: "5 Logic Dr", email: "jvn@ias.edu" },
  { name: "Nikola Tesla", phone: "555-1401", address: "8 AC Current Pl", email: "nikola@tesla.rs" },
];

function NamesScreen({ onBack, onLeft, onRight }: {
  onBack: () => void;
  onLeft: () => void;
  onRight: () => void;
}) {
  const [selectedContact, setSelectedContact] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const { engine } = useLCD();

  useCancel(useCallback(() => {
    if (expanded) {
      setExpanded(false);
    } else {
      onBack();
    }
  }, [expanded, onBack]));

  const onUp = useCallback(() => {
    if (expanded) return false;
    if (selectedContact > 0) { setSelectedContact((s) => s - 1); return true; }
    return false;
  }, [selectedContact, expanded]);

  const onDown = useCallback(() => {
    if (expanded) return false;
    if (selectedContact < CONTACTS.length - 1) { setSelectedContact((s) => s + 1); return true; }
    return false;
  }, [selectedContact, expanded]);

  const onActivate = useCallback(() => {
    setExpanded((e) => !e);
  }, []);

  useFocus({
    rect: { x: 0, y: CONTENT_Y, width: W, height: CONTENT_H },
    order: 10,
    onUp, onDown, onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    fb.fillRect(0, CONTENT_Y, W, CONTENT_H, 0);

    if (expanded) {
      const c = CONTACTS[selectedContact];
      const startY = CONTENT_Y + 8;
      font.drawText(fb, c.name, 10, startY, { intensity: 1 });
      // Underline
      const nameW = font.measureText(c.name);
      for (let x = 10; x < 10 + nameW; x++) fb.set(x, startY + 9, 0.6);

      font.drawText(fb, `Tel:  ${c.phone}`, 10, startY + 20, { intensity: 1 });
      font.drawText(fb, `Addr: ${c.address}`, 10, startY + 34, { intensity: 1 });
      font.drawText(fb, `Mail: ${c.email}`, 10, startY + 48, { intensity: 1 });

      // Divider
      for (let x = 10; x < W - 10; x++) fb.set(x, startY + 64, 0.3);

      font.drawText(fb, "Esc to go back", 10, startY + 72, { intensity: 0.5 });
    } else {
      // Alphabetical tab on the left
      const tabW = 14;
      const letters = [...new Set(CONTACTS.map((c) => c.name[0].toUpperCase()))].sort();
      const tabH = Math.min(12, Math.floor(CONTENT_H / letters.length));
      letters.forEach((letter, i) => {
        const ly = CONTENT_Y + 2 + i * tabH;
        const isActive = CONTACTS[selectedContact].name[0].toUpperCase() === letter;
        if (isActive) {
          fb.fillRect(0, ly, tabW, tabH - 1, 1);
          font.drawText(fb, letter, 4, ly + 2, { intensity: 0 });
        } else {
          font.drawText(fb, letter, 4, ly + 2, { intensity: 0.7 });
        }
      });

      // Vertical divider
      for (let y = CONTENT_Y; y < CONTENT_Y + CONTENT_H; y++) {
        fb.set(tabW, y, 0.4);
      }

      // Contact list
      const listX = tabW + 4;
      const LINE_H = 22;
      CONTACTS.forEach((c, i) => {
        const ly = CONTENT_Y + 4 + i * LINE_H;
        if (ly + LINE_H > CONTENT_Y + CONTENT_H) return;

        if (i === selectedContact) {
          fb.fillRect(listX - 2, ly - 1, W - listX - 2, LINE_H - 2, 0.12);
        }

        font.drawText(fb, c.name, listX, ly, { intensity: 1 });
        font.drawText(fb, c.phone, listX, ly + 10, { intensity: 0.6 });
      });
    }

    engine.markDirty();
  }, [engine, selectedContact, expanded]);

  return (
    <>
      <NewtonTitleBar title="Names" onLeft={onLeft} onRight={onRight} />
      <NewtonBottomBar onOverview={onBack} />
    </>
  );
}
```

- [ ] **Step 2: Verify Names renders**

Run dev server, navigate to Newton Mode > Names.
Expected: Alphabetical tabs on left, contact list on right. Arrow keys select contacts. Enter expands/collapses card. Escape goes back.

- [ ] **Step 3: Commit**

```bash
git add demo/modes/NewtonMode.tsx
git commit -m "feat: add Newton Names screen"
```

---

### Task 7: Newton Dates Screen

**Files:**
- Modify: `demo/modes/NewtonMode.tsx`

- [ ] **Step 1: Add DatesScreen component**

```tsx
const SAMPLE_EVENTS: Record<string, string[]> = {
  "2026-04-04": ["Team standup 9am", "Lunch with Ada"],
  "2026-04-07": ["Dentist 2pm"],
  "2026-04-15": ["Tax day"],
  "2026-04-22": ["Earth Day picnic"],
};

function DatesScreen({ onBack, onLeft, onRight }: {
  onBack: () => void;
  onLeft: () => void;
  onRight: () => void;
}) {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(3); // 0-indexed, April = 3
  const [selectedDay, setSelectedDay] = useState(4);
  const { engine } = useLCD();

  useCancel(onBack);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const monthName = new Date(year, month, 1).toLocaleString("en", { month: "long" });

  const CELL_W = Math.floor((W - 8) / 7);
  const CELL_H = 14;
  const CAL_X = 4;
  const CAL_Y = CONTENT_Y + 16;
  const DAYS_HEADER_Y = CAL_Y;
  const GRID_Y = CAL_Y + 12;

  const calRows = Math.ceil((firstDayOfWeek + daysInMonth) / 7);
  const calH = calRows * CELL_H;
  const detailY = GRID_Y + calH + 8;

  const onUp = useCallback(() => {
    const next = selectedDay - 7;
    if (next >= 1) { setSelectedDay(next); return true; }
    return false;
  }, [selectedDay]);

  const onDown = useCallback(() => {
    const next = selectedDay + 7;
    if (next <= daysInMonth) { setSelectedDay(next); return true; }
    return false;
  }, [selectedDay, daysInMonth]);

  const onLeftKey = useCallback(() => {
    if (selectedDay > 1) setSelectedDay((d) => d - 1);
  }, [selectedDay]);

  const onRightKey = useCallback(() => {
    if (selectedDay < daysInMonth) setSelectedDay((d) => d + 1);
  }, [selectedDay, daysInMonth]);

  const onActivate = useCallback(() => {
    // Cycle month forward on Enter (simple interaction)
    if (month < 11) {
      setMonth((m) => m + 1);
      setSelectedDay(1);
    } else {
      setYear((y) => y + 1);
      setMonth(0);
      setSelectedDay(1);
    }
  }, [month]);

  useFocus({
    rect: { x: CAL_X, y: GRID_Y, width: 7 * CELL_W, height: calH },
    order: 10,
    onUp, onDown, onLeft: onLeftKey, onRight: onRightKey, onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    fb.fillRect(0, CONTENT_Y, W, CONTENT_H, 0);

    // Month header with arrows
    const headerText = `${monthName} ${year}`;
    const headerW = font.measureText(headerText);
    font.drawText(fb, "<", CAL_X + 4, CONTENT_Y + 4, { intensity: 0.7 });
    font.drawText(fb, headerText, Math.floor((W - headerW) / 2), CONTENT_Y + 4, { intensity: 1 });
    font.drawText(fb, ">", W - CAL_X - 8, CONTENT_Y + 4, { intensity: 0.7 });

    // Day-of-week headers
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    dayNames.forEach((d, i) => {
      font.drawText(fb, d, CAL_X + i * CELL_W + 2, DAYS_HEADER_Y, { intensity: 0.6 });
    });

    // Divider under headers
    for (let x = CAL_X; x < CAL_X + 7 * CELL_W; x++) {
      fb.set(x, DAYS_HEADER_Y + 9, 0.3);
    }

    // Calendar grid
    for (let day = 1; day <= daysInMonth; day++) {
      const cellIdx = firstDayOfWeek + day - 1;
      const col = cellIdx % 7;
      const row = Math.floor(cellIdx / 7);
      const cx = CAL_X + col * CELL_W;
      const cy = GRID_Y + row * CELL_H;

      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const hasEvent = SAMPLE_EVENTS[dateKey] !== undefined;

      if (day === selectedDay) {
        fb.fillRect(cx, cy, CELL_W - 1, CELL_H - 2, 1);
        font.drawText(fb, String(day), cx + 2, cy + 2, { intensity: 0 });
      } else {
        font.drawText(fb, String(day), cx + 2, cy + 2, { intensity: 1 });
        if (hasEvent) {
          fb.set(cx + CELL_W / 2, cy + CELL_H - 3, 0.8);
        }
      }
    }

    // Divider before detail area
    for (let x = 4; x < W - 4; x++) {
      fb.set(x, detailY - 4, 0.3);
    }

    // Event detail for selected day
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    const events = SAMPLE_EVENTS[dateKey];
    if (events) {
      events.forEach((ev, i) => {
        font.drawText(fb, `* ${ev}`, 8, detailY + i * 12, { intensity: 1 });
      });
    } else {
      font.drawText(fb, "No events", 8, detailY, { intensity: 0.4 });
    }

    engine.markDirty();
  }, [engine, year, month, selectedDay, daysInMonth, firstDayOfWeek, monthName, detailY]);

  return (
    <>
      <NewtonTitleBar title="Dates" onLeft={onLeft} onRight={onRight} />
      <NewtonBottomBar onOverview={onBack} />
    </>
  );
}
```

- [ ] **Step 2: Verify Dates renders**

Run dev server, navigate to Newton Mode > Dates.
Expected: Month grid with day numbers, Su-Sa headers. Selected day is inverted. Arrow keys move selection. Events shown below grid. Enter cycles month.

- [ ] **Step 3: Commit**

```bash
git add demo/modes/NewtonMode.tsx
git commit -m "feat: add Newton Dates screen"
```

---

### Task 8: Final Integration & Typecheck

**Files:**
- Modify: `demo/modes/NewtonMode.tsx` (if any stub references remain)

- [ ] **Step 1: Verify all screens are wired**

Ensure `NewtonMode` render includes all four screen routes:
```tsx
{screen === "extras" && <ExtrasScreen onNavigate={setScreen} onExit={onExit} />}
{screen === "notepad" && <NotepadScreen onBack={goExtras} onLeft={onRouteLeft} onRight={onRouteRight} />}
{screen === "names" && <NamesScreen onBack={goExtras} onLeft={onRouteLeft} onRight={onRouteRight} />}
{screen === "dates" && <DatesScreen onBack={goExtras} onLeft={onRouteLeft} onRight={onRouteRight} />}
```

- [ ] **Step 2: Full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Manual smoke test**

Run: `cd demo && npx vite --open`
Test:
1. Mode picker renders, both buttons work
2. Nokia mode: all screens work, Escape returns to picker
3. Newton Extras: grid renders, arrow nav works, Enter opens apps
4. Newton Notepad: lined paper, checkboxes toggle, scroll works
5. Newton Names: alpha tabs, contact list, expand/collapse
6. Newton Dates: calendar grid, day selection, events display
7. Hotkeys work in both modes: `-`/`+`, `,`/`.`, `\`
8. Routing arrows in Newton title bar cycle between apps

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete Newton mode with all screens"
```
