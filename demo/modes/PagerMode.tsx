import { useState, useEffect, useCallback, useRef } from "react";
import {
  LCDScreen,
  BitmapFont,
  useLCD,
  useFocus,
  type ThemePresetName,
} from "../../src";

const smallFont = new BitmapFont("3x5");
const bigFont = new BitmapFont();

const W = 120;
const H = 32;

const CAMERAS: string[] = ["straight", "isometric", "desk", "handheld"];

const INITIAL_MESSAGES = [
  "CALL OFFICE 555-0100 URGENT",
  "MTG MOVED TO 3PM CONF RM B",
  "PICK UP RX AT PHARMACY",
  "FLIGHT DL1742 GATE B12 ON TIME",
  "DINNER 7PM JOES PIZZA",
  "CALL MOM 555-0199",
];

type Screen = "alert" | "clock" | "messages" | "settings" | "deleted";

/* ── helpers ─────────────────────────────────────────────── */

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

/* ── Word wrap helper ────────────────────────────────────── */

function wrapText(text: string, maxWidth: number, font: BitmapFont, scale = 1): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (font.measureText(test, scale) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/* ── Settings OptionRow ──────────────────────────────────── */

function OptionRow({ y, label, value, options, onChange, focusOrder }: {
  y: number;
  label: string; value: string;
  options: string[];
  onChange: (val: string) => void;
  focusOrder: number;
}) {
  const { engine, offsetX, offsetY } = useLCD();
  const absX = offsetX;
  const absY = y + offsetY;
  const idx = options.indexOf(value);

  const onLeft = useCallback(() => {
    const prev = (idx - 1 + options.length) % options.length;
    onChange(options[prev]);
  }, [idx, options, onChange]);

  const onRight = useCallback(() => {
    const next = (idx + 1) % options.length;
    onChange(options[next]);
  }, [idx, options, onChange]);

  const { focused } = useFocus({
    rect: { x: absX, y: absY, width: W, height: 8 },
    order: focusOrder,
    onLeft,
    onRight,
  });

  useEffect(() => {
    const fb = engine.fb;
    fb.fillRect(absX, absY, W, 8, 0);
    smallFont.drawText(fb, label, absX + 2, absY + 1, { intensity: 1 });
    const valText = `<${value}>`;
    const valW = smallFont.measureText(valText);
    smallFont.drawText(fb, valText, absX + W - valW - 2, absY + 1, {
      intensity: focused ? 1 : 0.6,
    });
    engine.markDirty();
  }, [engine, absX, absY, label, value, focused]);

  return null;
}

/* ── Alert Screen ────────────────────────────────────────── */

function AlertScreen() {
  const { engine, offsetX, offsetY } = useLCD();
  const [visible, setVisible] = useState(true);

  useFocus({
    rect: { x: offsetX, y: offsetY, width: W, height: H },
    order: 10,
  });

  useEffect(() => {
    const id = setInterval(() => setVisible(v => !v), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;
    fb.fillRect(ox, oy, W, H, 0);
    const text = "* NEW MESSAGE *";
    const tw = smallFont.measureText(text);
    smallFont.drawText(fb, text, ox + Math.floor((W - tw) / 2), oy + Math.floor((H - 5) / 2), {
      intensity: visible ? 1 : 0.3,
    });
    engine.markDirty();
  }, [engine, offsetX, offsetY, visible]);

  return null;
}

/* ── Clock Screen ────────────────────────────────────────── */

function ClockScreen({ messages, onExit, onMessages, onSettings }: {
  messages: string[];
  onExit: () => void;
  onMessages: () => void;
  onSettings: () => void;
}) {
  const { engine, offsetX, offsetY } = useLCD();
  const [now, setNow] = useState(() => new Date());

  useCancel(onExit);

  const onActivate = useCallback(() => { onMessages(); }, [onMessages]);

  useFocus({
    rect: { x: offsetX, y: offsetY, width: W, height: H },
    order: 10,
    onActivate,
  });

  // Listen for 's' key for settings
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "s" || e.key === "S") onSettings();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSettings]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;
    fb.fillRect(ox, oy, W, H, 0);

    // Time - large font scale 2
    const hours = now.getHours();
    const h12 = hours % 12 || 12;
    const ampm = hours < 12 ? "AM" : "PM";
    const timeStr = `${String(h12).padStart(2, " ")}:${String(now.getMinutes()).padStart(2, "0")} ${ampm}`;
    const tw = bigFont.measureText(timeStr, 2);
    bigFont.drawText(fb, timeStr, ox + Math.floor((W - tw) / 2), oy + 2, { scale: 2, intensity: 1 });

    // Date - small font
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const dateStr = `${days[now.getDay()]} ${months[now.getMonth()]} ${now.getDate()}`;
    const dw = smallFont.measureText(dateStr);
    smallFont.drawText(fb, dateStr, ox + Math.floor((W - dw) / 2), oy + 19, { intensity: 0.7 });

    // Message count
    if (messages.length > 0) {
      const msgStr = `${messages.length} msgs`;
      const mw = smallFont.measureText(msgStr);
      smallFont.drawText(fb, msgStr, ox + W - mw - 2, oy + H - 7, { intensity: 0.5 });
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, now, messages.length]);

  return null;
}

