import { useState, useEffect, useCallback } from "react";
import {
  LCDScreen,
  BitmapFont,
  useLCD,
  useFocus,
  type ThemePresetName,
} from "../../src";

const font = new BitmapFont("3x5");

const W = 132;
const H = 65;
const STATUS_H = 7;
const CONTENT_Y = STATUS_H + 1;
const CONTENT_H = H - STATUS_H - 1;

const CAMERAS: string[] = ["straight", "isometric", "desk", "handheld"];

type Screen =
  | "home"
  | "messages"
  | "messageView"
  | "compose"
  | "addressBook"
  | "contactView"
  | "calendar"
  | "tasks"
  | "memoPad"
  | "memoView"
  | "calculator"
  | "options";

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
    fb.fillRect(ox, oy, W, STATUS_H + 1, 0);

    // Signal bars (left)
    for (let i = 0; i < 4; i++) {
      const barH = 2 + i;
      const bx = ox + 1 + i * 3;
      const by = oy + STATUS_H - 1 - barH;
      for (let dy = 0; dy < barH; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          fb.set(bx + dx, by + dy, i < 3 ? 1 : 0.2);
        }
      }
    }

    // Date/time center - BlackBerry style "Sat Apr 4 10:40a"
    const now = new Date();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const hrs = now.getHours();
    const mins = String(now.getMinutes()).padStart(2, "0");
    const ampm = hrs >= 12 ? "p" : "a";
    const h12 = hrs % 12 || 12;
    const timeStr = `${days[now.getDay()]} ${months[now.getMonth()]} ${now.getDate()} ${h12}:${mins}${ampm}`;
    const tw = font.measureText(timeStr);
    font.drawText(fb, timeStr, ox + Math.floor((W - tw) / 2), oy + 1, { intensity: 1 });

    // Battery bars (right)
    const battRight = ox + W - 2;
    for (let i = 0; i < 4; i++) {
      const barH = 2 + i;
      const bx = battRight - i * 3 - 1;
      const by = oy + STATUS_H - 1 - barH;
      for (let dy = 0; dy < barH; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          fb.set(bx + dx, by + dy, i < 3 ? 1 : 0.2);
        }
      }
    }

    // Divider line
    for (let x = ox; x < ox + W; x++) {
      fb.set(x, oy + STATUS_H, 0.4);
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY]);
  return null;
}

/* ── BB List Navigator (inverted selection, no soft keys) ── */

function BBList({ items, selected, onSelect, onConfirm, focusOrder, lineH = 7, marker = true }: {
  items: string[];
  selected: number;
  onSelect: (i: number) => void;
  onConfirm: (i: number) => void;
  focusOrder: number;
  lineH?: number;
  marker?: boolean;
}) {
  const { engine, offsetX, offsetY } = useLCD();
  const maxVisible = Math.floor(CONTENT_H / lineH);
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
      const y = oy + 1 + i * lineH;
      const textX = ox + (marker ? 6 : 2);

      if (idx === selected) {
        // Inverted selection: filled background
        fb.fillRect(ox, y - 1, W, lineH, 1);
        if (marker) font.drawText(fb, ">", ox + 1, y, { intensity: 0 });
        font.drawText(fb, item, textX, y, { intensity: 0 });
      } else {
        if (marker) font.drawText(fb, "*", ox + 1, y, { intensity: 0.5 });
        font.drawText(fb, item, textX, y, { intensity: 0.8 });
      }
    });

    // Scroll indicators
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
  }, [engine, offsetX, offsetY, items, selected, scrollTop, maxVisible, lineH, marker]);

  return null;
}

/* ── Home Screen ─────────────────────────────────────────── */

const HOME_ITEMS = [
  "Messages",
  "Compose",
  "Address Book",
  "Calendar",
  "Tasks",
  "MemoPad",
  "Calculator",
  "Options",
];

const HOME_SCREENS: Screen[] = [
  "messages", "compose", "addressBook", "calendar", "tasks", "memoPad", "calculator", "options",
];

