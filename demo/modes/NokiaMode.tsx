import { useState, useEffect, useCallback } from "react";
import {
  LCDScreen,
  LCDText,
  BitmapFont,
  useLCD,
  useFocus,
  type ThemePresetName,
} from "../../src";

const font = new BitmapFont("3x5");

const W = 84;
const H = 48;
const STATUS_H = 8;
const SOFTKEY_H = 8;
const CONTENT_Y = STATUS_H;
const CONTENT_H = H - STATUS_H - SOFTKEY_H;

const CAMERAS: string[] = ["straight", "isometric", "desk", "handheld"];

type Screen =
  | "idle"
  | "menu"
  | "messages"
  | "inbox"
  | "messageView"
  | "callLog"
  | "callLogList"
  | "profiles"
  | "settings"
  | "games"
  | "calculator"
  | "clock"
  | "names"
  | "contactView";

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

/* ── Status Bar ──────────────────────────────────────────── */

function StatusBar() {
  const { engine, offsetX, offsetY } = useLCD();
  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;
    // clear status area
    fb.fillRect(ox, oy, W, STATUS_H, 0);

    // Signal bars (5 bars, 4 filled)
    const signalX = ox + 1;
    const barW = 2;
    const gap = 1;
    for (let i = 0; i < 5; i++) {
      const barH = 2 + i;
      const bx = signalX + i * (barW + gap);
      const by = oy + STATUS_H - 1 - barH;
      const intensity = i < 4 ? 1 : 0.2;
      for (let dy = 0; dy < barH; dy++) {
        for (let dx = 0; dx < barW; dx++) {
          fb.set(bx + dx, by + dy, intensity);
        }
      }
    }

    // Battery bars (5 bars, 3 filled) - right side
    const battRight = ox + W - 2;
    for (let i = 0; i < 5; i++) {
      const barH = 2 + i;
      const bx = battRight - i * (barW + gap) - barW + 1;
      const by = oy + STATUS_H - 1 - barH;
      const intensity = (4 - i) < 3 ? 1 : 0.2;
      for (let dy = 0; dy < barH; dy++) {
        for (let dx = 0; dx < barW; dx++) {
          fb.set(bx + dx, by + dy, intensity);
        }
      }
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY]);
  return null;
}

/* ── Soft Key Bar ────────────────────────────────────────── */

function SoftKeys({ left, right }: { left: string; right: string }) {
  const { engine, offsetX, offsetY } = useLCD();
  useEffect(() => {
    const fb = engine.fb;
    const y = offsetY + H - SOFTKEY_H;
    fb.fillRect(offsetX, y, W, SOFTKEY_H, 0);
    // divider line
    for (let x = offsetX; x < offsetX + W; x++) {
      fb.set(x, y, 0.4);
    }
    font.drawText(fb, left, offsetX + 1, y + 2, { intensity: 1 });
    const rw = font.measureText(right);
    font.drawText(fb, right, offsetX + W - rw - 1, y + 2, { intensity: 1 });
    engine.markDirty();
  }, [engine, offsetX, offsetY, left, right]);
  return null;
}

/* ── List Navigator (shared by menus) ────────────────────── */

