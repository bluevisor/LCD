import { useState, useEffect, useCallback } from "react";
import {
  LCDScreen,
  LCDIcon,
  BitmapFont,
  useLCD,
  useFocus,
  type ThemePresetName,
} from "../../src";

const font = new BitmapFont();

const W = 160;
const H = 160;
const STATUS_H = 12;
const CONTENT_Y = STATUS_H + 1;
const CONTENT_H = H - STATUS_H - 1;

const CAMERAS: string[] = ["straight", "isometric", "desk", "handheld"];
const THEMES = ["green", "amber", "gray", "blue", "palm"];
const PIXEL_SIZES = [2, 3, 4, 5, 6, 7, 8];

type Screen = "home" | "datebook" | "address" | "todo" | "memo" | "calc" | "prefs";

// --- Helpers ---

function useCancel(onBack: () => void) {
  const { engine } = useLCD();
  useEffect(() => {
    engine.focus.onCancel(onBack);
    return () => engine.focus.offCancel(onBack);
  }, [engine, onBack]);
}

function formatPalmDate(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const yr = String(d.getFullYear()).slice(-2);
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${yr}`;
}

function formatPalmTime(): string {
  const now = new Date();
  let h = now.getHours();
  const m = now.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${m < 10 ? "0" : ""}${m} ${ampm}`;
}

// --- Status Bar (bordered frame, PalmOS style) ---

function StatusBar({ title }: { title: string }) {
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    // Clear status area
    fb.fillRect(ox, oy, W, STATUS_H, 0);

    // 1px bordered rectangle around entire status bar
    for (let x = 0; x < W; x++) {
      fb.set(ox + x, oy, 1);
      fb.set(ox + x, oy + STATUS_H - 1, 1);
    }
    for (let y = 0; y < STATUS_H; y++) {
      fb.set(ox, oy + y, 1);
      fb.set(ox + W - 1, oy + y, 1);
    }

    // Time on left
    const timeStr = formatPalmTime();
    font.drawText(fb, timeStr, ox + 3, oy + 3, { intensity: 1 });

    // Battery icon: 3 filled segments + 1 hollow segment
    const batX = ox + 55;
    const batY = oy + 4;
    for (let i = 0; i < 3; i++) {
      fb.fillRect(batX + i * 4, batY, 3, 4, 1);
    }
    // Hollow segment
    for (let bx = 0; bx < 3; bx++) {
      fb.set(batX + 12 + bx, batY, 1);
      fb.set(batX + 12 + bx, batY + 3, 1);
    }
    fb.set(batX + 12, batY + 1, 1);
    fb.set(batX + 14, batY + 1, 1);
    fb.set(batX + 12, batY + 2, 1);
    fb.set(batX + 14, batY + 2, 1);

    // Category/title on right with dropdown triangle
    const catText = title;
    const catW = font.measureText(catText);
    font.drawText(fb, catText, ox + W - catW - 12, oy + 3, { intensity: 1 });

    // Small triangle (inverted V)
    const triX = ox + W - 8;
    const triY = oy + 4;
    fb.set(triX, triY, 1);
    fb.set(triX + 1, triY, 1);
    fb.set(triX + 2, triY, 1);
    fb.set(triX + 3, triY, 1);
    fb.set(triX + 4, triY, 1);
    fb.set(triX + 1, triY + 1, 1);
    fb.set(triX + 2, triY + 1, 1);
    fb.set(triX + 3, triY + 1, 1);
    fb.set(triX + 2, triY + 2, 1);

    // Thin divider line below status bar
    for (let x = 0; x < W; x++) {
      fb.set(ox + x, oy + STATUS_H, 1);
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, title]);

  return null;
}

// --- Home Screen (App Launcher) ---

interface AppItem {
  name: string;
  icon: string;
  screen: Screen;
}

const APPS: AppItem[] = [
  { name: "Address", icon: "person", screen: "address" },
  { name: "Calc", icon: "calculator", screen: "calc" },
  { name: "Date Book", icon: "calendar", screen: "datebook" },
  { name: "Memo Pad", icon: "memo", screen: "memo" },
  { name: "Prefs", icon: "prefs", screen: "prefs" },
  { name: "To Do", icon: "todo", screen: "todo" },
];