function HomeScreen({ onNavigate, onExit }: {
  onNavigate: (s: Screen) => void; onExit: () => void;
}) {
  const [selected, setSelected] = useState(0);
  useCancel(onExit);

  const handleConfirm = useCallback((i: number) => {
    onNavigate(HOME_SCREENS[i]);
  }, [onNavigate]);

  return (
    <>
      <StatusBar />
      <BBList
        items={HOME_ITEMS}
        selected={selected}
        onSelect={setSelected}
        onConfirm={handleConfirm}
        focusOrder={10}
      />
    </>
  );
}

/* ── Messages (Inbox) ────────────────────────────────────── */

const MESSAGES = [
  { from: "J.Smith", subject: "Meeting tomorrow" },
  { from: "A.Turing", subject: "Code review notes" },
  { from: "G.Hopper", subject: "Bug fix deployed" },
  { from: "L.Torvalds", subject: "Kernel patch v2" },
  { from: "M.Hamilton", subject: "Launch checklist" },
  { from: "D.Knuth", subject: "Vol 4 draft" },
];

const MESSAGE_BODIES = [
  "Hi, can we move the\nmeeting to 2pm? The\nconf room is booked\nat 10.",
  "Looked at the PR.\nA few comments on\nthe error handling.\nOtherwise LGTM.",
  "Deployed the fix for\nticket #4521. Please\nverify on staging.",
  "Updated patch set\nattached. Fixed the\nrace condition in\nthe scheduler.",
  "Final checklist for\nSaturday launch is\nready. Please review\nby EOD Friday.",
  "Attached early draft\nof chapter 7.2.1.\nFeedback welcome.",
];

function MessagesScreen({ onView, onBack }: {
  onView: (i: number) => void; onBack: () => void;
}) {
  const [selected, setSelected] = useState(0);
  useCancel(onBack);

  const items = MESSAGES.map(m => `${m.from}: ${m.subject}`);

  const handleConfirm = useCallback((i: number) => {
    onView(i);
  }, [onView]);

  return (
    <>
      <StatusBar />
      <BBList
        items={items}
        selected={selected}
        onSelect={setSelected}
        onConfirm={handleConfirm}
        focusOrder={10}
        marker={false}
      />
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

    const msg = MESSAGES[msgIndex];
    font.drawText(fb, `From: ${msg.from}`, ox + 2, oy + 1, { intensity: 1 });
    font.drawText(fb, `Subj: ${msg.subject}`, ox + 2, oy + 8, { intensity: 1 });
    // divider
    for (let x = ox + 2; x < ox + W - 2; x++) fb.set(x, oy + 14, 0.3);

    const lines = MESSAGE_BODIES[msgIndex].split("\n");
    lines.forEach((line, i) => {
      font.drawText(fb, line, ox + 2, oy + 16 + i * 7, { intensity: 0.9 });
    });
    engine.markDirty();
  }, [engine, offsetX, offsetY, msgIndex]);

  return <StatusBar />;
}

/* ── Compose ─────────────────────────────────────────────── */

function ComposeScreen({ onBack }: { onBack: () => void }) {
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

    font.drawText(fb, "To:", ox + 2, oy + 1, { intensity: 1 });
    // underline field
    for (let x = ox + 14; x < ox + W - 4; x++) fb.set(x, oy + 6, 0.3);

    font.drawText(fb, "Subject:", ox + 2, oy + 9, { intensity: 1 });
    for (let x = ox + 34; x < ox + W - 4; x++) fb.set(x, oy + 14, 0.3);

    // divider
    for (let x = ox + 2; x < ox + W - 2; x++) fb.set(x, oy + 17, 0.3);

    font.drawText(fb, "Type message here...", ox + 2, oy + 20, { intensity: 0.5 });

    // Blinking cursor (static representation)
    const cursorX = ox + 2;
    const cursorY = oy + 27;
    for (let dy = 0; dy < 5; dy++) fb.set(cursorX, cursorY + dy, 0.8);

    engine.markDirty();
  }, [engine, offsetX, offsetY]);

  return <StatusBar />;
}