function ListNav({ items, selected, onSelect, onConfirm, focusOrder }: {
  items: string[];
  selected: number;
  onSelect: (i: number) => void;
  onConfirm: (i: number) => void;
  focusOrder: number;
}) {
  const { engine, offsetX, offsetY } = useLCD();
  const maxVisible = Math.floor(CONTENT_H / 7);
  const scrollTop = Math.max(0, Math.min(selected - Math.floor(maxVisible / 2), items.length - maxVisible));

  const onUp = useCallback(() => {
    if (selected > 0) { onSelect(selected - 1); return true; }
    return false;
  }, [selected, onSelect]);

  const onDown = useCallback(() => {
    if (selected < items.length - 1) { onSelect(selected + 1); return true; }
    return false;
  }, [selected, items.length, onSelect]);

  const onActivate = useCallback(() => {
    onConfirm(selected);
  }, [selected, onConfirm]);

  useFocus({
    rect: { x: offsetX, y: offsetY + CONTENT_Y, width: W, height: CONTENT_H },
    order: focusOrder,
    onUp,
    onDown,
    onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, W, CONTENT_H, 0);

    const visible = items.slice(scrollTop, scrollTop + maxVisible);
    visible.forEach((item, i) => {
      const idx = scrollTop + i;
      const y = oy + 1 + i * 7;
      if (idx === selected) {
        font.drawText(fb, ">", ox + 1, y, { intensity: 1 });
      }
      font.drawText(fb, item, ox + 6, y, { intensity: idx === selected ? 1 : 0.6 });
    });

    // scroll indicators
    if (scrollTop > 0) {
      fb.set(ox + W - 3, oy + 1, 0.8);
      fb.set(ox + W - 4, oy + 2, 0.8);
      fb.set(ox + W - 2, oy + 2, 0.8);
    }
    if (scrollTop + maxVisible < items.length) {
      const by = oy + CONTENT_H - 3;
      fb.set(ox + W - 3, by + 1, 0.8);
      fb.set(ox + W - 4, by, 0.8);
      fb.set(ox + W - 2, by, 0.8);
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, items, selected, scrollTop, maxVisible]);

  return null;
}

/* ── Idle Screen ─────────────────────────────────────────── */

function IdleScreen({ onMenu, onNames, onExit }: {
  onMenu: () => void; onNames: () => void; onExit: () => void;
}) {
  const { engine, offsetX, offsetY } = useLCD();

  // Enter = Menu, Escape = first goes to Names... but on idle, Escape = onExit
  // Per spec: Left soft key (Enter) = Menu, Right soft key (Escape) = Names
  // Escape from idle = onExit
  // We'll use onActivate for Enter->Menu, onCancel for Escape->onExit
  // And we need a way to trigger Names... We'll map Right arrow to Names
  const onActivate = useCallback(() => { onMenu(); }, [onMenu]);
  const onRight = useCallback(() => { onNames(); }, [onNames]);

  useCancel(onExit);

  useFocus({
    rect: { x: offsetX, y: offsetY + CONTENT_Y, width: W, height: CONTENT_H },
    order: 10,
    onActivate,
    onRight,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, W, CONTENT_H, 0);
    const text = "NOKIA";
    const tw = font.measureText(text);
    font.drawText(fb, text, ox + Math.floor((W - tw) / 2), oy + Math.floor((CONTENT_H - 5) / 2), { intensity: 1 });
    engine.markDirty();
  }, [engine, offsetX, offsetY]);

  return (
    <>
      <StatusBar />
      <SoftKeys left="Menu" right="Names" />
    </>
  );
}

/* ── Menu Screen ─────────────────────────────────────────── */

const MENU_ITEMS = [
  "1.Messages",
  "2.Call log",
  "3.Profiles",
  "4.Settings",
  "5.Games",
  "6.Calculator",
  "7.Clock",
];

const MENU_SCREENS: Screen[] = [
  "messages", "callLog", "profiles", "settings", "games", "calculator", "clock",
];

function MenuScreen({ onNavigate, onBack }: {
  onNavigate: (s: Screen) => void; onBack: () => void;
}) {
  const [selected, setSelected] = useState(0);
  useCancel(onBack);

  const handleConfirm = useCallback((i: number) => {
    onNavigate(MENU_SCREENS[i]);
  }, [onNavigate]);

  return (
    <>
      <StatusBar />
      <ListNav
        items={MENU_ITEMS}
        selected={selected}
        onSelect={setSelected}
        onConfirm={handleConfirm}
        focusOrder={10}
      />
      <SoftKeys left="Select" right="Back" />
    </>
  );
}

/* ── Messages ────────────────────────────────────────────── */

const MSG_MENU = ["Inbox", "Write message", "Outbox"];

function MessagesScreen({ onNavigate, onBack }: {
  onNavigate: (s: Screen) => void; onBack: () => void;
}) {
  const [selected, setSelected] = useState(0);
  useCancel(onBack);

  const handleConfirm = useCallback((i: number) => {
    if (i === 0) onNavigate("inbox");
    // Write message and Outbox are stubs
  }, [onNavigate]);

  return (
    <>
      <StatusBar />
      <ListNav items={MSG_MENU} selected={selected} onSelect={setSelected} onConfirm={handleConfirm} focusOrder={10} />
      <SoftKeys left="Select" right="Back" />
    </>
  );
}