const GRID_COLS = 3;
const ICON_SCALE = 2;
const ICON_PX = 8 * ICON_SCALE; // 16px at scale 2
const CELL_W = Math.floor(W / GRID_COLS); // ~53px
const CELL_H = 36; // Icon + label + spacing (authentic Palm row height)
const GRID_START_X = Math.floor((W - GRID_COLS * CELL_W) / 2);
const GRID_START_Y = CONTENT_Y + 4;

function HomeScreen({ onNavigate, onExit }: {
  onNavigate: (s: Screen) => void;
  onExit: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  useCancel(onExit);

  const rows = Math.ceil(APPS.length / GRID_COLS);

  const onUp = useCallback(() => {
    setSelected(s => {
      if (Math.floor(s / GRID_COLS) <= 0) return s;
      return s - GRID_COLS;
    });
    return true;
  }, []);

  const onDown = useCallback(() => {
    setSelected(s => {
      const next = s + GRID_COLS;
      if (next >= APPS.length) return s;
      return next;
    });
    return true;
  }, []);

  const onLeft = useCallback(() => {
    setSelected(s => (s > 0 ? s - 1 : s));
    return true;
  }, []);

  const onRight = useCallback(() => {
    setSelected(s => (s < APPS.length - 1 ? s + 1 : s));
    return true;
  }, []);

  const onActivate = useCallback(() => {
    onNavigate(APPS[selected].screen);
  }, [selected, onNavigate]);

  useFocus({
    rect: { x: offsetX, y: GRID_START_Y + offsetY, width: W, height: rows * CELL_H },
    order: 10,
    onUp, onDown, onLeft, onRight, onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    // Clear content area
    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    APPS.forEach((app, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const cx = GRID_START_X + col * CELL_W + Math.floor(CELL_W / 2);
      const cy = GRID_START_Y + row * CELL_H;
      const isSel = i === selected;

      // Inverted selection: black rect behind icon + label
      if (isSel) {
        const selX = cx - Math.floor(ICON_PX / 2) - 2;
        const selY = cy - 1;
        const selW = ICON_PX + 4;
        const selH = ICON_PX + 14;
        fb.fillRect(ox + selX, oy + selY, selW, selH, 1);
      }

      // Label centered below icon
      const labelW = font.measureText(app.name);
      const labelX = cx - Math.floor(labelW / 2);
      font.drawText(fb, app.name, ox + labelX, oy + cy + ICON_PX + 3, {
        intensity: isSel ? 0 : 1,
      });
    });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected]);

  return (
    <>
      <StatusBar title="All" />
      {APPS.map((app, i) => {
        const col = i % GRID_COLS;
        const row = Math.floor(i / GRID_COLS);
        const cx = GRID_START_X + col * CELL_W + Math.floor(CELL_W / 2);
        const cy = GRID_START_Y + row * CELL_H;
        const iconX = cx - Math.floor(ICON_PX / 2);
        return (
          <LCDIcon
            key={app.icon}
            x={iconX}
            y={cy}
            name={app.icon}
            scale={ICON_SCALE}
            intensity={i === selected ? 0 : 1}
          />
        );
      })}
    </>
  );
}

// --- Date Book Screen (day view) ---

const TIME_SLOTS = ["8:00", "9:00", "10:00", "11:00", "12:00", "1:00", "2:00", "3:00", "4:00", "5:00"];
const APPOINTMENTS: Record<number, string> = {
  0: "Team standup",
  2: "Design review",
  4: "Lunch with Ada",
  6: "Code review",
};

function DateBookScreen({ onHome }: { onHome: () => void }) {
  const [selected, setSelected] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  useCancel(onHome);

  const ROW_H = 12;
  const HEADER_H = 20; // Title + date + divider
  const visibleCount = Math.floor((CONTENT_H - HEADER_H) / ROW_H);
  const maxScroll = Math.max(0, TIME_SLOTS.length - visibleCount);

  const onUp = useCallback(() => {
    setSelected(s => {
      const next = Math.max(0, s - 1);
      setScrollY(sc => Math.min(sc, next));
      return next;
    });
    return true;
  }, []);

  const onDown = useCallback(() => {
    setSelected(s => {
      const next = Math.min(TIME_SLOTS.length - 1, s + 1);
      setScrollY(sc => {
        const minSc = next - visibleCount + 1;
        return Math.min(maxScroll, Math.max(sc, minSc));
      });
      return next;
    });
    return true;
  }, [visibleCount, maxScroll]);

  useFocus({
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp, onDown,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    // Date header (centered)
    const dateStr = formatPalmDate(new Date());
    const dateW = font.measureText(dateStr);
    const dateX = ox + Math.floor((W - dateW) / 2);
    font.drawText(fb, dateStr, dateX, CONTENT_Y + oy + 2, { intensity: 1 });

    // Thin divider under date
    const divY = CONTENT_Y + oy + 11;
    for (let x = ox; x < ox + W; x++) fb.set(x, divY, 1);

    // "< >" arrows flanking date for day navigation
    font.drawText(fb, "<", ox + 3, CONTENT_Y + oy + 2, { intensity: 1 });
    font.drawText(fb, ">", ox + W - 8, CONTENT_Y + oy + 2, { intensity: 1 });

    // Time slots
    const listY = CONTENT_Y + oy + HEADER_H;
    const visible = TIME_SLOTS.slice(scrollY, scrollY + visibleCount);
    visible.forEach((slot, i) => {
      const idx = scrollY + i;
      const rowY = listY + i * ROW_H;

      if (idx === selected) {
        fb.fillRect(ox, rowY, W, ROW_H, 1);
      }

      const intensity = idx === selected ? 0 : 1;

      // Time label
      font.drawText(fb, slot, ox + 2, rowY + 2, { intensity });

      // Thin vertical divider after time column
      const divX = ox + 30;
      if (idx !== selected) {
        for (let dy = 0; dy < ROW_H; dy++) fb.set(divX, rowY + dy, 0.4);
      }

      // Appointment text
      const appt = APPOINTMENTS[idx];
      if (appt) {
        font.drawText(fb, appt, ox + 34, rowY + 2, { intensity });
      }

      // Horizontal row divider
      if (idx !== selected) {
        for (let x = ox; x < ox + W; x++) fb.set(x, rowY + ROW_H - 1, 0.3);
      }
    });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected, scrollY, visibleCount, maxScroll]);

  return <StatusBar title="Date Book" />;
}

// --- Address Book Screen ---

interface PalmContact {
  lastName: string;
  firstName: string;
  work: string;
  home: string;
  address: string;
  city: string;
}

const ADDRESS_DATA: PalmContact[] = [
  { lastName: "Hopper", firstName: "Grace", work: "555-0701", home: "555-0702", address: "3 Navy Blvd", city: "Arlington, VA" },
  { lastName: "Kahn", firstName: "Bob", work: "555-0201", home: "555-0202", address: "9 Internet Ave", city: "Reston, VA" },
  { lastName: "Lovelace", firstName: "Ada", work: "555-0101", home: "555-0102", address: "12 Math Lane", city: "London, UK" },
  { lastName: "Ritchie", firstName: "Dennis", work: "555-0401", home: "555-0402", address: "4 Unix Way", city: "Murray Hill, NJ" },
  { lastName: "Shannon", firstName: "Claude", work: "555-0301", home: "555-0302", address: "1 Bit Street", city: "Gaylord, MI" },
  { lastName: "Tesla", firstName: "Nikola", work: "555-1401", home: "555-1402", address: "8 AC Current Pl", city: "New York, NY" },
  { lastName: "Turing", firstName: "Alan", work: "555-0102", home: "555-0103", address: "7 Bletchley Rd", city: "London, UK" },
  { lastName: "von Neumann", firstName: "John", work: "555-1001", home: "555-1002", address: "5 Logic Dr", city: "Princeton, NJ" },
];

const CONTACT_ROW_H = 12;

function AddressScreen({ onHome }: { onHome: () => void }) {
  const [selected, setSelected] = useState(0);
  const [detail, setDetail] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  const visibleCount = Math.floor(CONTENT_H / CONTACT_ROW_H);
  const maxScroll = Math.max(0, ADDRESS_DATA.length - visibleCount);

  const onCancel = useCallback(() => {
    if (detail) setDetail(false);
    else onHome();
  }, [detail, onHome]);

  useCancel(onCancel);

  const onUp = useCallback(() => {
    if (detail) return false;
    setSelected(s => {
      const next = Math.max(0, s - 1);
      setScrollY(sc => Math.min(sc, next));
      return next;
    });
    return true;
  }, [detail]);

  const onDown = useCallback(() => {
    if (detail) return false;
    setSelected(s => {
      const next = Math.min(ADDRESS_DATA.length - 1, s + 1);
      setScrollY(sc => {
        const minSc = next - visibleCount + 1;
        return Math.min(maxScroll, Math.max(sc, minSc));
      });
      return next;
    });
    return true;
  }, [detail, visibleCount, maxScroll]);

  const onActivate = useCallback(() => {
    setDetail(d => !d);
    return true;
  }, []);

  useFocus({
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp, onDown, onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    if (detail) {
      const c = ADDRESS_DATA[selected];
      let cy = CONTENT_Y + oy + 4;
      const cx = ox + 4;

      // Name (bold effect: draw twice offset by 1)
      const fullName = `${c.firstName} ${c.lastName}`;
      font.drawText(fb, fullName, cx, cy, { intensity: 1 });
      font.drawText(fb, fullName, cx + 1, cy, { intensity: 1 });
      const nameW = font.measureText(fullName) + 1;
      for (let x = cx; x < cx + nameW; x++) fb.set(x, cy + 8, 1);
      cy += 16;

      font.drawText(fb, "Work:", cx, cy, { intensity: 1 });
      font.drawText(fb, c.work, cx + 36, cy, { intensity: 1 });
      cy += 12;

      font.drawText(fb, "Home:", cx, cy, { intensity: 1 });
      font.drawText(fb, c.home, cx + 36, cy, { intensity: 1 });
      cy += 12;

      font.drawText(fb, "Addr:", cx, cy, { intensity: 1 });
      font.drawText(fb, c.address, cx + 36, cy, { intensity: 1 });
      cy += 12;

      font.drawText(fb, "City:", cx, cy, { intensity: 1 });
      font.drawText(fb, c.city, cx + 36, cy, { intensity: 1 });
    } else {
      const visible = ADDRESS_DATA.slice(scrollY, scrollY + visibleCount);
      visible.forEach((c, i) => {
        const idx = scrollY + i;
        const rowY = CONTENT_Y + oy + i * CONTACT_ROW_H;

        if (idx === selected) {
          fb.fillRect(ox, rowY, W, CONTACT_ROW_H, 1);
        }

        const intensity = idx === selected ? 0 : 1;
        const displayName = `${c.lastName}, ${c.firstName}`;
        font.drawText(fb, displayName, ox + 4, rowY + 2, { intensity });

        // Thin divider between rows
        if (idx !== selected) {
          for (let x = ox; x < ox + W; x++) fb.set(x, rowY + CONTACT_ROW_H - 1, 0.3);
        }
      });
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected, detail, scrollY, visibleCount, maxScroll]);

  return <StatusBar title="Address" />;
}

// --- To Do List Screen ---

interface TodoItem {
  text: string;
  priority: number;
  checked: boolean;
}

const TODO_INIT: TodoItem[] = [
  { text: "Fix antenna", priority: 1, checked: false },
  { text: "Buy stylus", priority: 2, checked: false },
  { text: "Sync contacts", priority: 2, checked: false },
  { text: "Update firmware", priority: 3, checked: false },
  { text: "Clean screen", priority: 3, checked: false },
  { text: "Read manual", priority: 4, checked: false },
  { text: "Organize apps", priority: 4, checked: false },
  { text: "Back up data", priority: 5, checked: false },
];

const TODO_ROW_H = 12;

function TodoScreen({ onHome }: { onHome: () => void }) {
  const [items, setItems] = useState<TodoItem[]>(TODO_INIT.map(i => ({ ...i })));
  const [selected, setSelected] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  useCancel(onHome);

  const visibleCount = Math.floor(CONTENT_H / TODO_ROW_H);
  const maxScroll = Math.max(0, items.length - visibleCount);

  const onUp = useCallback(() => {
    setSelected(s => {
      const next = Math.max(0, s - 1);
      setScrollY(sc => Math.min(sc, next));
      return next;
    });
    return true;
  }, []);

  const onDown = useCallback(() => {
    setSelected(s => {
      const next = Math.min(items.length - 1, s + 1);
      setScrollY(sc => {
        const minSc = next - visibleCount + 1;
        return Math.min(maxScroll, Math.max(sc, minSc));
      });
      return next;
    });
    return true;
  }, [items.length, visibleCount, maxScroll]);

  const onActivate = useCallback(() => {
    setItems(prev => {
      const next = [...prev];
      next[selected] = { ...next[selected], checked: !next[selected].checked };
      return next;
    });
    return true;
  }, [selected]);

  useFocus({
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp, onDown, onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    const visible = items.slice(scrollY, scrollY + visibleCount);
    visible.forEach((item, i) => {
      const idx = scrollY + i;
      const rowY = CONTENT_Y + oy + i * TODO_ROW_H;

      if (idx === selected) {
        fb.fillRect(ox, rowY, W, TODO_ROW_H, 1);
      }

      const intensity = idx === selected ? 0 : 1;
      const inv = idx === selected; // inverted row

      // Priority number
      font.drawText(fb, String(item.priority), ox + 3, rowY + 2, { intensity });

      // Checkbox (7x7 box)
      const cbX = ox + 12;
      const cbY = rowY + 2;
      for (let bx = 0; bx < 7; bx++) {
        fb.set(cbX + bx, cbY, inv ? 0 : 1);
        fb.set(cbX + bx, cbY + 6, inv ? 0 : 1);
      }
      for (let by = 0; by < 7; by++) {
        fb.set(cbX, cbY + by, inv ? 0 : 1);
        fb.set(cbX + 6, cbY + by, inv ? 0 : 1);
      }
      // Check mark (filled center)
      if (item.checked) {
        fb.fillRect(cbX + 2, cbY + 2, 3, 3, inv ? 0 : 1);
      }

      // Text
      font.drawText(fb, item.text, ox + 22, rowY + 2, { intensity });

      // Row divider
      if (!inv) {
        for (let x = ox; x < ox + W; x++) fb.set(x, rowY + TODO_ROW_H - 1, 0.3);
      }
    });

    engine.markDirty();
  }, [engine, offsetX, offsetY, items, selected, scrollY, visibleCount, maxScroll]);

  return <StatusBar title="To Do" />;
}

// --- Memo Pad Screen ---

interface MemoItem {
  title: string;
  body: string;
}

const MEMOS: MemoItem[] = [
  { title: "Meeting notes", body: "Discussed Q2 roadmap.\nAction items:\n- Update specs\n- Schedule review\n- Send summary" },
  { title: "Shopping list", body: "Milk\nEggs\nBread\nButter\nCoffee\nFruit" },
  { title: "Project ideas", body: "1. LCD emulator\n2. Retro PDA app\n3. Pixel font editor\n4. Palm theme pack" },
  { title: "Books to read", body: "- Code (Petzold)\n- SICP\n- Design Patterns\n- Mythical Man-Month" },
  { title: "Passwords (encrypted)", body: "[ENCRYPTED]\n\nUse HotSync to\ndecrypt on desktop." },
];

const MEMO_ROW_H = 12;

function MemoPadScreen({ onHome }: { onHome: () => void }) {
  const [selected, setSelected] = useState(0);
  const [viewing, setViewing] = useState(false);
  const [memoScroll, setMemoScroll] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  const onCancel = useCallback(() => {
    if (viewing) { setViewing(false); setMemoScroll(0); }
    else onHome();
  }, [viewing, onHome]);

  useCancel(onCancel);

  const onUp = useCallback(() => {
    if (viewing) {
      setMemoScroll(s => Math.max(0, s - 1));
      return true;
    }
    setSelected(s => Math.max(0, s - 1));
    return true;
  }, [viewing]);

  const onDown = useCallback(() => {
    if (viewing) {
      const lines = MEMOS[selected].body.split("\n");
      setMemoScroll(s => Math.min(lines.length - 1, s + 1));
      return true;
    }
    setSelected(s => Math.min(MEMOS.length - 1, s + 1));
    return true;
  }, [viewing, selected]);

  const onActivate = useCallback(() => {
    if (viewing) { setViewing(false); setMemoScroll(0); }
    else setViewing(true);
    return true;
  }, [viewing]);

  useFocus({
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp, onDown, onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    if (viewing) {
      const memo = MEMOS[selected];
      let cy = CONTENT_Y + oy + 2;

      // Title (bold: draw offset)
      font.drawText(fb, memo.title, ox + 4, cy, { intensity: 1 });
      font.drawText(fb, memo.title, ox + 5, cy, { intensity: 1 });
      const titleW = font.measureText(memo.title) + 1;
      for (let x = ox + 4; x < ox + 4 + titleW; x++) fb.set(x, cy + 8, 1);
      cy += 14;

      // Thin divider
      for (let x = ox; x < ox + W; x++) fb.set(x, cy, 0.4);
      cy += 4;

      // Body lines (scrollable)
      const lines = memo.body.split("\n");
      const visibleLines = lines.slice(memoScroll);
      for (const line of visibleLines) {
        if (cy > CONTENT_Y + oy + CONTENT_H - 8) break;
        font.drawText(fb, line, ox + 4, cy, { intensity: 1 });
        cy += 10;
      }
    } else {
      MEMOS.forEach((memo, i) => {
        const rowY = CONTENT_Y + oy + i * MEMO_ROW_H;

        if (i === selected) {
          fb.fillRect(ox, rowY, W, MEMO_ROW_H, 1);
        }

        const intensity = i === selected ? 0 : 1;
        font.drawText(fb, `${i + 1}. ${memo.title}`, ox + 4, rowY + 2, { intensity });

        if (i !== selected) {
          for (let x = ox; x < ox + W; x++) fb.set(x, rowY + MEMO_ROW_H - 1, 0.3);
        }
      });
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected, viewing, memoScroll]);

  return <StatusBar title="Memo Pad" />;
}

// --- Calculator Screen ---

const CALC_BUTTONS: string[][] = [
  ["C", "\u00b1", "%", "\u00f7"],
  ["7", "8", "9", "\u00d7"],
  ["4", "5", "6", "-"],
  ["1", "2", "3", "+"],
  ["0", "", ".", "="],
];

const CALC_COLS = 4;
const CALC_ROWS = 5;
const CALC_BTN_W = Math.floor(W / CALC_COLS);
const CALC_DISPLAY_H = 24;
const CALC_DIVIDER_Y = CONTENT_Y + CALC_DISPLAY_H;
const CALC_GRID_Y = CALC_DIVIDER_Y + 1;
const CALC_BTN_H = Math.floor((CONTENT_H - CALC_DISPLAY_H - 1) / CALC_ROWS);

function CalcScreen({ onHome }: { onHome: () => void }) {
  const [display, setDisplay] = useState("0");
  const [operand, setOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [resetNext, setResetNext] = useState(false);
  const [selRow, setSelRow] = useState(0);
  const [selCol, setSelCol] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  const onCancel = useCallback(() => {
    if (display !== "0" || operand !== null || operator !== null) {
      setDisplay("0"); setOperand(null); setOperator(null); setResetNext(false);
    } else {
      onHome();
    }
  }, [display, operand, operator, onHome]);

  useCancel(onCancel);

  const pressButton = useCallback((label: string) => {
    if (label === "") return;
    if (label === "C") {
      setDisplay("0"); setOperand(null); setOperator(null); setResetNext(false); return;
    }
    if (label === "\u00b1") {
      setDisplay(d => String(-parseFloat(d))); return;
    }
    if (label === "%") {
      setDisplay(d => String(parseFloat(d) / 100)); return;
    }
    if (label === "\u00f7" || label === "\u00d7" || label === "-" || label === "+") {
      const opMap: Record<string, string> = { "\u00f7": "/", "\u00d7": "*", "-": "-", "+": "+" };
      setOperand(parseFloat(display));
      setOperator(opMap[label]);
      setResetNext(true);
      return;
    }
    if (label === "=") {
      if (operator !== null && operand !== null) {
        const cur = parseFloat(display);
        let result: number;
        if (operator === "/") result = operand / cur;
        else if (operator === "*") result = operand * cur;
        else if (operator === "-") result = operand - cur;
        else result = operand + cur;
        setDisplay(String(parseFloat(result.toPrecision(10))));
        setOperand(null); setOperator(null); setResetNext(true);
      }
      return;
    }
    if (label === ".") {
      setDisplay(d => {
        const base = resetNext ? "0" : d;
        if (base.includes(".")) return base;
        setResetNext(false);
        return base + ".";
      });
      return;
    }
    // digit
    setDisplay(d => {
      if (resetNext) { setResetNext(false); return label; }
      if (d === "0") return label;
      return d + label;
    });
  }, [display, operand, operator, resetNext]);

  const onUp = useCallback(() => { setSelRow(r => Math.max(0, r - 1)); return true; }, []);
  const onDown = useCallback(() => { setSelRow(r => Math.min(CALC_ROWS - 1, r + 1)); return true; }, []);
  const onLeft = useCallback(() => {
    setSelCol(c => {
      let next = Math.max(0, c - 1);
      if (selRow === 4 && next === 1) next = 0;
      return next;
    });
    return true;
  }, [selRow]);
  const onRight = useCallback(() => {
    setSelCol(c => {
      let next = Math.min(CALC_COLS - 1, c + 1);
      if (selRow === 4 && next === 1) next = 2;
      return next;
    });
    return true;
  }, [selRow]);
  const onActivate = useCallback(() => {
    const label = CALC_BUTTONS[selRow][selCol];
    if (selRow === 4 && selCol === 1) return true;
    pressButton(label);
    return true;
  }, [selRow, selCol, pressButton]);

  useFocus({
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp, onDown, onLeft, onRight, onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    // Display area
    const displayText = display.length > 10 ? display.slice(0, 10) : display;
    const textW = font.measureText(displayText, 2);
    const textX = ox + W - textW - 4;
    const textY = CONTENT_Y + oy + Math.floor((CALC_DISPLAY_H - 14) / 2);
    font.drawText(fb, displayText, textX, textY, { scale: 2, intensity: 1 });

    // Operator indicator
    if (operator) {
      const opDisplay: Record<string, string> = { "/": "\u00f7", "*": "\u00d7", "-": "-", "+": "+" };
      font.drawText(fb, opDisplay[operator] || operator, ox + 4, textY, { intensity: 0.6 });
    }

    // Divider below display
    for (let x = ox; x < ox + W; x++) fb.set(x, CALC_DIVIDER_Y + oy, 1);

    // Button grid
    for (let row = 0; row < CALC_ROWS; row++) {
      for (let col = 0; col < CALC_COLS; col++) {
        const label = CALC_BUTTONS[row][col];
        if (row === 4 && col === 1) continue;

        const btnW = (row === 4 && col === 0) ? CALC_BTN_W * 2 : CALC_BTN_W;
        const bx = ox + col * CALC_BTN_W;
        const by = oy + CALC_GRID_Y + row * CALC_BTN_H;

        const isSel = row === selRow && (
          col === selCol || (row === 4 && col === 0 && selCol <= 1)
        );

        // Thin button borders
        for (let i = 0; i < btnW; i++) {
          fb.set(bx + i, by, 0.4);
          fb.set(bx + i, by + CALC_BTN_H - 1, 0.4);
        }
        for (let i = 0; i < CALC_BTN_H; i++) {
          fb.set(bx, by + i, 0.4);
          fb.set(bx + btnW - 1, by + i, 0.4);
        }

        if (isSel) {
          fb.fillRect(bx + 1, by + 1, btnW - 2, CALC_BTN_H - 2, 1);
        }

        if (label) {
          const lw = font.measureText(label);
          const lx = bx + Math.floor((btnW - lw) / 2);
          const ly = by + Math.floor((CALC_BTN_H - 7) / 2);
          font.drawText(fb, label, lx, ly, { intensity: isSel ? 0 : 1 });
        }
      }
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, display, operator, selRow, selCol]);

  return <StatusBar title="Calculator" />;
}

// --- Prefs Screen ---

function PrefsScreen({ onHome, theme, onThemeChange, camera, onCameraChange, pixelSize, onPixelSizeChange, perspective, onPerspectiveChange }: {
  onHome: () => void;
  theme: string;
  onThemeChange: (t: string) => void;
  camera: string;
  onCameraChange: (c: string) => void;
  pixelSize: number;
  onPixelSizeChange: (s: number) => void;
  perspective: boolean;
  onPerspectiveChange: (v: boolean) => void;
}) {
  const [selectedRow, setSelectedRow] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  useCancel(onHome);

  const ROW_COUNT = 4;
  const ROW_SPACING = 14;
  const FIRST_ROW_Y = CONTENT_Y + 6;

  const getLabel = (row: number) => ["Theme", "Camera", "Pixels", "Persp."][row];
  const getValue = (row: number): string => {
    if (row === 0) return theme;
    if (row === 1) return camera;
    if (row === 2) return String(pixelSize);
    return perspective ? "ON" : "OFF";
  };

  const cycleLeft = useCallback((row: number) => {
    if (row === 0) {
      const idx = THEMES.indexOf(theme);
      onThemeChange(THEMES[(idx - 1 + THEMES.length) % THEMES.length]);
    } else if (row === 1) {
      const idx = CAMERAS.indexOf(camera);
      onCameraChange(CAMERAS[(idx - 1 + CAMERAS.length) % CAMERAS.length]);
    } else if (row === 2) {
      const idx = PIXEL_SIZES.indexOf(pixelSize);
      onPixelSizeChange(PIXEL_SIZES[Math.max(0, idx - 1)]);
    } else {
      onPerspectiveChange(!perspective);
    }
  }, [theme, camera, pixelSize, perspective, onThemeChange, onCameraChange, onPixelSizeChange, onPerspectiveChange]);

  const cycleRight = useCallback((row: number) => {
    if (row === 0) {
      const idx = THEMES.indexOf(theme);
      onThemeChange(THEMES[(idx + 1) % THEMES.length]);
    } else if (row === 1) {
      const idx = CAMERAS.indexOf(camera);
      onCameraChange(CAMERAS[(idx + 1) % CAMERAS.length]);
    } else if (row === 2) {
      const idx = PIXEL_SIZES.indexOf(pixelSize);
      onPixelSizeChange(PIXEL_SIZES[Math.min(PIXEL_SIZES.length - 1, idx + 1)]);
    } else {
      onPerspectiveChange(!perspective);
    }
  }, [theme, camera, pixelSize, perspective, onThemeChange, onCameraChange, onPixelSizeChange, onPerspectiveChange]);

  const onUp = useCallback(() => { setSelectedRow(r => Math.max(0, r - 1)); return true; }, []);
  const onDown = useCallback(() => { setSelectedRow(r => Math.min(ROW_COUNT - 1, r + 1)); return true; }, []);
  const onLeft = useCallback(() => { cycleLeft(selectedRow); return true; }, [selectedRow, cycleLeft]);
  const onRight = useCallback(() => { cycleRight(selectedRow); return true; }, [selectedRow, cycleRight]);

  useFocus({
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp, onDown, onLeft, onRight,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    for (let row = 0; row < ROW_COUNT; row++) {
      const rowY = FIRST_ROW_Y + row * ROW_SPACING + oy;
      const label = getLabel(row);
      const value = `< ${getValue(row)} >`;
      const valueW = font.measureText(value);
      const isSel = row === selectedRow;

      // Selected row: inverted bar
      if (isSel) {
        fb.fillRect(ox, rowY - 2, W, ROW_SPACING, 1);
      }

      font.drawText(fb, label, ox + 6, rowY, { intensity: isSel ? 0 : 1 });
      font.drawText(fb, value, ox + W - valueW - 6, rowY, { intensity: isSel ? 0 : 0.6 });

      // Divider between rows
      if (!isSel && row < ROW_COUNT - 1) {
        const divY = rowY + ROW_SPACING - 3;
        for (let x = ox; x < ox + W; x++) fb.set(x, divY, 0.2);
      }
    }

    // Hint at bottom
    const noticeY = FIRST_ROW_Y + ROW_COUNT * ROW_SPACING + 6 + oy;
    for (let x = ox; x < ox + W; x++) fb.set(x, noticeY - 3, 0.3);
    const hint = "Changes apply live";
    const hintW = font.measureText(hint);
    font.drawText(fb, hint, ox + Math.floor((W - hintW) / 2), noticeY, { intensity: 0.5 });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selectedRow, theme, camera, pixelSize, perspective]);

  return <StatusBar title="Preferences" />;
}

// --- Main Palm Mode ---

export function PalmMode({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<Screen>("home");
  const [pixelSize, setPixelSize] = useState(4);
  const [camera, setCamera] = useState("straight");
  const [perspective, setPerspective] = useState(false);
  const [theme, setTheme] = useState<string>("palm");

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
      <LCDScreen width={W} height={H} pixelSize={pixelSize} theme={theme as ThemePresetName} camera={camera} perspective={perspective}>
        <ScreenClear screen={screen} />

        {screen === "home" && <HomeScreen onNavigate={setScreen} onExit={onExit} />}
        {screen === "datebook" && <DateBookScreen onHome={goHome} />}
        {screen === "address" && <AddressScreen onHome={goHome} />}
        {screen === "todo" && <TodoScreen onHome={goHome} />}
        {screen === "memo" && <MemoPadScreen onHome={goHome} />}
        {screen === "calc" && <CalcScreen onHome={goHome} />}
        {screen === "prefs" && <PrefsScreen onHome={goHome} theme={theme} onThemeChange={setTheme} camera={camera} onCameraChange={setCamera} pixelSize={pixelSize} onPixelSizeChange={setPixelSize} perspective={perspective} onPerspectiveChange={setPerspective} />}
      </LCDScreen>
    </div>
  );
}

// Helper: clear entire framebuffer when screen changes
function ScreenClear({ screen }: { screen: string }) {
  const { engine, offsetX, offsetY } = useLCD();
  useEffect(() => {
    engine.fb.fillRect(offsetX, offsetY, W, H, 0);
    engine.markDirty();
  }, [engine, offsetX, offsetY, screen]);
  return null;
}