/* ── Address Book ────────────────────────────────────────── */

const CONTACTS = [
  { name: "Berners-Lee, Tim", phone: "555-0501" },
  { name: "Hopper, Grace", phone: "555-0701" },
  { name: "Knuth, Donald", phone: "555-0302" },
  { name: "Lovelace, Ada", phone: "555-0101" },
  { name: "Torvalds, Linus", phone: "555-0401" },
  { name: "Turing, Alan", phone: "555-0201" },
];

function AddressBookScreen({ onView, onBack }: {
  onView: (i: number) => void; onBack: () => void;
}) {
  const [selected, setSelected] = useState(0);
  useCancel(onBack);

  const items = CONTACTS.map(c => `${c.name}  ${c.phone}`);

  return (
    <>
      <StatusBar />
      <BBList
        items={items}
        selected={selected}
        onSelect={setSelected}
        onConfirm={onView}
        focusOrder={10}
        marker={false}
      />
    </>
  );
}

function ContactViewScreen({ contactIndex, onBack }: {
  contactIndex: number; onBack: () => void;
}) {
  const { engine, offsetX, offsetY } = useLCD();
  useCancel(onBack);
  const c = CONTACTS[contactIndex];

  useFocus({
    rect: { x: offsetX, y: offsetY + CONTENT_Y, width: W, height: CONTENT_H },
    order: 10,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, W, CONTENT_H, 0);

    font.drawText(fb, c.name, ox + 2, oy + 2, { intensity: 1 });
    for (let x = ox + 2; x < ox + W - 2; x++) fb.set(x, oy + 9, 0.3);
    font.drawText(fb, `Phone: ${c.phone}`, ox + 2, oy + 12, { intensity: 0.9 });
    font.drawText(fb, "Email:", ox + 2, oy + 20, { intensity: 0.9 });
    const email = c.name.split(", ")[1].toLowerCase() + "@rim.com";
    font.drawText(fb, email, ox + 2, oy + 28, { intensity: 0.7 });

    engine.markDirty();
  }, [engine, offsetX, offsetY, c]);

  return <StatusBar />;
}

/* ── Calendar ────────────────────────────────────────────── */