const INBOX_MSGS = ["1.Hello!", "2.Call me", "3.Where r u?"];
const INBOX_FULL = [
  "Hello! How are\nyou doing today?",
  "Call me when you\nget a chance.",
  "Where r u? We're\nwaiting at cafe.",
];

function InboxScreen({ onViewMsg, onBack }: {
  onViewMsg: (i: number) => void; onBack: () => void;
}) {
  const [selected, setSelected] = useState(0);
  useCancel(onBack);

  const handleConfirm = useCallback((i: number) => {
    onViewMsg(i);
  }, [onViewMsg]);

  return (
    <>
      <StatusBar />
      <ListNav items={INBOX_MSGS} selected={selected} onSelect={setSelected} onConfirm={handleConfirm} focusOrder={10} />
      <SoftKeys left="Open" right="Back" />
    </>
  );
}

function MessageViewScreen({ msgIndex, onBack }: {
  msgIndex: number; onBack: () => void;
}) {
  const { engine, offsetX, offsetY } = useLCD();
  useCancel(onBack);

  useFocus({
    rect: { x: offsetX, y: offsetY + CONTENT_Y, width: W, height: CONTENT_H },
    order: 10,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, W, CONTENT_H, 0);
    const lines = INBOX_FULL[msgIndex].split("\n");
    lines.forEach((line, i) => {
      font.drawText(fb, line, ox + 2, oy + 2 + i * 7, { intensity: 1 });
    });
    engine.markDirty();
  }, [engine, offsetX, offsetY, msgIndex]);

  return (
    <>
      <StatusBar />
      <SoftKeys left="" right="Back" />
    </>
  );
}

/* ── Call Log ────────────────────────────────────────────── */

const CALL_LOG_MENU = ["1.Missed calls", "2.Received calls", "3.Dialled calls"];
const CALL_LISTS: string[][] = [
  ["+358401234", "+442071234"],
  ["+15551234", "+491761234"],
  ["+358501234", "+33142345"],
];

function CallLogScreen({ onNavigate, onBack }: {
  onNavigate: (s: Screen, data?: number) => void; onBack: () => void;
}) {
  const [selected, setSelected] = useState(0);
  useCancel(onBack);

  const handleConfirm = useCallback((i: number) => {
    onNavigate("callLogList", i);
  }, [onNavigate]);

  return (
    <>
      <StatusBar />
      <ListNav items={CALL_LOG_MENU} selected={selected} onSelect={setSelected} onConfirm={handleConfirm} focusOrder={10} />
      <SoftKeys left="Select" right="Back" />
    </>
  );
}

function CallLogListScreen({ listIndex, onBack }: {
  listIndex: number; onBack: () => void;
}) {
  const [selected, setSelected] = useState(0);
  useCancel(onBack);
  const items = CALL_LISTS[listIndex];

  return (
    <>
      <StatusBar />
      <ListNav items={items} selected={selected} onSelect={setSelected} onConfirm={() => {}} focusOrder={10} />
      <SoftKeys left="" right="Back" />
    </>
  );
}

/* ── Profiles ────────────────────────────────────────────── */

const PROFILES = ["General", "Silent", "Meeting", "Outdoor"];

