import { useState, useEffect, useCallback } from "react";
import {
  LCDScreen,
  LCDText,
  LCDPanel,
  LCDDivider,
  LCDIcon,
  BitmapFont,
  useLCD,
  useFocus,
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

const APP_ORDER = ["notepad", "names", "dates"] as const;
type AppScreen = (typeof APP_ORDER)[number];
type Screen = "extras" | AppScreen;

const APP_TITLES: Record<AppScreen, string> = {
  notepad: "Notepad",
  names: "Names",
  dates: "Dates",
};

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

// --- Title Bar ---

function TitleBar({ title, screen, onNavigate }: {
  title: string;
  screen: Screen;
  onNavigate: (s: Screen) => void;
}) {
  const isApp = screen !== "extras";
  const titleW = font.measureText(title);
  const titleX = Math.floor((W - titleW) / 2);

  const onLeft = useCallback(() => {
    if (!isApp) return;
    const idx = APP_ORDER.indexOf(screen as AppScreen);
    if (idx <= 0) onNavigate("extras");
    else onNavigate(APP_ORDER[idx - 1]);
  }, [isApp, screen, onNavigate]);

  const onRight = useCallback(() => {
    if (!isApp) return;
    const idx = APP_ORDER.indexOf(screen as AppScreen);
    if (idx >= APP_ORDER.length - 1) onNavigate("extras");
    else onNavigate(APP_ORDER[idx + 1]);
  }, [isApp, screen, onNavigate]);

  return (
    <>
      <LCDPanel x={0} y={0} width={W} height={TITLE_H} border={false}>
        {isApp && <LCDIcon x={2} y={3} name="arrow_left" />}
        <LCDText x={titleX} y={3}>{title}</LCDText>
        {isApp && <LCDIcon x={W - 10} y={3} name="arrow_right" />}
      </LCDPanel>
      <LCDDivider x={0} y={TITLE_H} length={W} />
      {isApp && <TitleBarNav onLeft={onLeft} onRight={onRight} />}
    </>
  );
}

function TitleBarNav({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
  // Invisible focus item to capture left/right on title bar arrows
  const { engine, offsetX, offsetY } = useLCD();
  useFocus({
    rect: { x: offsetX, y: offsetY, width: W, height: TITLE_H },
    order: 1,
    onLeft,
    onRight,
  });
  return null;
}

// --- Bottom Bar ---

function BottomBar({ onExtras }: { onExtras: () => void }) {
  const barY = H - BOTTOM_H;
  const iconNames = ["star", "undo_arrow", "magnifier", "grid"];
  const spacing = W / 4;

  return (
    <>
      <LCDDivider x={0} y={barY} length={W} />
      {iconNames.map((name, i) => {
        const iconX = Math.floor(spacing * i + spacing / 2 - 4);
        const iconY = barY + 4;
        return (
          <BottomBarIcon
            key={name}
            x={iconX}
            y={iconY}
            name={name}
            order={900 + i}
            onActivate={name === "grid" ? onExtras : undefined}
          />
        );
      })}
    </>
  );
}

function BottomBarIcon({ x, y, name, order, onActivate }: {
  x: number; y: number; name: string; order: number; onActivate?: () => void;
}) {
  const { offsetX, offsetY } = useLCD();
  useFocus({
    rect: { x: x + offsetX, y: y + offsetY, width: 8, height: 8 },
    order,
    onActivate,
  });
  return <LCDIcon x={x} y={y} name={name} />;
}

// --- Extras Screen ---

interface ExtrasIcon {
  name: string;
  icon: string;
  screen: Screen;
}

const EXTRAS_ICONS: ExtrasIcon[] = [
  { name: "Notepad", icon: "notepad", screen: "notepad" },
  { name: "Names", icon: "person", screen: "names" },
  { name: "Dates", icon: "calendar", screen: "dates" },
  { name: "Calc", icon: "calculator", screen: "extras" },
  { name: "Prefs", icon: "prefs", screen: "extras" },
];

const GRID_COLS = 4;
const ICON_SCALE = 2;
const ICON_PX = 8 * ICON_SCALE; // 16
const CELL_W = 50;
const CELL_H = 30;
const GRID_START_X = Math.floor((W - GRID_COLS * CELL_W) / 2);
const GRID_START_Y = CONTENT_Y + 20;

function ExtrasScreen({ onNavigate, onExit }: {
  onNavigate: (s: Screen) => void;
  onExit: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const { offsetX, offsetY } = useLCD();

  useCancel(onExit);

  const rows = Math.ceil(EXTRAS_ICONS.length / GRID_COLS);

  const onUp = useCallback(() => {
    setSelected((s) => {
      const row = Math.floor(s / GRID_COLS);
      if (row <= 0) return s;
      return s - GRID_COLS;
    });
    return true;
  }, []);

  const onDown = useCallback(() => {
    setSelected((s) => {
      const next = s + GRID_COLS;
      if (next >= EXTRAS_ICONS.length) return s;
      return next;
    });
    return true;
  }, []);

  const onLeft = useCallback(() => {
    setSelected((s) => (s > 0 ? s - 1 : s));
    return true;
  }, []);

  const onRight = useCallback(() => {
    setSelected((s) => (s < EXTRAS_ICONS.length - 1 ? s + 1 : s));
    return true;
  }, []);

  const onActivate = useCallback(() => {
    onNavigate(EXTRAS_ICONS[selected].screen);
  }, [selected, onNavigate]);

  useFocus({
    rect: { x: offsetX, y: GRID_START_Y + offsetY, width: W, height: rows * CELL_H },
    order: 10,
    onUp,
    onDown,
    onLeft,
    onRight,
    onActivate,
  });

  const subtitle = "Newton MessagePad";
  const subW = font.measureText(subtitle);
  const subX = Math.floor((W - subW) / 2);

  return (
    <>
      <TitleBar title="Extras" screen="extras" onNavigate={onNavigate} />
      <LCDText x={subX} y={CONTENT_Y + 4}>{subtitle}</LCDText>

      {EXTRAS_ICONS.map((item, i) => {
        const col = i % GRID_COLS;
        const row = Math.floor(i / GRID_COLS);
        const cx = GRID_START_X + col * CELL_W + Math.floor(CELL_W / 2);
        const cy = GRID_START_Y + row * CELL_H;
        const iconX = cx - Math.floor(ICON_PX / 2);
        const iconY = cy;
        const labelW = font.measureText(item.name);
        const labelX = cx - Math.floor(labelW / 2);
        const isSel = i === selected;

        return (
          <ExtrasIconCell
            key={item.icon}
            iconX={iconX}
            iconY={iconY}
            iconName={item.icon}
            label={item.name}
            labelX={labelX}
            labelY={iconY + ICON_PX + 2}
            selected={isSel}
          />
        );
      })}

      <BottomBar onExtras={() => {}} />
    </>
  );
}

function ExtrasIconCell({ iconX, iconY, iconName, label, labelX, labelY, selected }: {
  iconX: number; iconY: number; iconName: string;
  label: string; labelX: number; labelY: number;
  selected: boolean;
}) {
  const { engine, offsetX, offsetY } = useLCD();

  // Draw highlight rect behind icon when selected
  useEffect(() => {
    if (!selected) return;
    const fb = engine.fb;
    const ax = iconX + offsetX;
    const ay = iconY + offsetY;
    fb.fillRect(ax - 2, ay - 2, ICON_PX + 4, ICON_PX + 4, 1);
    engine.markDirty();
  }, [engine, offsetX, offsetY, iconX, iconY, selected]);

  return (
    <>
      <LCDIcon x={iconX} y={iconY} name={iconName} scale={ICON_SCALE} intensity={selected ? 0 : 1} />
      <LCDText x={labelX} y={labelY}>{label}</LCDText>
    </>
  );
}

// --- Notepad Screen ---

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

const LINE_H = 14;

function NotepadScreen({ screen, onNavigate, onExtras }: {
  screen: AppScreen;
  onNavigate: (s: Screen) => void;
  onExtras: () => void;
}) {
  const [items, setItems] = useState<NotepadItem[]>(NOTEPAD_DATA.map(i => ({ ...i })));
  const [selected, setSelected] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useCancel(onExtras);

  const visibleCount = Math.floor(CONTENT_H / LINE_H);
  const maxScroll = Math.max(0, items.length - visibleCount);

  const onUp = useCallback(() => {
    setSelected((s) => {
      const next = Math.max(0, s - 1);
      setScrollY((sc) => Math.min(sc, next));
      return next;
    });
    return true;
  }, []);

  const onDown = useCallback(() => {
    setSelected((s) => {
      const next = Math.min(items.length - 1, s + 1);
      setScrollY((sc) => {
        const minScroll = next - visibleCount + 1;
        return Math.min(maxScroll, Math.max(sc, minScroll));
      });
      return next;
    });
    return true;
  }, [items.length, visibleCount, maxScroll]);

  const onActivate = useCallback(() => {
    setItems((prev) => {
      const item = prev[selected];
      if (item.checked === undefined) return prev;
      const next = [...prev];
      next[selected] = { ...item, checked: !item.checked };
      return next;
    });
    return true;
  }, [selected]);

  const { engine, offsetX, offsetY } = useLCD();

  useFocus({
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp,
    onDown,
    onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    // Clear content area
    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    // Draw ruled lines
    for (let row = 0; row < visibleCount; row++) {
      const lineY = CONTENT_Y + oy + row * LINE_H + LINE_H - 1;
      for (let x = ox + 4; x < ox + W - 4; x++) {
        fb.set(x, lineY, 0.15);
      }
    }

    // Draw items
    const visible = items.slice(scrollY, scrollY + visibleCount);
    visible.forEach((item, i) => {
      const itemIdx = scrollY + i;
      const itemY = CONTENT_Y + oy + i * LINE_H + 2;

      // Highlight selected row
      if (itemIdx === selected) {
        fb.fillRect(ox + 2, CONTENT_Y + oy + i * LINE_H, W - 4, LINE_H - 1, 0.12);
      }

      if (item.text === "") return;

      if (item.checked !== undefined) {
        // Draw checkbox 8x8 border at x=6
        const cbX = ox + 6;
        const cbY = itemY;
        for (let bx = 0; bx < 8; bx++) {
          fb.set(cbX + bx, cbY, 1);
          fb.set(cbX + bx, cbY + 7, 1);
        }
        for (let by = 0; by < 8; by++) {
          fb.set(cbX, cbY + by, 1);
          fb.set(cbX + 7, cbY + by, 1);
        }
        // Draw checkmark if checked
        if (item.checked) {
          fb.set(cbX + 2, cbY + 4, 1);
          fb.set(cbX + 3, cbY + 5, 1);
          fb.set(cbX + 4, cbY + 4, 1);
          fb.set(cbX + 5, cbY + 3, 1);
          fb.set(cbX + 6, cbY + 2, 1);
        }
        font.drawText(fb, item.text, ox + 18, itemY, { intensity: 1 });
      } else {
        font.drawText(fb, item.text, ox + 6, itemY, { intensity: 1 });
      }
    });

    // Scrollbar
    if (items.length > visibleCount) {
      const barH = Math.max(4, Math.round(CONTENT_H * (visibleCount / items.length)));
      const barY = CONTENT_Y + oy + Math.round((CONTENT_H - barH) * (scrollY / maxScroll));
      for (let i = 0; i < barH; i++) {
        fb.set(ox + W - 2, barY + i, 0.6);
      }
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, items, selected, scrollY, visibleCount, maxScroll]);

  return (
    <>
      <TitleBar title="Notepad" screen={screen} onNavigate={onNavigate} />
      <BottomBar onExtras={onExtras} />
    </>
  );
}

// --- Stub Screens ---

function StubScreen({ title, screen, onNavigate, onExtras }: {
  title: string;
  screen: AppScreen;
  onNavigate: (s: Screen) => void;
  onExtras: () => void;
}) {
  useCancel(onExtras);

  const text = "Coming soon";
  const textW = font.measureText(text);
  const textX = Math.floor((W - textW) / 2);
  const textY = CONTENT_Y + Math.floor(CONTENT_H / 2) - 4;

  return (
    <>
      <TitleBar title={title} screen={screen} onNavigate={onNavigate} />
      <LCDText x={textX} y={textY}>{text}</LCDText>
      <BottomBar onExtras={onExtras} />
    </>
  );
}

// --- Main Newton Mode ---

export function NewtonMode({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<Screen>("extras");
  const [pixelSize, setPixelSize] = useState(3);
  const [camera, setCamera] = useState("straight");
  const [perspective, setPerspective] = useState(false);

  const goExtras = useCallback(() => setScreen("extras"), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "-" || e.key === "_") {
        setPixelSize((s) => Math.max(2, s - 1));
      } else if (e.key === "=" || e.key === "+") {
        setPixelSize((s) => Math.min(8, s + 1));
      } else if (e.key === "," || e.key === "<") {
        setCamera((c) => {
          const idx = CAMERAS.indexOf(c);
          return CAMERAS[(idx + 1) % CAMERAS.length];
        });
      } else if (e.key === "." || e.key === ">") {
        setCamera((c) => {
          const idx = CAMERAS.indexOf(c);
          return CAMERAS[(idx - 1 + CAMERAS.length) % CAMERAS.length];
        });
      } else if (e.key === "\\") {
        setPerspective((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
      <LCDScreen width={W} height={H} pixelSize={pixelSize} theme={"newton" as ThemePresetName} camera={camera} perspective={perspective}>
        <ClearRect x={0} y={0} width={W} height={H} deps={[screen]} />

        {screen === "extras" && <ExtrasScreen onNavigate={setScreen} onExit={onExit} />}
        {screen === "notepad" && <NotepadScreen screen="notepad" onNavigate={setScreen} onExtras={goExtras} />}
        {screen === "names" && <StubScreen title="Names" screen="names" onNavigate={setScreen} onExtras={goExtras} />}
        {screen === "dates" && <StubScreen title="Dates" screen="dates" onNavigate={setScreen} onExtras={goExtras} />}
      </LCDScreen>
    </div>
  );
}