function CalendarScreen({ onBack }: { onBack: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  const [selected, setSelected] = useState(1);
  useCancel(onBack);

  const slots = [
    " 8am",
    " 9am  Team standup",
    "10am",
    "11am  Code review",
    "12pm  Lunch",
    " 1pm",
    " 2pm  1:1 w/ mgr",
    " 3pm",
    " 4pm  Deploy window",
    " 5pm",
  ];

  return (
    <>
      <StatusBar />
      <BBList
        items={slots}
        selected={selected}
        onSelect={setSelected}
        onConfirm={() => {}}
        focusOrder={10}
        lineH={7}
        marker={false}
      />
    </>
  );
}

/* ── Tasks ───────────────────────────────────────────────── */

const INITIAL_TASKS = [
  { text: "Review reports", done: false },
  { text: "Send email to team", done: true },
  { text: "Update roadmap", done: false },
  { text: "Fix login bug", done: true },
  { text: "Prepare slides", done: false },
  { text: "Order new phones", done: false },
];

function TasksScreen({ onBack }: { onBack: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [selected, setSelected] = useState(0);
  useCancel(onBack);

  const maxVisible = Math.floor(CONTENT_H / 7);
  const scrollTop = Math.max(0, Math.min(selected - Math.floor(maxVisible / 2), tasks.length - maxVisible));

  const onUp = useCallback(() => {
    if (selected > 0) { setSelected(s => s - 1); return true; }
    return false;
  }, [selected]);

  const onDown = useCallback(() => {
    if (selected < tasks.length - 1) { setSelected(s => s + 1); return true; }
    return false;
  }, [selected, tasks.length]);

  const onActivate = useCallback(() => {
    setTasks(ts => ts.map((t, i) => i === selected ? { ...t, done: !t.done } : t));
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

    const visible = tasks.slice(scrollTop, scrollTop + maxVisible);
    visible.forEach((task, i) => {
      const idx = scrollTop + i;
      const y = oy + 1 + i * 7;
      const check = task.done ? "[x]" : "[ ]";
      const line = `${check} ${task.text}`;

      if (idx === selected) {
        fb.fillRect(ox, y - 1, W, 7, 1);
        font.drawText(fb, line, ox + 2, y, { intensity: 0 });
      } else {
        font.drawText(fb, line, ox + 2, y, { intensity: 0.8 });
      }
    });
    engine.markDirty();
  }, [engine, offsetX, offsetY, tasks, selected, scrollTop, maxVisible]);

  return <StatusBar />;
}

/* ── MemoPad ─────────────────────────────────────────────── */

const MEMOS = [
  { title: "Project ideas", body: "1. LCD pixel engine\n2. Retro device sim\n3. Bitmap font tool\n4. Pixel art editor" },
  { title: "Meeting notes", body: "Discussed Q2 goals.\nNeed to finalize\nbudget by Friday.\nAction: send recap." },
  { title: "Shopping list", body: "- Coffee beans\n- USB cables\n- Notebook\n- Pens" },
  { title: "Passwords", body: "WiFi: guest1234\nServer: admin\nVPN: see IT dept" },
];

function MemoPadScreen({ onView, onBack }: {
  onView: (i: number) => void; onBack: () => void;
}) {
  const [selected, setSelected] = useState(0);
  useCancel(onBack);

  return (
    <>
      <StatusBar />
      <BBList
        items={MEMOS.map(m => m.title)}
        selected={selected}
        onSelect={setSelected}
        onConfirm={onView}
        focusOrder={10}
      />
    </>
  );
}

function MemoViewScreen({ memoIndex, onBack }: {
  memoIndex: number; onBack: () => void;
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

    const memo = MEMOS[memoIndex];
    font.drawText(fb, memo.title, ox + 2, oy + 1, { intensity: 1 });
    for (let x = ox + 2; x < ox + W - 2; x++) fb.set(x, oy + 7, 0.3);

    const lines = memo.body.split("\n");
    lines.forEach((line, i) => {
      font.drawText(fb, line, ox + 2, oy + 9 + i * 7, { intensity: 0.9 });
    });
    engine.markDirty();
  }, [engine, offsetX, offsetY, memoIndex]);

  return <StatusBar />;
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
    if ((key >= "0" && key <= "9") || key === ".") {
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

    // Display area with border
    fb.fillRect(ox + 2, oy + 1, W - 4, 9, 0);
    for (let x = ox + 2; x < ox + W - 2; x++) {
      fb.set(x, oy + 1, 0.3);
      fb.set(x, oy + 9, 0.3);
    }
    for (let y = oy + 1; y <= oy + 9; y++) {
      fb.set(ox + 2, y, 0.3);
      fb.set(ox + W - 3, y, 0.3);
    }
    const dispText = display.length > 20 ? display.slice(-20) : display;
    const dw = font.measureText(dispText);
    font.drawText(fb, dispText, ox + W - dw - 5, oy + 3, { intensity: 1 });

    // Key grid
    const gridY = oy + 12;
    const cellW = Math.floor((W - 8) / 4);
    const cellH = 10;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cx = ox + 4 + c * cellW;
        const cy = gridY + r * cellH;
        const key = CALC_KEYS[r][c];
        const isSel = r === row && c === col;
        if (isSel) {
          fb.fillRect(cx, cy, cellW - 2, cellH - 2, 1);
          const kw = font.measureText(key);
          font.drawText(fb, key, cx + Math.floor((cellW - 2 - kw) / 2), cy + 2, { intensity: 0 });
        } else {
          const kw = font.measureText(key);
          font.drawText(fb, key, cx + Math.floor((cellW - 2 - kw) / 2), cy + 2, { intensity: 0.7 });
        }
      }
    }
    engine.markDirty();
  }, [engine, offsetX, offsetY, display, row, col]);

  return <StatusBar />;
}