function ProfilesScreen({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState(0);
  const [active, setActive] = useState(0);
  useCancel(onBack);

  const { engine, offsetX, offsetY } = useLCD();
  const maxVisible = Math.floor(CONTENT_H / 7);
  const scrollTop = Math.max(0, Math.min(selected - Math.floor(maxVisible / 2), PROFILES.length - maxVisible));

  const onUp = useCallback(() => {
    if (selected > 0) { setSelected(s => s - 1); return true; }
    return false;
  }, [selected]);

  const onDown = useCallback(() => {
    if (selected < PROFILES.length - 1) { setSelected(s => s + 1); return true; }
    return false;
  }, [selected]);

  const onActivate = useCallback(() => {
    setActive(selected);
  }, [selected]);

  useFocus({
    rect: { x: offsetX, y: offsetY + CONTENT_Y, width: W, height: CONTENT_H },
    order: 10,
    onUp,
    onDown,
    onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, W, CONTENT_H, 0);

    const visible = PROFILES.slice(scrollTop, scrollTop + maxVisible);
    visible.forEach((item, i) => {
      const idx = scrollTop + i;
      const y = oy + 1 + i * 7;
      const marker = idx === active ? "*" : (idx === selected ? ">" : " ");
      font.drawText(fb, marker, ox + 1, y, { intensity: 1 });
      font.drawText(fb, item, ox + 6, y, { intensity: idx === selected ? 1 : 0.6 });
    });
    engine.markDirty();
  }, [engine, offsetX, offsetY, selected, active, scrollTop, maxVisible]);

  return (
    <>
      <StatusBar />
      <SoftKeys left="Select" right="Back" />
    </>
  );
}

/* ── Settings (Prefs) ────────────────────────────────────── */

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
    font.drawText(fb, label, absX + 2, absY + 1, { intensity: 1 });
    const valText = `<${value}>`;
    const valW = font.measureText(valText);
    font.drawText(fb, valText, absX + W - valW - 2, absY + 1, {
      intensity: focused ? 1 : 0.6,
    });
    engine.markDirty();
  }, [engine, absX, absY, label, value, focused]);

  return null;
}

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
  const themes: ThemePresetName[] = ["green", "amber", "gray", "blue"];
  const sizes = ["2", "3", "4", "5", "6", "7", "8"];

  useCancel(onBack);

  return (
    <>
      <StatusBar />
      <OptionRow y={CONTENT_Y + 1} label="Theme" value={theme} options={themes} onChange={(v) => onThemeChange(v as ThemePresetName)} focusOrder={10} />
      <OptionRow y={CONTENT_Y + 8} label="Cam" value={camera} options={CAMERAS} onChange={onCameraChange} focusOrder={20} />
      <OptionRow y={CONTENT_Y + 15} label="Pix" value={String(pixelSize)} options={sizes} onChange={(v) => onPixelSizeChange(Number(v))} focusOrder={30} />
      <OptionRow y={CONTENT_Y + 22} label="Prsp" value={perspective ? "ON" : "OFF"} options={["OFF", "ON"]} onChange={(v) => onPerspectiveChange(v === "ON")} focusOrder={40} />
      <SoftKeys left="Edit" right="Back" />
    </>
  );
}

/* ── Games ────────────────────────────────────────────────── */

function GamesScreen({ onBack }: { onBack: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  useCancel(onBack);

  useFocus({
    rect: { x: offsetX, y: offsetY + CONTENT_Y, width: W, height: CONTENT_H },
    order: 10,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, W, CONTENT_H, 0);
    font.drawText(fb, "Snake", ox + 2, oy + 2, { intensity: 1 });
    font.drawText(fb, "Coming soon", ox + 2, oy + 10, { intensity: 0.6 });
    engine.markDirty();
  }, [engine, offsetX, offsetY]);

  return (
    <>
      <StatusBar />
      <SoftKeys left="" right="Back" />
    </>
  );
}

/* ── Calculator ──────────────────────────────────────────── */

const CALC_KEYS = [
  ["7", "8", "9", "+"],
  ["4", "5", "6", "-"],
  ["1", "2", "3", "x"],
  ["C", "0", ".", "="],
];