/* ── Message Screen ──────────────────────────────────────── */

function MessageScreen({ messages, index, onIndexChange, onBack, onDelete }: {
  messages: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onBack: () => void;
  onDelete: (i: number) => void;
}) {
  const { engine, offsetX, offsetY } = useLCD();

  useCancel(onBack);

  const onUp = useCallback(() => {
    if (index > 0) { onIndexChange(index - 1); return true; }
    return false;
  }, [index, onIndexChange]);

  const onDown = useCallback(() => {
    if (index < messages.length - 1) { onIndexChange(index + 1); return true; }
    return false;
  }, [index, messages.length, onIndexChange]);

  useFocus({
    rect: { x: offsetX, y: offsetY, width: W, height: H },
    order: 10,
    onUp,
    onDown,
  });

  // Listen for 'd' key to delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "d" || e.key === "D") && messages.length > 0) {
        onDelete(index);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, messages.length, onDelete]);

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;
    fb.fillRect(ox, oy, W, H, 0);

    if (messages.length === 0) {
      const text = "NO MESSAGES";
      const tw = smallFont.measureText(text);
      smallFont.drawText(fb, text, ox + Math.floor((W - tw) / 2), oy + Math.floor((H - 5) / 2), { intensity: 0.7 });
    } else {
      // Header
      const header = `MSG ${index + 1}/${messages.length}`;
      smallFont.drawText(fb, header, ox + 2, oy + 1, { intensity: 0.6 });

      // Message body wrapped
      const lines = wrapText(messages[index], W - 4, smallFont);
      const startY = oy + 9;
      for (let i = 0; i < lines.length && startY + i * 7 < oy + H; i++) {
        smallFont.drawText(fb, lines[i], ox + 2, startY + i * 7, { intensity: 1 });
      }
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, messages, index]);

  return null;
}

/* ── Deleted Flash Screen ────────────────────────────────── */

function DeletedScreen() {
  const { engine, offsetX, offsetY } = useLCD();

  useFocus({
    rect: { x: offsetX, y: offsetY, width: W, height: H },
    order: 10,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;
    fb.fillRect(ox, oy, W, H, 0);
    const text = "DELETED";
    const tw = smallFont.measureText(text);
    smallFont.drawText(fb, text, ox + Math.floor((W - tw) / 2), oy + Math.floor((H - 5) / 2), { intensity: 1 });
    engine.markDirty();
  }, [engine, offsetX, offsetY]);

  return null;
}

/* ── Settings Screen ─────────────────────────────────────── */

function SettingsScreen({ onBack, theme, onThemeChange, camera, onCameraChange, pixelSize, onPixelSizeChange, perspective, onPerspectiveChange }: {
  onBack: () => void;
  theme: ThemePresetName;
  onThemeChange: (t: ThemePresetName) => void;
  camera: string;
  onCameraChange: (c: string) => void;
  pixelSize: number;
  onPixelSizeChange: (s: number) => void;
  perspective: boolean;
  onPerspectiveChange: (v: boolean) => void;
}) {
  const themes: ThemePresetName[] = ["pager", "green", "amber", "gray", "blue"];
  const sizes = ["2", "3", "4", "5", "6", "7", "8"];

  useCancel(onBack);

  return (
    <>
      <OptionRow y={1} label="Theme" value={theme} options={themes} onChange={(v) => onThemeChange(v as ThemePresetName)} focusOrder={10} />
      <OptionRow y={9} label="Cam" value={camera} options={CAMERAS} onChange={onCameraChange} focusOrder={20} />
      <OptionRow y={17} label="Pix" value={String(pixelSize)} options={sizes} onChange={(v) => onPixelSizeChange(Number(v))} focusOrder={30} />
      <OptionRow y={25} label="Prsp" value={perspective ? "ON" : "OFF"} options={["OFF", "ON"]} onChange={(v) => onPerspectiveChange(v === "ON")} focusOrder={40} />
    </>
  );
}