/* ── Options (Settings) ──────────────────────────────────── */

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
    if (focused) {
      fb.fillRect(absX, absY, W, 8, 1);
      font.drawText(fb, label, absX + 2, absY + 1, { intensity: 0 });
      const valText = `< ${value} >`;
      const valW = font.measureText(valText);
      font.drawText(fb, valText, absX + W - valW - 2, absY + 1, { intensity: 0 });
    } else {
      font.drawText(fb, label, absX + 2, absY + 1, { intensity: 1 });
      const valText = `< ${value} >`;
      const valW = font.measureText(valText);
      font.drawText(fb, valText, absX + W - valW - 2, absY + 1, { intensity: 0.6 });
    }
    engine.markDirty();
  }, [engine, absX, absY, label, value, focused]);

  return null;
}

function OptionsScreen({ onBack, theme, onThemeChange, camera, onCameraChange, pixelSize, onPixelSizeChange, perspective, onPerspectiveChange }: {
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
      <OptionRow y={CONTENT_Y + 9} label="Camera" value={camera} options={CAMERAS} onChange={onCameraChange} focusOrder={20} />
      <OptionRow y={CONTENT_Y + 17} label="Pixels" value={String(pixelSize)} options={sizes} onChange={(v) => onPixelSizeChange(Number(v))} focusOrder={30} />
      <OptionRow y={CONTENT_Y + 25} label="Persp" value={perspective ? "ON" : "OFF"} options={["OFF", "ON"]} onChange={(v) => onPerspectiveChange(v === "ON")} focusOrder={40} />
    </>
  );
}

/* ── Main Export ──────────────────────────────────────────── */

export function BlackBerryMode({ onExit, pixelSize, setPixelSize, camera, setCamera, perspective, setPerspective }: {
  onExit: () => void;
  pixelSize: number;
  setPixelSize: (fn: (s: number) => number) => void;
  camera: string;
  setCamera: (fn: (s: string) => string) => void;
  perspective: boolean;
  setPerspective: (fn: (s: boolean) => boolean) => void;
}) {
  const [screen, setScreen] = useState<Screen>("home");
  const [theme, setTheme] = useState<ThemePresetName>("green");

  const [msgIndex, setMsgIndex] = useState(0);
  const [contactIndex, setContactIndex] = useState(0);
  const [memoIndex, setMemoIndex] = useState(0);

  const goHome = useCallback(() => setScreen("home"), []);

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
        <ClearRect x={0} y={0} width={W} height={H} deps={[screen, msgIndex, contactIndex, memoIndex]} />

        {screen === "home" && (
          <HomeScreen onNavigate={setScreen} onExit={onExit} />
        )}
        {screen === "messages" && (
          <MessagesScreen onView={(i) => { setMsgIndex(i); setScreen("messageView"); }} onBack={goHome} />
        )}
        {screen === "messageView" && (
          <MessageViewScreen msgIndex={msgIndex} onBack={() => setScreen("messages")} />
        )}
        {screen === "compose" && (
          <ComposeScreen onBack={goHome} />
        )}
        {screen === "addressBook" && (
          <AddressBookScreen onView={(i) => { setContactIndex(i); setScreen("contactView"); }} onBack={goHome} />
        )}
        {screen === "contactView" && (
          <ContactViewScreen contactIndex={contactIndex} onBack={() => setScreen("addressBook")} />
        )}
        {screen === "calendar" && (
          <CalendarScreen onBack={goHome} />
        )}
        {screen === "tasks" && (
          <TasksScreen onBack={goHome} />
        )}
        {screen === "memoPad" && (
          <MemoPadScreen onView={(i) => { setMemoIndex(i); setScreen("memoView"); }} onBack={goHome} />
        )}
        {screen === "memoView" && (
          <MemoViewScreen memoIndex={memoIndex} onBack={() => setScreen("memoPad")} />
        )}
        {screen === "calculator" && (
          <CalculatorScreen onBack={goHome} />
        )}
        {screen === "options" && (
          <OptionsScreen
            onBack={goHome}
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