function CalculatorScreen({ onBack }: { onBack: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  const [display, setDisplay] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);
  const [row, setRow] = useState(0);
  const [col, setCol] = useState(0);

  useCancel(onBack);

  const pressKey = useCallback((key: string) => {
    if (key >= "0" && key <= "9" || key === ".") {
      setDisplay(d => fresh ? key : d + key);
      setFresh(false);
    } else if (key === "C") {
      setDisplay("0"); setAcc(null); setOp(null); setFresh(true);
    } else if (key === "=") {
      if (acc !== null && op !== null) {
        const cur = parseFloat(display);
        let result = acc;
        if (op === "+") result = acc + cur;
        else if (op === "-") result = acc - cur;
        else if (op === "x") result = acc * cur;
        setDisplay(String(result));
        setAcc(null); setOp(null); setFresh(true);
      }
    } else {
      // operator
      const cur = parseFloat(display);
      if (acc !== null && op !== null && !fresh) {
        let result = acc;
        if (op === "+") result = acc + cur;
        else if (op === "-") result = acc - cur;
        else if (op === "x") result = acc * cur;
        setAcc(result);
        setDisplay(String(result));
      } else {
        setAcc(cur);
      }
      setOp(key);
      setFresh(true);
    }
  }, [display, acc, op, fresh]);

  const onUp = useCallback(() => {
    if (row > 0) { setRow(r => r - 1); return true; }
    return false;
  }, [row]);
  const onDown = useCallback(() => {
    if (row < 3) { setRow(r => r + 1); return true; }
    return false;
  }, [row]);
  const onLeft = useCallback(() => {
    if (col > 0) setCol(c => c - 1);
  }, [col]);
  const onRight = useCallback(() => {
    if (col < 3) setCol(c => c + 1);
  }, [col]);
  const onActivate = useCallback(() => {
    pressKey(CALC_KEYS[row][col]);
  }, [pressKey, row, col]);

  useFocus({
    rect: { x: offsetX, y: offsetY + CONTENT_Y, width: W, height: CONTENT_H },
    order: 10,
    onUp, onDown, onLeft, onRight, onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, W, CONTENT_H, 0);

    // Display - right aligned, top area
    const dispText = display.length > 12 ? display.slice(-12) : display;
    const dw = font.measureText(dispText);
    font.drawText(fb, dispText, ox + W - dw - 2, oy + 1, { intensity: 1 });

    // Grid starts at oy + 10
    const gridY = oy + 10;
    const cellW = Math.floor((W - 4) / 4);
    const cellH = 6;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cx = ox + 2 + c * cellW;
        const cy = gridY + r * cellH;
        const key = CALC_KEYS[r][c];
        const selected = r === row && c === col;
        if (selected) {
          // invert: fill rect, draw dark text... just use brackets
          font.drawText(fb, `[${key}]`, cx, cy, { intensity: 1 });
        } else {
          font.drawText(fb, ` ${key} `, cx, cy, { intensity: 0.7 });
        }
      }
    }
    engine.markDirty();
  }, [engine, offsetX, offsetY, display, row, col]);

  return (
    <>
      <StatusBar />
      <SoftKeys left="OK" right="Back" />
    </>
  );
}

/* ── Clock ───────────────────────────────────────────────── */