/* ── Main Export ─────────────────────────────────────────── */

export function PagerMode({ onExit, camera, setCamera, perspective, setPerspective }: {
  onExit: () => void;
  camera: string;
  setCamera: (fn: (s: string) => string) => void;
  perspective: boolean;
  setPerspective: (fn: (s: boolean) => boolean) => void;
}) {
  const [pixelSize, setPixelSize] = useState(6);
  const [screen, setScreen] = useState<Screen>("alert");
  const [theme, setTheme] = useState<ThemePresetName>("pager");
  const [messages, setMessages] = useState<string[]>([...INITIAL_MESSAGES]);
  const [msgIndex, setMsgIndex] = useState(0);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Alert auto-dismiss after 3 seconds
  useEffect(() => {
    if (screen === "alert") {
      alertTimerRef.current = setTimeout(() => setScreen("clock"), 3000);
      return () => {
        if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
      };
    }
  }, [screen]);

  // Deleted flash - show briefly then go back to messages
  useEffect(() => {
    if (screen === "deleted") {
      const id = setTimeout(() => setScreen("messages"), 800);
      return () => clearTimeout(id);
    }
  }, [screen]);

  const handleDelete = useCallback((i: number) => {
    setMessages(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      // Adjust index
      if (next.length === 0) {
        setMsgIndex(0);
      } else if (i >= next.length) {
        setMsgIndex(next.length - 1);
      } else {
        setMsgIndex(i);
      }
      return next;
    });
    setScreen("deleted");
  }, []);

  // Shared hotkeys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "-" || e.key === "_") {
        setPixelSize(s => Math.max(2, s - 1));
      } else if (e.key === "=" || e.key === "+") {
        setPixelSize(s => Math.min(8, s + 1));
      } else if (e.key === "," || e.key === "<") {
        setCamera(c => {
          const idx = CAMERAS.indexOf(c);
          return CAMERAS[(idx - 1 + CAMERAS.length) % CAMERAS.length];
        });
      } else if (e.key === "." || e.key === ">") {
        setCamera(c => {
          const idx = CAMERAS.indexOf(c);
          return CAMERAS[(idx + 1) % CAMERAS.length];
        });
      } else if (e.key === "\\") {
        setPerspective(p => !p);
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
      <LCDScreen width={W} height={H} pixelSize={pixelSize} theme={theme} camera={camera} perspective={perspective}>
        <ClearRect x={0} y={0} width={W} height={H} deps={[screen, msgIndex, messages.length]} />

        {screen === "alert" && <AlertScreen />}
        {screen === "clock" && (
          <ClockScreen
            messages={messages}
            onExit={onExit}
            onMessages={() => { setMsgIndex(0); setScreen("messages"); }}
            onSettings={() => setScreen("settings")}
          />
        )}
        {screen === "messages" && (
          <MessageScreen
            messages={messages}
            index={msgIndex}
            onIndexChange={setMsgIndex}
            onBack={() => setScreen("clock")}
            onDelete={handleDelete}
          />
        )}
        {screen === "deleted" && <DeletedScreen />}
        {screen === "settings" && (
          <SettingsScreen
            onBack={() => setScreen("clock")}
            theme={theme}
            onThemeChange={setTheme}
            camera={camera}
            onCameraChange={(c) => setCamera(() => c)}
            pixelSize={pixelSize}
            onPixelSizeChange={(s) => setPixelSize(() => s)}
            perspective={perspective}
            onPerspectiveChange={(v) => setPerspective(() => v)}
          />
        )}
      </LCDScreen>
    </div>
  );
}