function ClockScreen({ onBack }: { onBack: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

  useCancel(onBack);

  useFocus({
    rect: { x: offsetX, y: offsetY + CONTENT_Y, width: W, height: CONTENT_H },
    order: 10,
  });

  useEffect(() => {
    const tick = setInterval(() => {
      const d = new Date();
      setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, W, CONTENT_H, 0);
    const tw = font.measureText(time);
    font.drawText(fb, time, ox + Math.floor((W - tw) / 2), oy + Math.floor((CONTENT_H - 5) / 2), { intensity: 1 });
    engine.markDirty();
  }, [engine, offsetX, offsetY, time]);

  return (
    <>
      <StatusBar />
      <SoftKeys left="" right="Back" />
    </>
  );
}

/* ── Names (Phonebook) ───────────────────────────────────── */

const CONTACTS = [
  { name: "Ada", phone: "+441234567" },
  { name: "Alan", phone: "+442345678" },
  { name: "Bob", phone: "+15551234" },
  { name: "Claude", phone: "+33142345" },
  { name: "Grace", phone: "+12025551" },
];

function NamesScreen({ onViewContact, onBack }: {
  onViewContact: (i: number) => void; onBack: () => void;
}) {
  const [selected, setSelected] = useState(0);
  useCancel(onBack);

  const handleConfirm = useCallback((i: number) => {
    onViewContact(i);
  }, [onViewContact]);

  return (
    <>
      <StatusBar />
      <ListNav
        items={CONTACTS.map(c => c.name)}
        selected={selected}
        onSelect={setSelected}
        onConfirm={handleConfirm}
        focusOrder={10}
      />
      <SoftKeys left="Open" right="Back" />
    </>
  );
}

function ContactViewScreen({ contactIndex, onBack }: {
  contactIndex: number; onBack: () => void;
}) {
  const { engine, offsetX, offsetY } = useLCD();
  useCancel(onBack);
  const contact = CONTACTS[contactIndex];

  useFocus({
    rect: { x: offsetX, y: offsetY + CONTENT_Y, width: W, height: CONTENT_H },
    order: 10,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, W, CONTENT_H, 0);
    font.drawText(fb, contact.name, ox + 2, oy + 2, { intensity: 1 });
    font.drawText(fb, contact.phone, ox + 2, oy + 10, { intensity: 0.8 });
    engine.markDirty();
  }, [engine, offsetX, offsetY, contact]);

  return (
    <>
      <StatusBar />
      <SoftKeys left="" right="Back" />
    </>
  );
}

/* ── Main Export ──────────────────────────────────────────── */

export function NokiaMode({ onExit, camera, setCamera, perspective, setPerspective, pixelSize, setPixelSize }: {
  onExit: () => void;
  camera: string;
  setCamera: (fn: (s: string) => string) => void;
  perspective: boolean;
  setPerspective: (fn: (s: boolean) => boolean) => void;
  pixelSize: number;
  setPixelSize: (fn: (s: number) => number) => void;
}) {
  const [screen, setScreen] = useState<Screen>("idle");
  const [theme, setTheme] = useState<ThemePresetName>("green");

  // sub-screen data
  const [callLogIndex, setCallLogIndex] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [contactIndex, setContactIndex] = useState(0);

  const goIdle = useCallback(() => setScreen("idle"), []);
  const goMenu = useCallback(() => setScreen("menu"), []);

  const navigateFromCallLog = useCallback((s: Screen, data?: number) => {
    if (s === "callLogList" && data !== undefined) {
      setCallLogIndex(data);
    }
    setScreen(s);
  }, []);

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
        <ClearRect x={0} y={0} width={W} height={H} deps={[screen, callLogIndex, msgIndex, contactIndex]} />

        {screen === "idle" && (
          <IdleScreen onMenu={goMenu} onNames={() => setScreen("names")} onExit={onExit} />
        )}
        {screen === "menu" && (
          <MenuScreen onNavigate={setScreen} onBack={goIdle} />
        )}
        {screen === "messages" && (
          <MessagesScreen onNavigate={setScreen} onBack={goMenu} />
        )}
        {screen === "inbox" && (
          <InboxScreen onViewMsg={(i) => { setMsgIndex(i); setScreen("messageView"); }} onBack={() => setScreen("messages")} />
        )}
        {screen === "messageView" && (
          <MessageViewScreen msgIndex={msgIndex} onBack={() => setScreen("inbox")} />
        )}
        {screen === "callLog" && (
          <CallLogScreen onNavigate={navigateFromCallLog} onBack={goMenu} />
        )}
        {screen === "callLogList" && (
          <CallLogListScreen listIndex={callLogIndex} onBack={() => setScreen("callLog")} />
        )}
        {screen === "profiles" && (
          <ProfilesScreen onBack={goMenu} />
        )}
        {screen === "settings" && (
          <SettingsScreen
            onBack={goMenu}
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
        {screen === "games" && (
          <GamesScreen onBack={goMenu} />
        )}
        {screen === "calculator" && (
          <CalculatorScreen onBack={goMenu} />
        )}
        {screen === "clock" && (
          <ClockScreen onBack={goMenu} />
        )}
        {screen === "names" && (
          <NamesScreen onViewContact={(i) => { setContactIndex(i); setScreen("contactView"); }} onBack={goIdle} />
        )}
        {screen === "contactView" && (
          <ContactViewScreen contactIndex={contactIndex} onBack={() => setScreen("names")} />
        )}
      </LCDScreen>
    </div>
  );
}
